import { api, sessao } from '../api';
import { $, aviso, esc, tabela, ligarBusca } from '../util';

const PERFIS = ['admin', 'operador', 'visualizador'];

// Campos de "escolher" que apontam pra outra tabela: de onde vêm as opções e o texto de cada uma
const LISTAS = {
  categorias: { url: '/categorias', texto: (r) => r.nome },
  armazens: { url: '/armazens', texto: (r) => r.nome },
  zonas: { url: '/zonas', texto: (r) => `${r.armazem} › ${r.nome}` },
};

// Configuração de cada cadastro.
// colunas: [campo, título] mostradas na tabela.
// campos: o que aparece no formulário (lista = escolher de outra tabela, opcoes = lista fixa).
const CADASTROS = {
  materiais: {
    titulo: 'Materiais',
    colunas: [['sku', 'SKU'], ['nome', 'Nome'], ['categoria', 'Categoria'], ['unidade_medida', 'Unidade'], ['peso', 'Peso (kg)']],
    campos: [
      { nome: 'sku', rotulo: 'SKU', obrigatorio: true },
      { nome: 'nome', rotulo: 'Nome', obrigatorio: true },
      { nome: 'categoria_id', rotulo: 'Categoria', lista: 'categorias' },
      { nome: 'unidade_medida', rotulo: 'Unidade', opcoes: ['un', 'kg', 'cx', 'm', 'l', 'pc'] },
      { nome: 'peso', rotulo: 'Peso (kg)', tipo: 'number' },
    ],
  },
  categorias: {
    titulo: 'Categorias',
    colunas: [['nome', 'Nome']],
    campos: [{ nome: 'nome', rotulo: 'Nome', obrigatorio: true }],
  },
  fornecedores: {
    titulo: 'Fornecedores',
    colunas: [['nome', 'Nome'], ['cnpj', 'CNPJ'], ['contato', 'Contato']],
    campos: [
      { nome: 'nome', rotulo: 'Nome', obrigatorio: true },
      { nome: 'cnpj', rotulo: 'CNPJ' },
      { nome: 'contato', rotulo: 'Contato' },
    ],
  },
  armazens: {
    titulo: 'Armazéns',
    colunas: [['nome', 'Nome'], ['endereco', 'Endereço']],
    campos: [
      { nome: 'nome', rotulo: 'Nome', obrigatorio: true },
      { nome: 'endereco', rotulo: 'Endereço' },
    ],
  },
  zonas: {
    titulo: 'Zonas',
    colunas: [['armazem', 'Armazém'], ['nome', 'Nome'], ['tipo', 'Tipo']],
    campos: [
      { nome: 'armazem_id', rotulo: 'Armazém', lista: 'armazens', obrigatorio: true },
      { nome: 'nome', rotulo: 'Nome', obrigatorio: true },
      { nome: 'tipo', rotulo: 'Tipo', opcoes: ['recebimento', 'estoque', 'expedicao'] },
    ],
  },
  posicoes: {
    titulo: 'Posições',
    colunas: [['armazem', 'Armazém'], ['zona', 'Zona'], ['codigo', 'Código'], ['capacidade_max', 'Capacidade']],
    campos: [
      { nome: 'zona_id', rotulo: 'Zona', lista: 'zonas', obrigatorio: true },
      { nome: 'codigo', rotulo: 'Código (ex: A1-P01)', obrigatorio: true },
      { nome: 'capacidade_max', rotulo: 'Capacidade máxima', tipo: 'number', obrigatorio: true },
    ],
  },
  usuarios: {
    titulo: 'Usuários',
    usuarios: true, // usuário não é excluído, só ativado/desativado
    colunas: [['nome', 'Nome'], ['email', 'Email'], ['perfil', 'Perfil'], ['ativo', 'Ativo', (r) => (r.ativo ? 'Sim' : 'Não')]],
    campos: [
      { nome: 'nome', rotulo: 'Nome', obrigatorio: true },
      { nome: 'email', rotulo: 'Email', obrigatorio: true },
      { nome: 'perfil', rotulo: 'Perfil', opcoes: PERFIS },
      { nome: 'senha', rotulo: 'Senha provisória (mínimo 6 caracteres)', tipo: 'senha', obrigatorio: 'novo' },
    ],
  },
};

