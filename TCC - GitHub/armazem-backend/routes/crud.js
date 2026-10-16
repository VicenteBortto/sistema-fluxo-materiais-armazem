const express = require('express');
const db = require('../db');
const { permitir } = require('../middleware/auth');

// Cria as 5 rotas padrão (listar, buscar um, criar, editar, excluir) para uma tabela.
//
// Parâmetros:
//   tabela        nome da tabela no banco
//   campos        colunas que o usuário pode enviar (sem o id)
//   obrigatorios  campos que não podem faltar na criação
//   listarSql     (opcional) consulta personalizada da listagem, com JOINs
//   ordenarPor    (opcional) coluna usada na listagem padrão
//
// Segurança: nome da tabela e dos campos vêm do nosso código, nunca do usuário.
// Os VALORES enviados pelo usuário sempre vão como parâmetros (?), nunca colados no SQL.
function criarCrud({ tabela, campos, obrigatorios = [], listarSql, ordenarPor = 'id' }) {
  const router = express.Router();
  const sqlListar = listarSql || `SELECT * FROM ${tabela} ORDER BY ${ordenarPor}`;

  // Traduz erros do MySQL em mensagens que o usuário entende
  function tratarErro(err, res, acao) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ erro: 'Já existe um registro com esse valor (campo único repetido)' });
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ erro: 'Referência inválida: o item relacionado não existe' });
    }
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ erro: 'Não é possível excluir: este registro está em uso' });
    }
    if (err.code === 'ER_BAD_NULL_ERROR') {
      return res.status(400).json({ erro: 'Algum campo obrigatório está vazio' });
    }
    console.error(err);
    res.status(500).json({ erro: `Erro ao ${acao}` });
  }

  // Listar (qualquer usuário logado)
  router.get('/', async (req, res) => {
    try {
      const [rows] = await db.query(sqlListar);
      res.json(rows);
    } catch (err) {
      tratarErro(err, res, 'listar');
    }
  });

  // Buscar um (qualquer usuário logado)
  router.get('/:id', async (req, res) => {
    try {
      const [rows] = await db.query(`SELECT * FROM ${tabela} WHERE id = ?`, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ erro: 'Registro não encontrado' });
      res.json(rows[0]);
    } catch (err) {
      tratarErro(err, res, 'buscar');
    }
  });

  // Criar (só admin)
  router.post('/', permitir('admin'), async (req, res) => {
    const body = req.body || {};
    const faltando = obrigatorios.filter((c) => body[c] === undefined || body[c] === '');
    if (faltando.length > 0) {
      return res.status(400).json({ erro: `Campos obrigatórios: ${faltando.join(', ')}` });
    }

    // Só insere os campos enviados; os demais ficam com o valor padrão do banco
    const enviados = campos.filter((c) => body[c] !== undefined && body[c] !== '');
    try {
      const [result] = await db.query(
        `INSERT INTO ${tabela} (${enviados.join(', ')}) VALUES (${enviados.map(() => '?').join(', ')})`,
        enviados.map((c) => body[c])
      );
      res.status(201).json({ id: result.insertId });
    } catch (err) {
      tratarErro(err, res, 'criar');
    }
  });

  // Editar (só admin) - atualiza apenas os campos enviados
  router.put('/:id', permitir('admin'), async (req, res) => {
    const body = req.body || {};
    const enviados = campos.filter((c) => body[c] !== undefined);
    if (enviados.length === 0) {
      return res.status(400).json({ erro: 'Nenhum campo para atualizar' });
    }
    const valor = (c) => (body[c] === '' ? null : body[c]);
    try {
      const [result] = await db.query(
        `UPDATE ${tabela} SET ${enviados.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
        [...enviados.map(valor), req.params.id]
      );
      if (result.affectedRows === 0) return res.status(404).json({ erro: 'Registro não encontrado' });
      res.json({ mensagem: 'Atualizado com sucesso' });
    } catch (err) {
      tratarErro(err, res, 'atualizar');
    }
  });

  // Excluir (só admin)
  router.delete('/:id', permitir('admin'), async (req, res) => {
    try {
      const [result] = await db.query(`DELETE FROM ${tabela} WHERE id = ?`, [req.params.id]);
      if (result.affectedRows === 0) return res.status(404).json({ erro: 'Registro não encontrado' });
      res.json({ mensagem: 'Removido com sucesso' });
    } catch (err) {
      tratarErro(err, res, 'excluir');
    }
  });

  return router;
}

module.exports = criarCrud;