import { api } from '../api';
import { $, dh, esc, tabela } from '../util';

export default async function historico(el) {
  const linhas = await api('/movimentacoes');
  const colunas = [
    ['criado_em', 'Data', (r) => dh(r.criado_em)],
    ['tipo', 'Tipo', (r) => `<span class="tag ${r.tipo}">${r.tipo}</span>`],
    ['material', 'Material'],
    ['quantidade', 'Qtd'],
    ['origem', 'Origem', (r) => esc(r.origem || '—')],
    ['destino', 'Destino', (r) => esc(r.destino || '—')],
    ['usuario', 'Usuário'],
  ];

  el.innerHTML = `
    <div class="topo"><h1>Histórico de movimentações</h1></div>
    <div class="filtros">
      <select id="filtro-tipo">
        <option value="">Todos os tipos</option>
        <option value="entrada">Entrada</option>
        <option value="saida">Saída</option>
        <option value="transferencia">Transferência</option>
      </select>
      <input id="filtro-texto" placeholder="Buscar material ou usuário…">
    </div>
    <div id="lista"></div>`;

  function desenhar() {
    const tipo = $('#filtro-tipo').value;
    const texto = $('#filtro-texto').value.toLowerCase();
    const filtradas = linhas.filter((r) =>
      (!tipo || r.tipo === tipo) &&
      `${r.material} ${r.usuario} ${r.origem ?? ''} ${r.destino ?? ''}`.toLowerCase().includes(texto));
    $('#lista').innerHTML = tabela(colunas, filtradas);
  }

  $('#filtro-tipo').onchange = desenhar;
  $('#filtro-texto').oninput = desenhar;
  desenhar();
}