export default async function cadastro(el, chave) {
  const cfg = CADASTROS[chave];
  const admin = sessao.usuario.perfil === 'admin'; // só admin vê os botões de alterar
  const rota = '/' + chave;
  let linhas = [];

  // ---- lista os registros ----
  async function listar() {
    linhas = await api(rota);
    const acoes = admin
      ? (r, i) => `<button data-editar="${i}">Editar</button>
                   <button data-excluir="${i}" class="perigo">${cfg.usuarios ? (r.ativo ? 'Desativar' : 'Ativar') : 'Excluir'}</button>`
      : null;
    el.innerHTML = `
      <div class="topo"><h1>${cfg.titulo}</h1>${admin ? '<button class="btn" id="novo">+ Novo</button>' : ''}</div>
      <div id="msg"></div>
      <input class="busca" id="busca" placeholder="Buscar…">
      ${tabela(cfg.colunas, linhas, acoes)}`;
    ligarBusca(el);
  }

  // ---- janela de cadastro/edição ----
  async function formulario(linha) {
    const campos = await Promise.all(cfg.campos.map(async (c) => {
      const valor = linha ? linha[c.nome] ?? '' : '';
      const req = c.obrigatorio === true || (c.obrigatorio === 'novo' && !linha) ? 'required' : '';
      let input;

      if (c.opcoes) {
        input = `<select name="${c.nome}">${c.opcoes.map((o) => `<option ${o === valor ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
      } else if (c.lista) {
        const { url, texto } = LISTAS[c.lista];
        const itens = await api(url);
        input = `<select name="${c.nome}" ${req}><option value="">Selecione…</option>${
          itens.map((i) => `<option value="${i.id}" ${String(i.id) === String(valor) ? 'selected' : ''}>${esc(texto(i))}</option>`).join('')}</select>`;
      } else {
        const tipo = c.tipo === 'number' ? 'type="number" min="0" step="any"'
          : c.tipo === 'senha' ? 'type="password" autocomplete="new-password"' : '';
        const dica = c.tipo === 'senha' && linha ? 'placeholder="deixe vazio para manter a atual"' : '';
        input = `<input name="${c.nome}" value="${esc(valor)}" ${tipo} ${dica} ${req}>`;
      }
      return `<label>${c.rotulo}${input}</label>`;
    }));

    const janela = document.createElement('div');
    janela.className = 'modal';
    janela.innerHTML = `
      <form class="caixa">
        <h2>${linha ? 'Editar' : 'Novo'} — ${cfg.titulo}</h2>
        ${campos.join('')}
        <div id="erro"></div>
        <div class="rodape">
          <button type="button" id="cancelar">Cancelar</button>
          <button class="btn">Salvar</button>
        </div>
      </form>`;
    document.body.append(janela);

    $('#cancelar', janela).onclick = () => janela.remove();
    $('form', janela).onsubmit = async (e) => {
      e.preventDefault();
      const corpo = Object.fromEntries(new FormData(e.target));
      // no cadastro novo, campos vazios nem são enviados (o banco usa o valor padrão)
      if (!linha) Object.keys(corpo).forEach((k) => { if (corpo[k] === '') delete corpo[k]; });
      try {
        await api(linha ? `${rota}/${linha.id}` : rota, linha ? 'PUT' : 'POST', corpo);
        janela.remove();
        await listar();
      } catch (err) {
        aviso($('#erro', janela), err.message);
      }
    };
  }

  // ---- cliques nos botões (novo, editar, excluir/desativar) ----
  el.onclick = async (e) => {
    const b = e.target;
    try {
      if (b.id === 'novo') {
        await formulario();
      } else if (b.dataset.editar !== undefined) {
        await formulario(linhas[b.dataset.editar]);
      } else if (b.dataset.excluir !== undefined) {
        const r = linhas[b.dataset.excluir];
        if (cfg.usuarios) await api(`${rota}/${r.id}/ativo`, 'PATCH', { ativo: !r.ativo });
        else if (confirm('Excluir este registro?')) await api(`${rota}/${r.id}`, 'DELETE');
        else return;
        await listar();
      }
    } catch (err) {
      aviso($('#msg'), err.message); // ex: "Não é possível excluir: este registro está em uso"
    }
  };

  await listar();
}