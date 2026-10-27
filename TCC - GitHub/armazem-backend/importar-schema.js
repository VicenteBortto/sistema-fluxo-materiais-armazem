require('dotenv').config();
const fs = require('fs');
const mysql = require('mysql2/promise');

// Uso: node importar-schema.js caminho\do\arquivo.sql
const arquivo = process.argv[2];

async function importar() {
  if (!arquivo) {
    console.log('Uso: node importar-schema.js caminho\\do\\arquivo.sql');
    process.exit(1);
  }
  // tira CREATE DATABASE e USE: o banco já existe e a conexão já aponta pra ele
  const sql = fs.readFileSync(arquivo, 'utf8')
    .split('\n')
    .filter((l) => !/^\s*(CREATE DATABASE|USE)\b/i.test(l))
    .join('\n');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    multipleStatements: true,
  });

  try {
    await conn.query(sql);
    const [tabelas] = await conn.query('SHOW TABLES');
    console.log(`Pronto! ${tabelas.length} tabelas criadas.`);
  } catch (e) {
    console.error('Erro:', e.message);
  }
  await conn.end();
}

importar();
