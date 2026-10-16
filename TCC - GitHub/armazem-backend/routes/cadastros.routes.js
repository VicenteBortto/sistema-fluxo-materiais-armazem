const express = require('express');
const criarCrud = require('./crud');

const router = express.Router();

router.use('/materiais', criarCrud({
  tabela: 'materiais',
  campos: ['sku', 'nome', 'categoria_id', 'unidade_medida', 'peso'],
  obrigatorios: ['sku', 'nome'],
  listarSql: `
    SELECT m.id, m.sku, m.nome, m.categoria_id, c.nome AS categoria, m.unidade_medida, m.peso
    FROM materiais m
    LEFT JOIN categorias c ON m.categoria_id = c.id
    ORDER BY m.nome`,
}));

router.use('/categorias', criarCrud({
  tabela: 'categorias',
  campos: ['nome'],
  obrigatorios: ['nome'],
  ordenarPor: 'nome',
}));

router.use('/fornecedores', criarCrud({
  tabela: 'fornecedores',
  campos: ['nome', 'cnpj', 'contato'],
  obrigatorios: ['nome'],
  ordenarPor: 'nome',
}));

router.use('/armazens', criarCrud({
  tabela: 'armazens',
  campos: ['nome', 'endereco'],
  obrigatorios: ['nome'],
  ordenarPor: 'nome',
}));

router.use('/zonas', criarCrud({
  tabela: 'zonas',
  campos: ['armazem_id', 'nome', 'tipo'],
  obrigatorios: ['armazem_id', 'nome'],
  listarSql: `
    SELECT z.id, z.armazem_id, a.nome AS armazem, z.nome, z.tipo
    FROM zonas z
    JOIN armazens a ON z.armazem_id = a.id
    ORDER BY a.nome, z.nome`,
}));

router.use('/posicoes', criarCrud({
  tabela: 'posicoes',
  campos: ['zona_id', 'codigo', 'capacidade_max'],
  obrigatorios: ['zona_id', 'codigo'],
  listarSql: `
    SELECT p.id, p.zona_id, z.nome AS zona, a.nome AS armazem, p.codigo, p.capacidade_max
    FROM posicoes p
    JOIN zonas z ON p.zona_id = z.id
    JOIN armazens a ON z.armazem_id = a.id
    ORDER BY a.nome, z.nome, p.codigo`,
}));

module.exports = router;