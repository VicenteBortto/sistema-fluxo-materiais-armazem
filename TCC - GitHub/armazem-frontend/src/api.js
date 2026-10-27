// Endereço do backend. Se mudar a PORT no .env do backend, mude aqui também.
const BASE = BASE = location.port === '8080';

// Guarda o token e os dados do usuário no navegador (localStorage)
export const sessao = {
  get token() { return localStorage.getItem('token'); },
  get usuario() { return JSON.parse(localStorage.getItem('usuario') || 'null'); },
  salvar(token, usuario) {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
  },
  limpar() { localStorage.clear(); },
};

// Função usada em TODA chamada ao backend. Já manda o token junto.
// Exemplo: await api('/estoque')  ou  await api('/materiais', 'POST', { sku: '...', nome: '...' })
export async function api(caminho, metodo = 'GET', corpo) {
  const res = await fetch(BASE + caminho, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(sessao.token ? { Authorization: 'Bearer ' + sessao.token } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });

  const dados = await res.json().catch(() => ({}));

  // Token vencido ou inválido: volta pro login
  if (res.status === 401 && caminho !== '/auth/login') {
    sessao.limpar();
    location.hash = '#/login';
  }
  // Qualquer erro do backend vira uma mensagem que as telas mostram
  if (!res.ok) throw new Error(dados.erro || 'Erro na requisição');
  return dados;
}
