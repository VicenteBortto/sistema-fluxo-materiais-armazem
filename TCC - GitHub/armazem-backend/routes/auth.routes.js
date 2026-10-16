const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../db');

// POST /auth/login
router.post('/login', async (req, res) => {
const { email, senha } = req.body || {};

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Informe email e senha' });
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM usuarios WHERE email = ? AND ativo = TRUE',
      [email]
    );
    const usuario = rows[0];

    // Mesma mensagem pra "email não existe" e "senha errada" (por segurança)
    const senhaCorreta = usuario && (await bcrypt.compare(senha, usuario.senha_hash));
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao fazer login' });
  }
});

module.exports = router;