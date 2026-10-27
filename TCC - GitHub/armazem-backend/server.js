require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { autenticar } = require('./middleware/auth');
const authRoutes = require('./routes/auth.routes');
const cadastrosRoutes = require('./routes/cadastros.routes');
const estoqueRoutes = require('./routes/estoque.routes');
const movimentacoesRoutes = require('./routes/movimentacoes.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const usuariosRoutes = require('./routes/usuarios.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Entrega o site compilado (pasta dist, gerada por "npm run build")
app.use(express.static(path.join(__dirname, '..', 'armazem-frontend', 'dist')));

// Rotas públicas
app.use('/auth', authRoutes);

// A partir daqui, tudo exige login
app.use(autenticar);
app.use(cadastrosRoutes);
app.use('/estoque', estoqueRoutes);
app.use('/movimentacoes', movimentacoesRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/usuarios', usuariosRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
