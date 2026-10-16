const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /dashboard/resumo - cards do dashboard + ocupação por zona
router.get('/resumo', async (req, res) => {
  try {
    const [[materiais]] = await db.query('SELECT COUNT(*) AS total FROM materiais');
    const [[hoje]] = await db.query(
      'SELECT COUNT(*) AS total FROM movimentacoes WHERE DATE(criado_em) = CURDATE()'
    );
    const [[capacidade]] = await db.query(
      'SELECT COALESCE(SUM(capacidade_max), 0) AS total FROM posicoes WHERE capacidade_max > 0'
    );
    const [[ocupado]] = await db.query(`
      SELECT COALESCE(SUM(e.quantidade), 0) AS total
      FROM estoque e
      JOIN posicoes p ON e.posicao_id = p.id
      WHERE p.capacidade_max > 0`);

    const [porZona] = await db.query(`
      SELECT z.id, z.nome AS zona, a.nome AS armazem,
        COALESCE((SELECT SUM(p.capacidade_max) FROM posicoes p WHERE p.zona_id = z.id), 0) AS capacidade,
        COALESCE((SELECT SUM(e.quantidade) FROM estoque e
                  JOIN posicoes p ON e.posicao_id = p.id
                  WHERE p.zona_id = z.id), 0) AS ocupado
      FROM zonas z
      JOIN armazens a ON z.armazem_id = a.id
      ORDER BY a.nome, z.nome`);

    const cap = Number(capacidade.total);
    const ocup = Number(ocupado.total);

    res.json({
      total_materiais: materiais.total,
      movimentacoes_hoje: hoje.total,
      capacidade_total: cap,
      ocupado_total: ocup,
      ocupacao_percentual: cap > 0 ? Math.round((ocup / cap) * 100) : 0,
      ocupacao_por_zona: porZona,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao montar o resumo' });
  }
});

// GET /dashboard/posicoes - ocupação de cada posição (base do mapa do armazém)
router.get('/posicoes', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.id, p.codigo, p.capacidade_max, z.nome AS zona, a.nome AS armazem,
             COALESCE(SUM(e.quantidade), 0) AS ocupado
      FROM posicoes p
      JOIN zonas z ON p.zona_id = z.id
      JOIN armazens a ON z.armazem_id = a.id
      LEFT JOIN estoque e ON e.posicao_id = p.id
      GROUP BY p.id, p.codigo, p.capacidade_max, z.nome, a.nome
      ORDER BY a.nome, z.nome, p.codigo`);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar ocupação das posições' });
  }
});

module.exports = router;