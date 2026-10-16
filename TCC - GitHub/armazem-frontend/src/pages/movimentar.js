import { api } from '../api';
import { $, aviso, esc } from '../util';

const NOMES = { entrada: 'Entrada', saida: 'Saída', transferencia: 'Transferência' };

export default async function movimentar(el, tipo = 'entrada') {
  // carrega as listas que os campos de escolha precisam
  const [materiais, posicoes, estoque] = await Promise.all([
    api('/materiais'), api('/posicoes'), api('/estoque'),
  ]);

  const select = (nome, opcoes) =>
    `<select name="${nome}" required><option value="">Selecione…</option>${opcoes}</select>`;

  const opMateriais = materiais.map((m) => `<option value="${m.id}">${esc(m.sku)} — ${esc(m.nome)}</option>`).join('');
  const opPosicoes = posicoes.map((p) => `<option value="${p.id}">${esc(p.armazem)} › ${esc(p.zona)} › ${esc(p.codigo)}</option>`).join('');
  const opEstoque = estoque.map((e, i) =>
    `<option value="${i}">${esc(e.material)} — ${esc(e.posicao)} (${e.quantidade} un${e.lote ? ', lote ' + esc(e.lote) : ''})</option>`).join('');

  el.innerHTML = `
    <div class="topo"><h1>Registrar movimentação</h1></div>
    <div class="abas">
      ${Object.keys(NOMES).map((t) => `<button data-tipo="${t}" class="${t === tipo ? 'ativa' : ''}">${NOMES[t]}</button>`).join('')}
    </div>
    <form class="form" id="form-mov">
      ${tipo === 'entrada'
        ? `<label>Material${select('material_id', opMateriais)}</label>`
        : `<label>Retirar de (estoque atual)${select('origem', opEstoque)}</label>`}
      ${tipo === 'saida' ? '' : `<label>Posição de destino${select('posicao_destino_id', opPosicoes)}</label>`}
      <label>Quantidade<input name="quantidade" type="number" min="1" step="1" required></label>
            ${tipo === 'entrada' ? '<label>Lote (opcional)<input name="lote"></label><label>Validade (opcional)<input name="validade" type="date"></label>' : ''}
      <div id="msg"></div>
      <button class="btn grande">Registrar ${NOMES[tipo].toLowerCase()}</button>
    </form>`;

  // troca de aba
  el.querySelector('.abas').onclick = (e) => {
    if (e.target.dataset.tipo) movimentar(el, e.target.dataset.tipo);
  };

  // envio do formulário
  $('#form-mov').onsubmit = async (ev) => {
    ev.preventDefault();
    const f = Object.fromEntries(new FormData(ev.target));
    const corpo = { tipo, quantidade: Number(f.quantidade) };

    if (tipo === 'entrada') {
            Object.assign(corpo, { material_id: f.material_id, posicao_destino_id: f.posicao_destino_id, lote: f.lote || '', validade: f.validade || null });
    } else {
      const item = estoque[f.origem]; // item do estoque escolhido
      Object.assign(corpo, { material_id: item.material_id, posicao_origem_id: item.posicao_id, lote: item.lote || '' });
      if (tipo === 'transferencia') corpo.posicao_destino_id = f.posicao_destino_id;
    }

    try {
      await api('/movimentacoes', 'POST', corpo);
      await movimentar(el, tipo); // recarrega a tela já com o estoque atualizado
      aviso($('#msg'), 'Movimentação registrada com sucesso!', true);
    } catch (err) {
      aviso($('#msg'), err.message); // ex: "Estoque insuficiente na posição de origem"
    }
  };
}