const jwt = require('jsonwebtoken');

// Confere se a pessoa mandou um token válido (se está logada)
function autenticar(req, res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Faça login para acessar' });
  }

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ erro: 'Sessão inválida ou expirada' });
  }
}

// Confere se o perfil da pessoa pode fazer aquela ação
// Uso: permitir('admin') ou permitir('admin', 'operador')
function permitir(...perfis) {
  return (req, res, next) => {
    if (!perfis.includes(req.usuario.perfil)) {
      return res.status(403).json({ erro: 'Você não tem permissão para isso' });
    }
    next();
  };
}

module.exports = { autenticar, permitir };