import { api } from '../api';
import { tabela, ligarBusca, diasParaVencer } from '../util';

// Mostra a data e, se estiver perto de vencer, uma etiqueta colorida
const validade = (r) => {
  if (!r.validade) return '—';
  const dias = diasParaVencer(r.validade);
  const data = new Date(r.validade).toLocaleDateString('pt-BR');
  if (dias < 0) return `${data} <span class="tag vencido">vencido</span>`;
  if (dias <= 30) return `${data} <span class="tag proximo">${dias === 0 ? 'vence hoje' : dias + ' dia(s)'}</span>`;
  return data;
};

export default async function estoque(el) {
  const linhas = await api('/estoque');
  el.innerHTML = `
    <div class="topo"><h1>Estoque atual</h1></div>
    <input class="busca" id="busca" placeholder="Buscar material, posição, zona…">
    ${tabela([
      ['sku', 'SKU'],
      ['material', 'Material'],
      ['quantidade', 'Qtd'],
      ['posicao', 'Posição'],
      ['zona', 'Zona'],
      ['armazem', 'Armazém'],
      ['lote', 'Lote'],
      ['validade', 'Validade', validade],
    ], linhas)}`;
  ligarBusca(el);
}