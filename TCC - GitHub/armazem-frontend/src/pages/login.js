import { api, sessao } from '../api';
import { $, aviso } from '../util';

export default function login(el) {
  el.innerHTML = `
    <div class="login">
      <form class="caixa" id="form-login">
        <h1>Armazém</h1>
        <p>Sistema de Monitoramento de Fluxo de Materiais</p>
        <label>Email<input name="email" type="email" required autofocus></label>
        <label>Senha<input name="senha" type="password" required></label>
        <div id="msg"></div>
        <button class="btn grande">Entrar</button>
      </form>
    </div>`;

  $('#form-login').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const dados = Object.fromEntries(new FormData(e.target));
      const r = await api('/auth/login', 'POST', dados);
      sessao.salvar(r.token, r.usuario);
      // admin sem nenhum armazém cadastrado = primeiro acesso: abre o assistente
      const armazens = await api('/armazens');
      location.hash = r.usuario.perfil === 'admin' && armazens.length === 0 ? '#/onboarding' : '#/dashboard';
    } catch (err) {
      aviso($('#msg'), err.message);
    }
  };
}