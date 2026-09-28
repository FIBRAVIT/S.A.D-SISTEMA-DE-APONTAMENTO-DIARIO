/* ============================================
   SISTEMA DE APONTAMENTO DIÁRIO
   app.js - Lógica Principal + Google Sheets API
   ============================================ */

// ============================================
// CONFIGURAÇÃO - ALTERE AQUI
// ============================================
const CONFIG = {
  // Cole aqui a URL do seu Google Apps Script (Web App)
  SCRIPT_URL: 'https://script.google.com/macros/s/SEU_SCRIPT_ID_AQUI/exec',
  APP_NAME: 'S.A.D',
  VERSION: '1.0.0'
};

// ============================================
// ESTADO GLOBAL
// ============================================
const STATE = {
  user: null,
  page: 'dashboard',
  data: {
    colaboradores: [],
    veiculos: [],
    sites: [],
    servicos: [],
    usuarios: [],
    apontamentos: []
  },
  filters: {},
  loading: false
};

// ============================================
// UTILITÁRIOS
// ============================================
const Utils = {
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
  },

  formatTime(time) {
    if (!time) return '--:--';
    return time;
  },

  formatHours(inicio, fim) {
    if (!inicio || !fim) return '--';
    const [h1, m1] = inicio.split(':').map(Number);
    const [h2, m2] = fim.split(':').map(Number);
    const totalMin = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (totalMin < 0) return '--';
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}h${m > 0 ? m + 'm' : ''}`;
  },

  getCurrentTime() {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  },

  getCurrentDate() {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  },

  getCurrentDateBR() {
    return new Date().toLocaleDateString('pt-BR');
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  showAlert(msg, type = 'danger', containerId = 'alert-box') {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.className = `alert alert-${type}`;
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
  },

  showLoading(msg = 'Carregando...') {
    let el = document.getElementById('loading-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'loading-overlay';
      el.className = 'loading-overlay';
      el.innerHTML = `<div class="spinner"></div><div class="loading-text">${msg}</div>`;
      document.body.appendChild(el);
    } else {
      el.querySelector('.loading-text').textContent = msg;
      el.style.display = 'flex';
    }
  },

  hideLoading() {
    const el = document.getElementById('loading-overlay');
    if (el) el.style.display = 'none';
  },

  openModal(id) {
    document.getElementById(id)?.classList.add('active');
  },

  closeModal(id) {
    document.getElementById(id)?.classList.remove('active');
  },

  sanitize(str) {
    if (!str) return '';
    return String(str).replace(/[<>"']/g, '');
  }
};

// ============================================
// API - GOOGLE SHEETS
// ============================================
const API = {
  async call(action, payload = {}) {
    try {
      const params = new URLSearchParams({ action, ...payload });
      const res = await fetch(`${CONFIG.SCRIPT_URL}?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Erro desconhecido');
      return json;
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  },

  async post(action, data) {
    try {
      const res = await fetch(CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Erro desconhecido');
      return json;
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  },

  // AUTH
  async login(usuario, senha) {
    return this.call('login', { usuario, senha });
  },

  // CARREGAR DADOS
  async getData(sheet) {
    return this.call('getData', { sheet });
  },

  // APONTAMENTOS
  async getApontamentos(filtros = {}) {
    return this.call('getApontamentos', filtros);
  },

  async salvarApontamento(dados) {
    return this.post('salvarApontamento', dados);
  },

  async concluirApontamento(id, horaFinal) {
    return this.post('concluirApontamento', { id, horaFinal });
  },

  async excluirApontamento(id) {
    return this.post('excluirApontamento', { id });
  },

  // CADASTROS
  async salvarCadastro(sheet, dados) {
    return this.post('salvarCadastro', { sheet, dados });
  },

  async excluirCadastro(sheet, id) {
    return this.post('excluirCadastro', { sheet, id });
  },

  // DASHBOARD
  async getDashboard() {
    return this.call('getDashboard');
  },

  // RELATÓRIOS
  async getRelatorio(tipo, filtros) {
    return this.call('getRelatorio', { tipo, ...filtros });
  }
};

// ============================================
// AUTH
// ============================================
const Auth = {
  STORAGE_KEY: 'apontamento_user',

  save(user) {
    STATE.user = user;
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
  },

  load() {
    const saved = sessionStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      STATE.user = JSON.parse(saved);
      return true;
    }
    return false;
  },

  logout() {
    STATE.user = null;
    sessionStorage.removeItem(this.STORAGE_KEY);
    window.location.href = 'index.html';
  },

  hasPermission(perm) {
    if (!STATE.user) return false;
    const perms = {
      admin: ['dashboard', 'apontamento', 'cadastros', 'relatorios'],
      coordenador: ['dashboard', 'apontamento', 'relatorios'],
      supervisor: ['apontamento']
    };
    return (perms[STATE.user.perfil] || []).includes(perm);
  },

  requireAuth() {
    if (!this.load()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }
};

// ============================================
// NAVEGAÇÃO
// ============================================
const Nav = {
  init() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        if (!Auth.hasPermission(page)) {
          Utils.showAlert('Você não tem permissão para acessar esta área.', 'danger', 'global-alert');
          return;
        }
        this.go(page);
      });
    });
  },

  go(page) {
    STATE.page = page;
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
    document.querySelectorAll('.page-section').forEach(s => s.style.display = 'none');
    const section = document.getElementById(`page-${page}`);
    if (section) section.style.display = 'block';
    Pages[page]?.init?.();
  }
};

