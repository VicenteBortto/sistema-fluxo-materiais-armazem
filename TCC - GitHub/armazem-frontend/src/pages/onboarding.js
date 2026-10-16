import { api } from '../api';
import { $, aviso, esc } from '../util';

const TIPOS = ['recebimento', 'estoque', 'expedicao'];
const PADRAO = [['Recebimento', 'recebimento'], ['Estoque', 'estoque'], ['Expedição', 'expedicao']];

export default function onboarding(el) {
  // guarda o que já foi criado durante o assistente
  const est = { passo: 1, armazem: null, zonas: [], posicoes: [] };

  const moldura = (titulo, texto, corpo) => {
    el.innerHTML = `<div class="login"><div class="caixa largo">
      <p class="passo">Passo ${est.passo} de 3</p>
      <h1>${titulo}</h1><p>${texto}</p>${corpo}
    </div></div>`;
  };

  // ---------- Passo 1: o armazém ----------
  function passo1() {
    moldura('Crie seu primeiro armazém', 'Vamos configurar a estrutura básica. Leva menos de um minuto.', `
      <form id="f">
        <label>Nome do armazém<input name="nome" required autofocus placeholder="Ex: Armazém Central"></label>
        <label>Endereço (opcional)<input name="endereco"></label>
        <div id="msg"></div>
        <button class="btn grande">Continuar</button>
      </form>`);

    $('#f').onsubmit = async (ev) => {
      ev.preventDefault();
      try {
        const corpo = Object.fromEntries(new FormData(ev.target));
        if (!corpo.endereco) delete corpo.endereco;
        const r = await api('/armazens', 'POST', corpo);
        est.armazem = { id: r.id, nome: corpo.nome };
        est.passo = 2;
        desenhar();
      } catch (err) { aviso($('#msg'), err.message); }
    };
  }

  // ---------- Passo 2: as zonas ----------
  function passo2() {
    moldura('Zonas do armazém', `Zonas são as áreas dentro de <b>${esc(est.armazem.nome)}</b>, como recebimento, estoque e expedição.`, `
      ${est.zonas.length ? '' : '<button class="btn" id="padrao" type="button">Adicionar as 3 zonas padrão</button>'}
      <form id="f" class="linha">
        <input name="nome" placeholder="Outra zona (ex: Câmara fria)" required>
        <select name="tipo">${TIPOS.map((t) => `<option>${t}</option>`).join('')}</select>
        <button class="btn">Adicionar</button>
      </form>
      <div id="msg"></div>
      <div class="chips">${est.zonas.map((z) => `<span>${esc(z.nome)}</span>`).join('')}</div>
      <div class="rodape"><button type="button" id="continuar" class="btn" ${est.zonas.length ? '' : 'disabled'}>Continuar</button></div>`);

    const adicionar = async (nome, tipo) => {
      const r = await api('/zonas', 'POST', { armazem_id: est.armazem.id, nome, tipo });
      est.zonas.push({ id: r.id, nome });
    };

    const padrao = $('#padrao');
    if (padrao) {
      padrao.onclick = async () => {
        try { for (const [nome, tipo] of PADRAO) await adicionar(nome, tipo); desenhar(); }
        catch (err) { aviso($('#msg'), err.message); }
      };
    }
    $('#f').onsubmit = async (ev) => {
      ev.preventDefault();
      const f = Object.fromEntries(new FormData(ev.target));
      try { await adicionar(f.nome, f.tipo); desenhar(); }
      catch (err) { aviso($('#msg'), err.message); }
    };
    $('#continuar').onclick = () => { est.passo = 3; desenhar(); };
  }

  // ---------- Passo 3: as posições ----------
  function passo3() {
    moldura('Posições (prateleiras)', 'Cada posição é um local físico onde o material fica guardado, com uma capacidade máxima. Você pode cadastrar mais depois, em Cadastros → Posições.', `
      <form id="f">
        <label>Zona<select name="zona_id" required>${est.zonas.map((z) => `<option value="${z.id}">${esc(z.nome)}</option>`).join('')}</select></label>
        <label>Código<input name="codigo" required placeholder="Ex: A1-P01"></label>
        <label>Capacidade máxima (unidades)<input name="capacidade_max" type="number" min="1" required value="500"></label>
        <div id="msg"></div>
        <button class="btn grande">Adicionar posição</button>
      </form>
      <div class="chips">${est.posicoes.map((p) => `<span>${esc(p)}</span>`).join('')}</div>
      <div class="rodape"><button type="button" id="concluir" class="btn">${est.posicoes.length ? 'Concluir' : 'Pular e concluir'}</button></div>`);

    $('#f').onsubmit = async (ev) => {
      ev.preventDefault();
      const f = Object.fromEntries(new FormData(ev.target));
      try {
        await api('/posicoes', 'POST', { zona_id: f.zona_id, codigo: f.codigo, capacidade_max: Number(f.capacidade_max) });
        est.posicoes.push(f.codigo);
        desenhar();
      } catch (err) { aviso($('#msg'), err.message); }
    };
    $('#concluir').onclick = () => { location.hash = '#/dashboard'; };
  }

  function desenhar() { [null, passo1, passo2, passo3][est.passo](); }
  desenhar();
}