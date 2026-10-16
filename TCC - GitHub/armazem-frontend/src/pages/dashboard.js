import { api } from '../api';
import { dh, esc, tabela, diasParaVencer } from '../util';

export default async function dashboard(el) {
  const [resumo, posicoes, movs, estoque] = await Promise.all([
    api('/dashboard/resumo'),
    api('/dashboard/posicoes'),
    api('/movimentacoes'),
    api('/estoque'),
  ]);

  const percentual = (ocupado, capacidade) =>
    Number(capacidade) ? Math.round((Number(ocupado) / Number(capacidade)) * 100) : 0;
  const cor = (p) => (p >= 100 ? 'cheia' : p >= 70 ? 'quase' : 'livre');

  // barras de ocupação por zona
  const zonas = resumo.ocupacao_por_zona.map((z) => {
    const p = percentual(z.ocupado, z.capacidade);
    return `<div class="barra">
      <span>${esc(z.armazem)} › ${esc(z.zona)}</span>
      <div><i style="width:${Math.min(p, 100)}%"></i></div>
      <em>${p}%</em>
    </div>`;
  }).join('');

  // mapa: um quadrado por posição, colorido pela ocupação
  const mapa = posicoes.map((p) => {
    const pc = percentual(p.ocupado, p.capacidade_max);
    return `<div class="pos ${cor(pc)}" title="${esc(p.armazem)} › ${esc(p.zona)}">
      <b>${esc(p.codigo)}</b><small>${Number(p.ocupado)} / ${p.capacidade_max}</small>
    </div>`;
  }).join('');

  // alerta: posições com 90% ou mais da capacidade
  const alertasPosicao = posicoes
    .filter((p) => percentual(p.ocupado, p.capacidade_max) >= 90)
    .map((p) => `<div class="aviso erro">Posição ${esc(p.codigo)} (${esc(p.zona)}) está com ${percentual(p.ocupado, p.capacidade_max)}% da capacidade.</div>`)
    .join('');

  // alerta: lotes vencidos ou que vencem em até 30 dias (os mais urgentes primeiro)
  const venc = estoque
    .map((e) => ({ ...e, dias: diasParaVencer(e.validade) }))
    .filter((e) => e.dias !== null && e.dias <= 30)
    .sort((a, b) => a.dias - b.dias);

  const alertasValidade = venc.slice(0, 5).map((e) => {
    const lote = e.lote ? ` (lote ${esc(e.lote)})` : '';
    const onde = `${esc(e.material)}${lote} em ${esc(e.posicao)} — ${e.quantidade} un.`;
    if (e.dias < 0) return `<div class="aviso erro"><b>Vencido:</b> ${onde} Venceu há ${-e.dias} dia(s).</div>`;
    return `<div class="aviso alerta"><b>${e.dias === 0 ? 'Vence hoje' : `Vence em ${e.dias} dia(s)`}:</b> ${onde}</div>`;
  }).join('') + (venc.length > 5 ? `<p class="vazio">… e mais ${venc.length - 5} em <a href="#/estoque">Estoque</a>.</p>` : '');

  el.innerHTML = `
    <div class="topo"><h1>Dashboard</h1></div>
    ${alertasValidade}
    ${alertasPosicao}
    <div class="cards">
      <div class="card"><span>Materiais cadastrados</span><b>${resumo.total_materiais}</b></div>
      <div class="card"><span>Movimentações hoje</span><b>${resumo.movimentacoes_hoje}</b></div>
      <div class="card"><span>Ocupação geral</span><b>${resumo.ocupacao_percentual}%</b></div>
      <div class="card"><span>Lotes com validade em alerta</span><b>${venc.length}</b></div>
    </div>

    <h2>Ocupação por zona</h2>
    ${zonas || '<p class="vazio">Nenhuma zona cadastrada.</p>'}

    <h2>Mapa de posições</h2>
    <p class="legenda"><span class="livre">Livre</span><span class="quase">Quase cheia (70%+)</span><span class="cheia">Cheia</span></p>
    <div class="mapa">${mapa || '<p class="vazio">Nenhuma posição cadastrada.</p>'}</div>

    <h2>Últimas movimentações</h2>
    ${tabela([
      ['criado_em', 'Data', (r) => dh(r.criado_em)],
      ['tipo', 'Tipo', (r) => `<span class="tag ${r.tipo}">${r.tipo}</span>`],
      ['material', 'Material'],
      ['quantidade', 'Qtd'],
      ['usuario', 'Usuário'],
    ], movs.slice(0, 5))}`;
}