const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /estoque  (filtros opcionais: ?material_id=1&posicao_id=2)
router.get('/', async (req, res) => {
  const { material_id, posicao_id } = req.query;

  let sql = `
    SELECT e.id, m.id AS material_id, m.sku, m.nome AS material, e.quantidade, e.lote, e.validade,
           p.id AS posicao_id, p.codigo AS posicao, z.nome AS zona, a.nome AS armazem
    FROM estoque e
    JOIN materiais m ON e.material_id = m.id
    JOIN posicoes p ON e.posicao_id = p.id
    JOIN zonas z ON p.zona_id = z.id
    JOIN armazens a ON z.armazem_id = a.id
    WHERE e.quantidade > 0`;
  const params = [];

  if (material_id) { sql += ' AND e.material_id = ?'; params.push(material_id); }
  if (posicao_id) { sql += ' AND e.posicao_id = ?'; params.push(posicao_id); }
  sql += ' ORDER BY m.nome';

  try {
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao consultar estoque' });
  }
});

module.exports = router;