// ============================================
// PÁGINAS
// ============================================
const Pages = {

  // ---- DASHBOARD ----
  dashboard: {
    charts: {},

    async init() {
      Utils.showLoading('Carregando dashboard...');
      try {
        const res = await API.getDashboard();
        this.render(res.data);
      } catch (e) {
        this.renderDemo();
      } finally {
        Utils.hideLoading();
      }
    },

    renderDemo() {
      // Dados demo para visualização sem API configurada
      const data = {
        totalHoje: 24,
        emAndamento: 7,
        concluidos: 17,
        colaboradoresAtivos: 18,
        veiculosEmUso: 6,
        horasTotaisHoje: 142,
        mediaHorasPorServico: 5.9,
        registrosAbertos: 7,
        porSite: [
          { nome: 'Site Alpha', horas: 48 },
          { nome: 'Site Beta', horas: 36 },
          { nome: 'Site Gamma', horas: 28 },
          { nome: 'Site Delta', horas: 20 },
          { nome: 'Site Epsilon', horas: 10 }
        ],
        porServico: [
          { nome: 'Manutenção', qtd: 8 },
          { nome: 'Instalação', qtd: 6 },
          { nome: 'Inspeção', qtd: 5 },
          { nome: 'Transporte', qtd: 3 },
          { nome: 'Outros', qtd: 2 }
        ],
        semana: {
          labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
          apontamentos: [18, 22, 20, 25, 24, 10, 4],
          horas: [108, 132, 120, 150, 142, 60, 24]
        },
        ultimosApontamentos: [
          { colaborador: 'João Silva', site: 'Site Alpha', servico: 'Manutenção', horaInicio: '07:00', horaFim: '', status: 'andamento' },
          { colaborador: 'Maria Santos', site: 'Site Beta', servico: 'Instalação', horaInicio: '07:30', horaFim: '16:00', status: 'concluido' },
          { colaborador: 'Carlos Lima', site: 'Site Gamma', servico: 'Inspeção', horaInicio: '08:00', horaFim: '14:30', status: 'concluido' }
        ]
      };
      this.render(data);
    },

    render(data) {
      // KPIs
      document.getElementById('kpi-total-hoje').textContent = data.totalHoje || 0;
      document.getElementById('kpi-andamento').textContent = data.emAndamento || 0;
      document.getElementById('kpi-concluidos').textContent = data.concluidos || 0;
      document.getElementById('kpi-colaboradores').textContent = data.colaboradoresAtivos || 0;
      document.getElementById('kpi-veiculos').textContent = data.veiculosEmUso || 0;
      document.getElementById('kpi-horas').textContent = (data.horasTotaisHoje || 0) + 'h';
      document.getElementById('kpi-media').textContent = (data.mediaHorasPorServico || 0) + 'h';
      document.getElementById('kpi-abertos').textContent = data.registrosAbertos || 0;

      // Gráfico - Apontamentos da semana
      this.renderChartSemana(data.semana);
      // Gráfico - Por site
      this.renderChartSites(data.porSite);
      // Gráfico - Por serviço
      this.renderChartServicos(data.porServico);
      // Tabela últimos
      this.renderUltimos(data.ultimosApontamentos);
    },

    renderChartSemana(semana) {
      const ctx = document.getElementById('chart-semana')?.getContext('2d');
      if (!ctx || !semana) return;
      if (this.charts.semana) this.charts.semana.destroy();
      this.charts.semana = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: semana.labels,
          datasets: [
            {
              label: 'Apontamentos',
              data: semana.apontamentos,
              backgroundColor: 'rgba(26,86,219,0.8)',
              borderRadius: 6,
              yAxisID: 'y'
            },
            {
              label: 'Horas Totais',
              data: semana.horas,
              type: 'line',
              borderColor: '#0e9f6e',
              backgroundColor: 'rgba(14,159,110,0.1)',
              borderWidth: 2,
              pointRadius: 4,
              fill: true,
              tension: 0.4,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
          scales: {
            y: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { font: { size: 11 } } },
            y1: { beginAtZero: true, position: 'right', grid: { display: false }, ticks: { font: { size: 11 } } }
          }
        }
      });
    },

    renderChartSites(sites) {
      const ctx = document.getElementById('chart-sites')?.getContext('2d');
      if (!ctx || !sites) return;
      if (this.charts.sites) this.charts.sites.destroy();
      this.charts.sites = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: sites.map(s => s.nome),
          datasets: [{
            data: sites.map(s => s.horas),
            backgroundColor: ['#1a56db','#0e9f6e','#ff8800','#e02424','#7c3aed','#0891b2'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } }
          },
          cutout: '65%'
        }
      });
    },

    renderChartServicos(servicos) {
      const ctx = document.getElementById('chart-servicos')?.getContext('2d');
      if (!ctx || !servicos) return;
      if (this.charts.servicos) this.charts.servicos.destroy();
      this.charts.servicos = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: servicos.map(s => s.nome),
          datasets: [{
            label: 'Qtd. Apontamentos',
            data: servicos.map(s => s.qtd),
            backgroundColor: ['#1a56db','#0e9f6e','#ff8800','#e02424','#7c3aed'],
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { font: { size: 11 } } },
            y: { ticks: { font: { size: 11 } } }
          }
        }
      });
    },

    renderUltimos(lista) {
      const tbody = document.getElementById('tbody-ultimos');
      if (!tbody) return;
      if (!lista || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:30px">Nenhum apontamento hoje</td></tr>';
        return;
      }
      tbody.innerHTML = lista.map(a => `
        <tr>
          <td><strong>${Utils.sanitize(a.colaborador)}</strong></td>
          <td>${Utils.sanitize(a.site)}</td>
          <td>${Utils.sanitize(a.servico)}</td>
          <td>${Utils.formatTime(a.horaInicio)}</td>
          <td>${Utils.formatTime(a.horaFim)}</td>
          <td><span class="status-dot ${a.status}">${a.status === 'concluido' ? 'Concluído' : 'Em andamento'}</span></td>
        </tr>
      `).join('');
    }
  },

  // ---- APONTAMENTO ----
  apontamento: {
    lista: [],

    async init() {
      await this.loadSelects();
      await this.loadLista();
      this.bindEvents();
    },

    async loadSelects() {
      try {
        const [col, vei, sit, ser] = await Promise.all([
          API.getData('colaboradores'),
          API.getData('veiculos'),
          API.getData('sites'),
          API.getData('servicos')
        ]);
        STATE.data.colaboradores = col.data || [];
        STATE.data.veiculos = vei.data || [];
        STATE.data.sites = sit.data || [];
        STATE.data.servicos = ser.data || [];
      } catch (e) {
        // Usa dados demo
        STATE.data.colaboradores = [
          { id: '1', nome: 'João Silva' }, { id: '2', nome: 'Maria Santos' },
          { id: '3', nome: 'Carlos Lima' }, { id: '4', nome: 'Ana Costa' }
        ];
        STATE.data.veiculos = [
          { id: '1', placa: 'ABC-1234', modelo: 'Fiat Strada' },
          { id: '2', placa: 'DEF-5678', modelo: 'VW Saveiro' }
        ];
        STATE.data.sites = [
          { id: '1', nome: 'Site Alpha', codigo: 'CC001' },
          { id: '2', nome: 'Site Beta', codigo: 'CC002' },
          { id: '3', nome: 'Site Gamma', codigo: 'CC003' }
        ];
        STATE.data.servicos = [
          { id: '1', nome: 'Manutenção' }, { id: '2', nome: 'Instalação' },
          { id: '3', nome: 'Inspeção' }, { id: '4', nome: 'Transporte' }
        ];
      }
      this.populateSelects();
    },

    populateSelects() {
      const selColaborador = document.getElementById('sel-colaborador');
      const selVeiculo = document.getElementById('sel-veiculo');
      const selSite = document.getElementById('sel-site');
      const selServico = document.getElementById('sel-servico');

      if (selColaborador) {
        selColaborador.innerHTML = '<option value="">Selecione...</option>' +
          STATE.data.colaboradores.map(c => `<option value="${c.id}">${Utils.sanitize(c.nome)}</option>`).join('');
      }
      if (selVeiculo) {
        selVeiculo.innerHTML = '<option value="">Nenhum</option>' +
          STATE.data.veiculos.map(v => `<option value="${v.id}">${Utils.sanitize(v.placa)} - ${Utils.sanitize(v.modelo)}</option>`).join('');
      }
      if (selSite) {
        selSite.innerHTML = '<option value="">Selecione...</option>' +
          STATE.data.sites.map(s => `<option value="${s.id}">${Utils.sanitize(s.nome)} (${Utils.sanitize(s.codigo)})</option>`).join('');
      }
      if (selServico) {
        selServico.innerHTML = '<option value="">Selecione...</option>' +
          STATE.data.servicos.map(s => `<option value="${s.id}">${Utils.sanitize(s.nome)}</option>`).join('');
      }

      // Hora inicial = hora atual
      const horaInicio = document.getElementById('hora-inicio');
      if (horaInicio) horaInicio.value = Utils.getCurrentTime();
    },

    async loadLista() {
      const date = document.getElementById('filtro-data-apt')?.value || Utils.getCurrentDate();
      Utils.showLoading('Carregando apontamentos...');
      try {
        const res = await API.getApontamentos({ data: date });
        this.lista = res.data || [];
      } catch (e) {
        this.lista = [
          { id: 'demo1', colaborador: 'João Silva', veiculo: 'ABC-1234', site: 'Site Alpha', servico: 'Manutenção', horaInicio: '07:00', horaFim: '', status: 'andamento', data: Utils.getCurrentDate() },
          { id: 'demo2', colaborador: 'Maria Santos', veiculo: '', site: 'Site Beta', servico: 'Instalação', horaInicio: '07:30', horaFim: '16:00', status: 'concluido', data: Utils.getCurrentDate() }
        ];
      } finally {
        Utils.hideLoading();
        this.renderLista();
      }
    },

    renderLista() {
      const container = document.getElementById('lista-apontamentos');
      if (!container) return;

      if (this.lista.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <h3>Nenhum apontamento encontrado</h3>
            <p>Clique em "Novo Apontamento" para registrar</p>
          </div>`;
        return;
      }

      container.innerHTML = this.lista.map(a => `
        <div class="apontamento-card ${a.status}">
          <div class="apontamento-header">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:20px">${a.status === 'concluido' ? '✅' : '🟡'}</span>
              <div>
                <div style="font-weight:700;font-size:14px">${Utils.sanitize(a.colaborador)}</div>
                <div style="font-size:11px;color:#6b7280">${Utils.formatDate(a.data)}</div>
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <span class="status-dot ${a.status}">${a.status === 'concluido' ? 'Concluído' : 'Em andamento'}</span>
              ${a.status === 'andamento' ? `<button class="btn btn-success btn-sm" onclick="Pages.apontamento.abrirConclusao('${a.id}')">⏱️ Concluir</button>` : ''}
              ${Auth.hasPermission('cadastros') ? `<button class="btn btn-danger btn-sm" onclick="Pages.apontamento.excluir('${a.id}')">🗑️</button>` : ''}
            </div>
          </div>
          <div class="apontamento-info">
            <div class="apontamento-info-item">🏗️ <strong>${Utils.sanitize(a.site)}</strong></div>
            <div class="apontamento-info-item">🔧 <strong>${Utils.sanitize(a.servico)}</strong></div>
            ${a.veiculo ? `<div class="apontamento-info-item">🚗 <strong>${Utils.sanitize(a.veiculo)}</strong></div>` : ''}
            <div class="apontamento-info-item">🕐 Início: <strong>${Utils.formatTime(a.horaInicio)}</strong></div>
            <div class="apontamento-info-item">🕔 Fim: <strong>${Utils.formatTime(a.horaFim) || '--:--'}</strong></div>
            ${a.horaFim ? `<div class="apontamento-info-item">⏱️ Total: <strong>${Utils.formatHours(a.horaInicio, a.horaFim)}</strong></div>` : ''}
          </div>
          ${a.observacao ? `<div style="margin-top:10px;font-size:12px;color:#6b7280;background:#f9fafb;padding:8px 12px;border-radius:6px">💬 ${Utils.sanitize(a.observacao)}</div>` : ''}
        </div>
      `).join('');
    },

    bindEvents() {
      document.getElementById('btn-novo-apontamento')?.addEventListener('click', () => {
        document.getElementById('form-apontamento').reset();
        document.getElementById('hora-inicio').value = Utils.getCurrentTime();
        Utils.openModal('modal-apontamento');
      });

      document.getElementById('form-apontamento')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.salvar();
      });

      document.getElementById('filtro-data-apt')?.addEventListener('change', () => this.loadLista());
    },

    async salvar() {
      const dados = {
        colaboradorId: document.getElementById('sel-colaborador').value,
        veiculoId: document.getElementById('sel-veiculo').value,
        siteId: document.getElementById('sel-site').value,
        servicoId: document.getElementById('sel-servico').value,
        horaInicio: document.getElementById('hora-inicio').value,
        observacao: document.getElementById('obs-apontamento').value,
        data: Utils.getCurrentDate(),
        usuarioId: STATE.user?.id
      };

      if (!dados.colaboradorId || !dados.siteId || !dados.servicoId || !dados.horaInicio) {
        Utils.showAlert('Preencha todos os campos obrigatórios.', 'danger', 'alert-apontamento');
        return;
      }

      Utils.showLoading('Salvando apontamento...');
      try {
        await API.salvarApontamento(dados);
        Utils.closeModal('modal-apontamento');
        Utils.showAlert('Apontamento registrado com sucesso!', 'success', 'alert-global');
        await this.loadLista();
      } catch (e) {
        Utils.showAlert('Erro ao salvar. Tente novamente.', 'danger', 'alert-apontamento');
      } finally {
        Utils.hideLoading();
      }
    },

    abrirConclusao(id) {
      document.getElementById('conclusao-id').value = id;
      document.getElementById('hora-fim').value = Utils.getCurrentTime();
      Utils.openModal('modal-conclusao');
    },

    async concluir() {
      const id = document.getElementById('conclusao-id').value;
      const horaFinal = document.getElementById('hora-fim').value;
      if (!horaFinal) {
        Utils.showAlert('Informe a hora final.', 'danger', 'alert-conclusao');
        return;
      }
      Utils.showLoading('Concluindo apontamento...');
      try {
        await API.concluirApontamento(id, horaFinal);
        Utils.closeModal('modal-conclusao');
        Utils.showAlert('Apontamento concluído!', 'success', 'alert-global');
        await this.loadLista();
      } catch (e) {
        Utils.showAlert('Erro ao concluir. Tente novamente.', 'danger', 'alert-conclusao');
      } finally {
        Utils.hideLoading();
      }
    },

    async excluir(id) {
      if (!confirm('Deseja excluir este apontamento?')) return;
      Utils.showLoading('Excluindo...');
      try {
        await API.excluirApontamento(id);
        await this.loadLista();
      } catch (e) {
        alert('Erro ao excluir.');
      } finally {
        Utils.hideLoading();
      }
    }
  },

  // ---- CADASTROS ----
  cadastros: {
    activeTab: 'colaboradores',

    init() {
      this.loadTab(this.activeTab);
      document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeTab = btn.dataset.tab;
          this.loadTab(this.activeTab);
        });
      });
    },

    async loadTab(tab) {
      Utils.showLoading('Carregando...');
      try {
        const res = await API.getData(tab);
        STATE.data[tab] = res.data || [];
      } catch (e) {
        STATE.data[tab] = this.getDemoData(tab);
      } finally {
        Utils.hideLoading();
        this.renderTab(tab);
      }
    },

    getDemoData(tab) {
      const demos = {
        colaboradores: [
          { id: '1', nome: 'João Silva', cargo: 'Técnico', matricula: 'T001', status: 'ativo' },
          { id: '2', nome: 'Maria Santos', cargo: 'Supervisora', matricula: 'S001', status: 'ativo' }
        ],
        veiculos: [
          { id: '1', placa: 'ABC-1234', modelo: 'Fiat Strada', tipo: 'Pickup', status: 'ativo' },
          { id: '2', placa: 'DEF-5678', modelo: 'VW Saveiro', tipo: 'Pickup', status: 'ativo' }
        ],
        sites: [
          { id: '1', nome: 'Site Alpha', codigo: 'CC001', cidade: 'São Paulo', status: 'ativo' },
          { id: '2', nome: 'Site Beta', codigo: 'CC002', cidade: 'Campinas', status: 'ativo' }
        ],
        servicos: [
          { id: '1', nome: 'Manutenção', categoria: 'Técnico', status: 'ativo' },
          { id: '2', nome: 'Instalação', categoria: 'Técnico', status: 'ativo' }
        ],
        usuarios: [
          { id: '1', nome: 'Admin', usuario: 'admin', perfil: 'admin', status: 'ativo' }
        ]
      };
      return demos[tab] || [];
    },

    renderTab(tab) {
      const configs = {
        colaboradores: {
          cols: ['Matrícula', 'Nome', 'Cargo', 'Status'],
          fields: ['matricula', 'nome', 'cargo', 'status']
        },
        veiculos: {
          cols: ['Placa', 'Modelo', 'Tipo', 'Status'],
          fields: ['placa', 'modelo', 'tipo', 'status']
        },
        sites: {
          cols: ['Código', 'Nome', 'Cidade', 'Status'],
          fields: ['codigo', 'nome', 'cidade', 'status']
        },
        servicos: {
          cols: ['Nome', 'Categoria', 'Status'],
          fields: ['nome', 'categoria', 'status']
        },
        usuarios: {
          cols: ['Nome', 'Usuário', 'Perfil', 'Status'],
          fields: ['nome', 'usuario', 'perfil', 'status']
        }
      };

      const cfg = configs[tab];
      const data = STATE.data[tab] || [];
      const container = document.getElementById(`table-${tab}`);
      if (!container) return;

      if (data.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📂</div><h3>Nenhum registro</h3><p>Clique em "Novo" para adicionar</p></div>`;
        return;
      }

      container.innerHTML = `
        <div class="table-wrapper">
          <table>
            <thead><tr>
              ${cfg.cols.map(c => `<th>${c}</th>`).join('')}
              <th>Ações</th>
            </tr></thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${cfg.fields.map(f => `<td>${f === 'status' ? `<span class="badge ${row[f] === 'ativo' ? 'badge-success' : 'badge-gray'}">${row[f]}</span>` : Utils.sanitize(row[f] || '-')}</td>`).join('')}
                  <td>
                    <button class="btn btn-secondary btn-sm" onclick="Pages.cadastros.editar('${tab}','${row.id}')">✏️ Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="Pages.cadastros.excluir('${tab}','${row.id}')">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    },

    abrirNovo(tab) {
      const forms = {
        colaboradores: `
          <div class="form-grid">
            <div class="form-group"><label>Matrícula *</label><input id="cad-matricula" placeholder="T001"></div>
            <div class="form-group"><label>Nome Completo *</label><input id="cad-nome" placeholder="Nome do colaborador"></div>
            <div class="form-group"><label>Cargo</label><input id="cad-cargo" placeholder="Técnico, Supervisor..."></div>
            <div class="form-group"><label>Status</label><select id="cad-status"><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></div>
          </div>`,
        veiculos: `
          <div class="form-grid">
            <div class="form-group"><label>Placa *</label><input id="cad-placa" placeholder="ABC-1234"></div>
            <div class="form-group"><label>Modelo *</label><input id="cad-modelo" placeholder="Fiat Strada"></div>
            <div class="form-group"><label>Tipo</label><input id="cad-tipo" placeholder="Pickup, Van, Caminhão..."></div>
            <div class="form-group"><label>Status</label><select id="cad-status"><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></div>
          </div>`,
        sites: `
          <div class="form-grid">
            <div class="form-group"><label>Código CC *</label><input id="cad-codigo" placeholder="CC001"></div>
            <div class="form-group"><label>Nome do Site *</label><input id="cad-nome" placeholder="Site Alpha"></div>
            <div class="form-group"><label>Cidade</label><input id="cad-cidade" placeholder="São Paulo"></div>
            <div class="form-group"><label>Status</label><select id="cad-status"><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></div>
          </div>`,
        servicos: `
          <div class="form-grid">
            <div class="form-group"><label>Nome do Serviço *</label><input id="cad-nome" placeholder="Manutenção"></div>
            <div class="form-group"><label>Categoria</label><input id="cad-categoria" placeholder="Técnico, Operacional..."></div>
            <div class="form-group full"><label>Status</label><select id="cad-status"><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></div>
          </div>`,
        usuarios: `
          <div class="form-grid">
            <div class="form-group"><label>Nome Completo *</label><input id="cad-nome" placeholder="Nome do usuário"></div>
            <div class="form-group"><label>Login *</label><input id="cad-usuario" placeholder="usuario.login"></div>
            <div class="form-group"><label>Senha *</label><input id="cad-senha" type="password" placeholder="Senha de acesso"></div>
            <div class="form-group"><label>Perfil *</label><select id="cad-perfil"><option value="admin">👑 Admin</option><option value="coordenador">👔 Coordenador</option><option value="supervisor">👷 Supervisor</option></select></div>
            <div class="form-group"><label>Status</label><select id="cad-status"><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></div>
          </div>`
      };

      document.getElementById('modal-cad-title').textContent = `Novo ${tab.slice(0,-1)}`;
      document.getElementById('modal-cad-body').innerHTML = `
        <div id="alert-cad" class="alert alert-danger"></div>
        ${forms[tab] || ''}`;
      document.getElementById('modal-cad-tab').value = tab;
      document.getElementById('modal-cad-id').value = '';
      Utils.openModal('modal-cadastro');
    },

    async salvarCadastro() {
      const tab = document.getElementById('modal-cad-tab').value;
      const id = document.getElementById('modal-cad-id').value;
      const dados = { id };

      document.querySelectorAll('#modal-cad-body input, #modal-cad-body select').forEach(el => {
        const key = el.id.replace('cad-', '');
        dados[key] = el.value;
      });

      Utils.showLoading('Salvando...');
      try {
        await API.salvarCadastro(tab, dados);
        Utils.closeModal('modal-cadastro');
        await this.loadTab(tab);
      } catch (e) {
        Utils.showAlert('Erro ao salvar.', 'danger', 'alert-cad');
      } finally {
        Utils.hideLoading();
      }
    },

    editar(tab, id) {
      const item = STATE.data[tab]?.find(i => i.id === id);
      if (!item) return;
      this.abrirNovo(tab);
      setTimeout(() => {
        document.getElementById('modal-cad-id').value = id;
        document.getElementById('modal-cad-title').textContent = `Editar ${tab.slice(0,-1)}`;
        Object.entries(item).forEach(([k, v]) => {
          const el = document.getElementById(`cad-${k}`);
          if (el) el.value = v;
        });
      }, 100);
    },

    async excluir(tab, id) {
      if (!confirm('Deseja excluir este registro?')) return;
      Utils.showLoading('Excluindo...');
      try {
        await API.excluirCadastro(tab, id);
        await this.loadTab(tab);
      } catch (e) {
        alert('Erro ao excluir.');
      } finally {
        Utils.hideLoading();
      }
    }
  },

  // ---- RELATÓRIOS ----
  relatorios: {
    async init() {
      document.getElementById('rel-data-inicio').value = Utils.getCurrentDate();
      document.getElementById('rel-data-fim').value = Utils.getCurrentDate();
      await this.loadFiltros();
    },

    async loadFiltros() {
      try {
        const [col, vei, sit, ser] = await Promise.all([
          API.getData('colaboradores'), API.getData('veiculos'),
          API.getData('sites'), API.getData('servicos')
        ]);
        this.populateFiltro('rel-colaborador', col.data, 'nome');
        this.populateFiltro('rel-veiculo', vei.data, 'placa');
        this.populateFiltro('rel-site', sit.data, 'nome');
        this.populateFiltro('rel-servico', ser.data, 'nome');
      } catch (e) {}
    },

    populateFiltro(id, data, field) {
      const el = document.getElementById(id);
      if (!el || !data) return;
      el.innerHTML = '<option value="">Todos</option>' +
        data.map(d => `<option value="${d.id}">${Utils.sanitize(d[field])}</option>`).join('');
    },

    async gerar() {
      const filtros = {
        dataInicio: document.getElementById('rel-data-inicio').value,
        dataFim: document.getElementById('rel-data-fim').value,
        colaboradorId: document.getElementById('rel-colaborador').value,
        veiculoId: document.getElementById('rel-veiculo').value,
        siteId: document.getElementById('rel-site').value,
        servicoId: document.getElementById('rel-servico').value,
        status: document.getElementById('rel-status').value
      };

      Utils.showLoading('Gerando relatório...');
      try {
        const res = await API.getRelatorio('geral', filtros);
        this.renderRelatorio(res.data || []);
      } catch (e) {
        this.renderRelatorio(this.getDemoRelatorio());
      } finally {
        Utils.hideLoading();
      }
    },

    getDemoRelatorio() {
      return [
        { data: '2026-09-28', colaborador: 'João Silva', veiculo: 'ABC-1234', site: 'Site Alpha', servico: 'Manutenção', horaInicio: '07:00', horaFim: '16:00', totalHoras: '9h', status: 'concluido' },
        { data: '2026-09-28', colaborador: 'Maria Santos', veiculo: '', site: 'Site Beta', servico: 'Instalação', horaInicio: '07:30', horaFim: '', totalHoras: '--', status: 'andamento' }
      ];
    },

    renderRelatorio(data) {
      const container = document.getElementById('resultado-relatorio');
      if (!container) return;

      if (data.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><h3>Nenhum resultado</h3><p>Ajuste os filtros e tente novamente</p></div>`;
        return;
      }

      const totalHoras = data.filter(d => d.totalHoras && d.totalHoras !== '--').length;
      const concluidos = data.filter(d => d.status === 'concluido').length;

      container.innerHTML = `
        <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
          <div class="kpi-card" style="flex:1;min-width:140px">
            <div class="kpi-icon blue">📋</div>
            <div class="kpi-info"><div class="kpi-value">${data.length}</div><div class="kpi-label">Total de registros</div></div>
          </div>
          <div class="kpi-card" style="flex:1;min-width:140px">
            <div class="kpi-icon green">✅</div>
            <div class="kpi-info"><div class="kpi-value">${concluidos}</div><div class="kpi-label">Concluídos</div></div>
          </div>
          <div class="kpi-card" style="flex:1;min-width:140px">
            <div class="kpi-icon orange">🟡</div>
            <div class="kpi-info"><div class="kpi-value">${data.length - concluidos}</div><div class="kpi-label">Em andamento</div></div>
          </div>
        </div>
        <div class="table-wrapper">
          <table>
            <thead><tr>
              <th>Data</th><th>Colaborador</th><th>Veículo</th><th>Site/CC</th>
              <th>Serviço</th><th>Início</th><th>Fim</th><th>Total</th><th>Status</th>
            </tr></thead>
            <tbody>
              ${data.map(r => `
                <tr>
                  <td>${Utils.formatDate(r.data)}</td>
                  <td><strong>${Utils.sanitize(r.colaborador)}</strong></td>
                  <td>${Utils.sanitize(r.veiculo) || '-'}</td>
                  <td>${Utils.sanitize(r.site)}</td>
                  <td>${Utils.sanitize(r.servico)}</td>
                  <td>${Utils.formatTime(r.horaInicio)}</td>
                  <td>${Utils.formatTime(r.horaFim) || '--:--'}</td>
                  <td><strong>${r.totalHoras || '--'}</strong></td>
                  <td><span class="status-dot ${r.status}">${r.status === 'concluido' ? 'Concluído' : 'Em andamento'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    },

    exportar() {
      const table = document.querySelector('#resultado-relatorio table');
      if (!table) { alert('Gere um relatório primeiro.'); return; }
      let csv = '';
      table.querySelectorAll('tr').forEach(row => {
        const cols = [...row.querySelectorAll('th,td')].map(c => `"${c.textContent.trim()}"`);
        csv += cols.join(',') + '\n';
      });
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_${Utils.getCurrentDate()}.csv`;
      a.click();
    }
  }
};

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // Página de login
  if (document.getElementById('form-login')) {
    document.getElementById('form-login').addEventListener('submit', async (e) => {
      e.preventDefault();
      const usuario = document.getElementById('login-usuario').value;
      const senha = document.getElementById('login-senha').value;
      Utils.showLoading('Autenticando...');
      try {
        const res = await API.login(usuario, senha);
        Auth.save(res.user);
        window.location.href = 'dashboard.html';
      } catch (e) {
        // Demo login
        if (usuario === 'admin' && senha === 'admin123') {
          Auth.save({ id: '1', nome: 'Administrador', usuario: 'admin', perfil: 'admin' });
          window.location.href = 'dashboard.html';
        } else if (usuario === 'coord' && senha === 'coord123') {
          Auth.save({ id: '2', nome: 'Coordenador', usuario: 'coord', perfil: 'coordenador' });
          window.location.href = 'dashboard.html';
        } else if (usuario === 'super' && senha === 'super123') {
          Auth.save({ id: '3', nome: 'Supervisor', usuario: 'super', perfil: 'supervisor' });
          window.location.href = 'dashboard.html';
        } else {
          Utils.showAlert('Usuário ou senha incorretos.', 'danger', 'alert-login');
        }
      } finally {
        Utils.hideLoading();
      }
    });
  }

  // Páginas internas
  if (document.getElementById('app-layout')) {
    if (!Auth.requireAuth()) return;

    // Preenche info do usuário
    const user = STATE.user;
    document.getElementById('user-name').textContent = user.nome;
    document.getElementById('user-role').textContent = user.perfil;
    document.getElementById('user-avatar').textContent = user.nome.charAt(0).toUpperCase();

    // Esconde itens sem permissão
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      if (!Auth.hasPermission(item.dataset.page)) {
        item.style.display = 'none';
      }
    });

    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', () => Auth.logout());

    // Navegação
    Nav.init();

    // Página inicial conforme perfil
    const startPage = Auth.hasPermission('dashboard') ? 'dashboard' : 'apontamento';
    Nav.go(startPage);

    // Data atual no filtro de apontamentos
    const filtroData = document.getElementById('filtro-data-apt');
    if (filtroData) filtroData.value = Utils.getCurrentDate();
  }
});