require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const { autenticar } = require('./middleware/auth');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const cadastrosRoutes = require('./routes/cadastros.routes');
const estoqueRoutes = require('./routes/estoque.routes');
const movimentacoesRoutes = require('./routes/movimentacoes.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const usuariosRoutes = require('./routes/usuarios.routes');

const app = express();

// Estas duas linhas precisam vir ANTES de todas as rotas
app.use(cors());
app.use(express.json());

// Entrega o site compilado (pasta dist, gerada por "npm run build")
app.use(express.static(path.join(__dirname, '..', 'armazem-frontend', 'dist')));

// ---------- Rotas públicas ----------
app.use('/auth', authRoutes);

app.get('/teste-banco', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT COUNT(*) AS total FROM materiais');
    res.json({ conectado: true, materiais_cadastrados: rows[0].total });
  } catch (err) {
    res.status(500).json({ conectado: false, erro: err.message });
  }
});

// ---------- A partir daqui, tudo exige login ----------
app.use(autenticar);

app.use(cadastrosRoutes); // /materiais, /categorias, /fornecedores, /armazens, /zonas, /posicoes
app.use('/estoque', estoqueRoutes);
app.use('/movimentacoes', movimentacoesRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/usuarios', usuariosRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));