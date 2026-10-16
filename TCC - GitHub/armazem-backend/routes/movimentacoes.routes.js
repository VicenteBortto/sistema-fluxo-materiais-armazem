const express = require('express');
const router = express.Router();
const db = require('../db');
const { permitir } = require('../middleware/auth');

// POST /movimentacoes  (admin e operador)
// Body: { tipo, material_id, quantidade, posicao_origem_id, posicao_destino_id, lote, validade }
router.post('/', permitir('admin', 'operador'), async (req, res) => {
  const { tipo, material_id, posicao_origem_id, posicao_destino_id } = req.body;
  const quantidade = Number(req.body.quantidade);
  const lote = req.body.lote || '';
  let validade = req.body.validade || null; // formato AAAA-MM-DD, informada na entrada

  // ---- Validações básicas ----
  if (!['entrada', 'saida', 'transferencia'].includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo deve ser entrada, saida ou transferencia' });
  }
  if (!material_id || !Number.isInteger(quantidade) || quantidade <= 0) {
    return res.status(400).json({ erro: 'Informe o material e uma quantidade inteira maior que zero' });
  }
  if ((tipo === 'entrada' || tipo === 'transferencia') && !posicao_destino_id) {
    return res.status(400).json({ erro: 'Informe a posição de destino' });
  }
  if ((tipo === 'saida' || tipo === 'transferencia') && !posicao_origem_id) {
    return res.status(400).json({ erro: 'Informe a posição de origem' });
  }
  if (tipo === 'transferencia' && Number(posicao_origem_id) === Number(posicao_destino_id)) {
    return res.status(400).json({ erro: 'Origem e destino não podem ser a mesma posição' });
  }
  if (validade && !/^\d{4}-\d{2}-\d{2}$/.test(validade)) {
    return res.status(400).json({ erro: 'Validade deve estar no formato AAAA-MM-DD' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // ---- Tira do estoque de origem (saída e transferência) ----
    if (tipo === 'saida' || tipo === 'transferencia') {
      const [rows] = await conn.query(
        'SELECT id, quantidade, validade FROM estoque WHERE material_id = ? AND posicao_id = ? AND lote = ? FOR UPDATE',
        [material_id, posicao_origem_id, lote]
      );
      if (rows.length === 0 || rows[0].quantidade < quantidade) {
        await conn.rollback();
        return res.status(400).json({ erro: 'Estoque insuficiente na posição de origem' });
      }
      await conn.query('UPDATE estoque SET quantidade = quantidade - ? WHERE id = ?', [
        quantidade,
        rows[0].id,
      ]);
      // na transferência, a validade do lote acompanha o material para o destino
      if (tipo === 'transferencia') validade = rows[0].validade;
    }

    // ---- Coloca no estoque de destino (entrada e transferência) ----
    if (tipo === 'entrada' || tipo === 'transferencia') {
      const [posicoes] = await conn.query(
        'SELECT capacidade_max FROM posicoes WHERE id = ? FOR UPDATE',
        [posicao_destino_id]
      );
      if (posicoes.length === 0) {
        await conn.rollback();
        return res.status(404).json({ erro: 'Posição de destino não encontrada' });
      }

      const [[ocupacao]] = await conn.query(
        'SELECT COALESCE(SUM(quantidade), 0) AS total FROM estoque WHERE posicao_id = ?',
        [posicao_destino_id]
      );
      const capacidade = posicoes[0].capacidade_max;
      if (capacidade > 0 && Number(ocupacao.total) + quantidade > capacidade) {
        await conn.rollback();
        return res.status(400).json({
          erro: `Posição sem espaço: capacidade ${capacidade}, ocupado ${ocupacao.total}`,
        });
      }

      await conn.query(
        `INSERT INTO estoque (material_id, posicao_id, quantidade, lote, validade)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE quantidade = quantidade + VALUES(quantidade),
                                 validade = COALESCE(VALUES(validade), validade)`,
        [material_id, posicao_destino_id, quantidade, lote, validade]
      );
    }

    // ---- Registra no histórico (nunca editado, só inserido) ----
    const [result] = await conn.query(
      `INSERT INTO movimentacoes
        (material_id, quantidade, posicao_origem_id, posicao_destino_id, tipo, usuario_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        material_id,
        quantidade,
        tipo === 'entrada' ? null : posicao_origem_id,
        tipo === 'saida' ? null : posicao_destino_id,
        tipo,
        req.usuario.id,
      ]
    );

    await conn.commit();
    res.status(201).json({ id: result.insertId, mensagem: 'Movimentação registrada' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ erro: 'Material ou posição não existe' });
    }
    res.status(500).json({ erro: 'Erro ao registrar movimentação' });
  } finally {
    conn.release();
  }
});

// GET /movimentacoes  (histórico, qualquer perfil logado)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT mv.id, mv.tipo, mv.quantidade, mv.criado_em,
             m.nome AS material, u.nome AS usuario,
             po.codigo AS origem, pd.codigo AS destino
      FROM movimentacoes mv
      JOIN materiais m ON mv.material_id = m.id
      JOIN usuarios u ON mv.usuario_id = u.id
      LEFT JOIN posicoes po ON mv.posicao_origem_id = po.id
      LEFT JOIN posicoes pd ON mv.posicao_destino_id = pd.id
      ORDER BY mv.criado_em DESC
      LIMIT 200`);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar histórico' });
  }
});

module.exports = router;