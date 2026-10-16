// Protege contra HTML injetado: use sempre que mostrar texto vindo do banco
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Atalho para document.querySelector
export const $ = (seletor, raiz = document) => raiz.querySelector(seletor);

// Formata data e hora no padrão brasileiro
export const dh = (d) => (d ? new Date(d).toLocaleString('pt-BR') : '');

// Mostra uma mensagem de erro (vermelha) ou sucesso (verde) dentro de um elemento
export const aviso = (el, msg, ok) => {
  el.innerHTML = msg ? `<div class="aviso ${ok ? 'ok' : 'erro'}">${esc(msg)}</div>` : '';
};

// Monta uma tabela HTML.
// cols: lista de [campo, título, formatador opcional]. acao: função que devolve os botões da linha.
export const tabela = (cols, rows, acao) => `
  <div class="tabela"><table>
    <thead><tr>${cols.map((c) => `<th>${c[1]}</th>`).join('')}${acao ? '<th></th>' : ''}</tr></thead>
    <tbody>${
      rows.map((r, i) => `<tr>${cols.map((c) => `<td>${c[2] ? c[2](r) : esc(r[c[0]])}</td>`).join('')}${acao ? `<td class="acoes">${acao(r, i)}</td>` : ''}</tr>`).join('')
      || `<tr><td colspan="${cols.length + 1}" class="vazio">Nenhum registro ainda.</td></tr>`
    }</tbody>
  </table></div>`;

  // Liga o campo de busca (id="busca") a uma tabela: esconde as linhas que não combinam
export const ligarBusca = (el) => {
  const campo = $('#busca', el);
  if (!campo) return;
  campo.oninput = () => el.querySelectorAll('tbody tr').forEach((tr) => {
    tr.hidden = !tr.textContent.toLowerCase().includes(campo.value.toLowerCase());
  });
};

// Quantos dias faltam para vencer (negativo = já venceu). Sem validade = null.
export const diasParaVencer = (validade) => {
  if (!validade) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const v = new Date(validade); v.setHours(0, 0, 0, 0);
  return Math.round((v - hoje) / 86400000);
};