import './style.css';
import { sessao } from './api';
import { esc } from './util';
import login from './pages/login';
import dashboard from './pages/dashboard';
import estoque from './pages/estoque';
import historico from './pages/historico';
import movimentar from './pages/movimentar';
import cadastro from './pages/cadastros';
import onboarding from './pages/onboarding';

const TODOS = ['admin', 'operador', 'visualizador'];

// Menu completo. "perfis" diz quem enxerga cada item (igual ao prompt do Figma).
const MENU = [
  { rota: 'dashboard',  nome: 'Dashboard',   perfis: TODOS },
  { rota: 'estoque',    nome: 'Estoque',     perfis: TODOS },
  { rota: 'movimentar', nome: 'Movimentar',  perfis: ['admin', 'operador'] },
  { rota: 'historico',  nome: 'Histórico',   perfis: TODOS },
  { rota: 'materiais',  nome: 'Materiais',   perfis: TODOS, cad: true },
  { rota: 'categorias', nome: 'Categorias',  perfis: TODOS },
  { rota: 'fornecedores', nome: 'Fornecedores', perfis: TODOS },
  { rota: 'armazens',   nome: 'Armazéns',    perfis: TODOS },
  { rota: 'zonas',      nome: 'Zonas',       perfis: TODOS },
  { rota: 'posicoes',   nome: 'Posições',    perfis: TODOS },
  { rota: 'usuarios',   nome: 'Usuários',    perfis: ['admin'] },
];

// Telas prontas. A cada parte nova, a gente adiciona linhas aqui.
const paginas = {
  dashboard,
  estoque,
  historico,
  movimentar,
  materiais: (el) => cadastro(el, 'materiais'),
  categorias: (el) => cadastro(el, 'categorias'),
  fornecedores: (el) => cadastro(el, 'fornecedores'),
  armazens: (el) => cadastro(el, 'armazens'),
  zonas: (el) => cadastro(el, 'zonas'),
  posicoes: (el) => cadastro(el, 'posicoes'),
  usuarios: (el) => cadastro(el, 'usuarios'),
};

async function render() {
  const rota = location.hash.replace('#/', '') || 'dashboard';

  // Sem login: só a tela de login é permitida
  if (!sessao.token) {
    if (rota !== 'login') location.hash = '#/login';
    else login(document.getElementById('app'));
    return;
  }

  // Com login: mostra só o menu que o perfil pode ver
  const u = sessao.usuario;
    // Assistente de primeiro acesso: tela cheia (sem menu), só para admin
  if (rota === 'onboarding') {
    if (u.perfil !== 'admin') { location.hash = '#/dashboard'; return; }
    onboarding(document.getElementById('app'));
    return;
  }
  const itens = MENU.filter((m) => m.perfis.includes(u.perfil));
  const atual = itens.find((m) => m.rota === rota);
  if (!atual) { location.hash = '#/dashboard'; return; }

  document.getElementById('app').innerHTML = `
    <div class="layout">
      <aside>
        <div class="marca">Armazém</div>
        <nav>${itens.map((m) => `
          ${m.cad ? '<small>Cadastros</small>' : ''}
          <a href="#/${m.rota}" class="${m.rota === rota ? 'ativo' : ''}">${m.nome}</a>`).join('')}
        </nav>
        <div class="usuario">
          <span>${esc(u.nome)} · ${u.perfil}</span>
          <button id="sair">Sair</button>
        </div>
      </aside>
      <main id="conteudo"></main>
    </div>`;

  document.getElementById('sair').onclick = () => {
    sessao.limpar();
    location.hash = '#/login';
  };

  const el = document.getElementById('conteudo');
  const tela = paginas[rota];
  if (!tela) {
    el.innerHTML = `<h1>${atual.nome}</h1><p class="vazio">Tela em construção…</p>`;
    return;
  }
  el.innerHTML = '<p>Carregando…</p>';
  try {
    await tela(el);
  } catch (err) {
    el.innerHTML = `<div class="aviso erro">${esc(err.message)}</div>`;
  }
}

window.addEventListener('hashchange', render); // roda de novo quando o endereço (#/...) muda
render();