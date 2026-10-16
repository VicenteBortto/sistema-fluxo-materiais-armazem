const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');
const { permitir } = require('../middleware/auth');

const PERFIS = ['admin', 'operador', 'visualizador'];

// Todas as rotas deste arquivo são só para administrador
router.use(permitir('admin'));

// GET /usuarios - lista (nunca devolve a senha)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nome, email, perfil, ativo, criado_em FROM usuarios ORDER BY nome'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar usuários' });
  }
});

// POST /usuarios - cria usuário com senha provisória
router.post('/', async (req, res) => {
  const { nome, email, senha, perfil } = req.body || {};
  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Informe nome, email e senha' });
  }
  if (senha.length < 6) {
    return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres' });
  }
  if (!PERFIS.includes(perfil)) {
    return res.status(400).json({ erro: 'Perfil deve ser admin, operador ou visualizador' });
  }

  try {
    const hash = await bcrypt.hash(senha, 10);
    const [result] = await db.query(
      'INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)',
      [nome, email, hash, perfil]
    );
    res.status(201).json({ id: result.insertId, nome, email, perfil });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ erro: 'Já existe um usuário com esse email' });
    }
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar usuário' });
  }
});

// PUT /usuarios/:id - edita nome, email, perfil e/ou redefine a senha
router.put('/:id', async (req, res) => {
  const { nome, email, perfil, senha } = req.body || {};

  if (perfil && !PERFIS.includes(perfil)) {
    return res.status(400).json({ erro: 'Perfil inválido' });
  }
  if (Number(req.params.id) === req.usuario.id && perfil && perfil !== 'admin') {
    return res.status(400).json({ erro: 'Você não pode tirar seu próprio acesso de administrador' });
  }
  if (senha && senha.length < 6) {
    return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres' });
  }

  const sets = [];
  const valores = [];
  if (nome) { sets.push('nome = ?'); valores.push(nome); }
  if (email) { sets.push('email = ?'); valores.push(email); }
  if (perfil) { sets.push('perfil = ?'); valores.push(perfil); }
  if (senha) { sets.push('senha_hash = ?'); valores.push(await bcrypt.hash(senha, 10)); }

  if (sets.length === 0) {
    return res.status(400).json({ erro: 'Nenhum campo para atualizar' });
  }

  try {
    const [result] = await db.query(
      `UPDATE usuarios SET ${sets.join(', ')} WHERE id = ?`,
      [...valores, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json({ mensagem: 'Usuário atualizado' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ erro: 'Já existe um usuário com esse email' });
    }
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar usuário' });
  }
});

// PATCH /usuarios/:id/ativo - ativa ou desativa. Body: { "ativo": false }
router.patch('/:id/ativo', async (req, res) => {
  const ativo = req.body && req.body.ativo;
  if (typeof ativo !== 'boolean') {
    return res.status(400).json({ erro: 'Envie { "ativo": true } ou { "ativo": false }' });
  }
  if (Number(req.params.id) === req.usuario.id && !ativo) {
    return res.status(400).json({ erro: 'Você não pode desativar o próprio usuário' });
  }

  try {
    const [result] = await db.query('UPDATE usuarios SET ativo = ? WHERE id = ?', [ativo, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json({ mensagem: ativo ? 'Usuário ativado' : 'Usuário desativado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao alterar status do usuário' });
  }
});

module.exports = router;