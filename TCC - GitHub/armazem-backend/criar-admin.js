require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

// Uso: node criar-admin.js seu@email.com SuaSenhaForte
const [email, senha] = process.argv.slice(2);

async function criarAdmin() {
  if (!email || !senha || senha.length < 6) {
    console.log('Uso: node criar-admin.js email senha (mínimo 6 caracteres)');
    process.exit(1);
  }
  try {
    const hash = await bcrypt.hash(senha, 10);
    await db.query(
      'INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)',
      ['Administrador', email, hash, 'admin']
    );
    console.log(`Admin criado: ${email}`);
  } catch (err) {
    console.error('Erro ao criar admin:', err.message);
  }
  process.exit();
}

criarAdmin();