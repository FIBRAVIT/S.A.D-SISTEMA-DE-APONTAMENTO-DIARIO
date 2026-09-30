/**
 * ============================================
 * APONTAFÁCIL - Google Apps Script (Backend)
 * Cole este código no Google Apps Script
 * ============================================
 *
 * INSTRUÇÕES DE CONFIGURAÇÃO:
 * 1. Acesse: https://script.google.com
 * 2. Crie um novo projeto
 * 3. Cole TODO este código
 * 4. Clique em "Implantar" > "Nova implantação"
 * 5. Tipo: "Aplicativo da Web"
 * 6. Executar como: "Eu"
 * 7. Quem tem acesso: "Qualquer pessoa"
 * 8. Copie a URL gerada e cole em app.js > CONFIG.SCRIPT_URL
 * ============================================
 */

// ============================================
// CONFIGURAÇÃO - ID DA PLANILHA
// ============================================
const SPREADSHEET_ID = '11YZeseMRZZlUui73l4YUsZCOsbdH_I9gzPoc2MEAThY';
// Para obter: abra sua planilha > copie o ID da URL
// Ex: https://docs.google.com/spreadsheets/d/[ESTE_É_O_ID]/edit

// Nomes das abas
const SHEETS = {
  USUARIOS:      'usuarios',
  COLABORADORES: 'colaboradores',
  VEICULOS:      'veiculos',
  SITES:         'sites',
  SERVICOS:      'servicos',
  APONTAMENTOS:  'apontamentos'
};

// ============================================
// INICIALIZAÇÃO DA PLANILHA
// ============================================
function inicializarPlanilha() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const agora = new Date().toISOString();
  const id1 = gerarId(), id2 = gerarId(), id3 = gerarId(), id4 = gerarId();
  const idV1 = gerarId(), idV2 = gerarId();
  const idS1 = gerarId(), idS2 = gerarId(), idS3 = gerarId();
  const idSv1 = gerarId(), idSv2 = gerarId(), idSv3 = gerarId(), idSv4 = gerarId();

  const estrutura = {
    usuarios: {
      headers: ['id','nome','usuario','senha','perfil','status','criadoEm'],
      dados: [
        [gerarId(),'Administrador','admin',hashSenha('admin123'),'admin','ativo',agora],
        [gerarId(),'Coordenador Geral','coord',hashSenha('coord123'),'coordenador','ativo',agora],
        [gerarId(),'Supervisor Campo','super',hashSenha('super123'),'supervisor','ativo',agora]
      ]
    },
    colaboradores: {
      headers: ['id','nome','cargo','matricula','status','criadoEm'],
      dados: [
        [id1,'João Silva','Técnico de Campo','T001','ativo',agora],
        [id2,'Maria Santos','Operadora','T002','ativo',agora],
        [id3,'Carlos Lima','Eletricista','T003','ativo',agora],
        [id4,'Ana Costa','Técnica Sênior','T004','ativo',agora]
      ]
    },
    veiculos: {
      headers: ['id','placa','modelo','tipo','status','criadoEm'],
      dados: [
        [idV1,'ABC-1234','Fiat Strada','Pickup','ativo',agora],
        [idV2,'DEF-5678','VW Saveiro','Pickup','ativo',agora]
      ]
    },
    sites: {
      headers: ['id','nome','codigo','cidade','status','criadoEm'],
      dados: [
        [idS1,'Site Alpha','CC001','São Paulo','ativo',agora],
        [idS2,'Site Beta','CC002','Campinas','ativo',agora],
        [idS3,'Site Gamma','CC003','Guarulhos','ativo',agora]
      ]
    },
    servicos: {
      headers: ['id','nome','categoria','status','criadoEm'],
      dados: [
        [idSv1,'Manutenção Preventiva','Técnico','ativo',agora],
        [idSv2,'Instalação de Equipamento','Técnico','ativo',agora],
        [idSv3,'Inspeção de Campo','Operacional','ativo',agora],
        [idSv4,'Transporte de Material','Logística','ativo',agora]
      ]
    },
    apontamentos: {
      headers: [
        'id','data','colaboradorId','colaborador','colaboradoresJson',
        'veiculoId','veiculo','siteId','site',
        'servicoId','servico','horaInicio','horaFim',
        'totalHoras','status','observacao','horaRegistro',
        'usuarioId','criadoEm','atualizadoEm'
      ],
      dados: [
        [gerarId(), new Date().toISOString().slice(0,10),
          id1, 'João Silva', JSON.stringify([{id:id1,nome:'João Silva'},{id:id3,nome:'Carlos Lima'}]),
          idV1,'ABC-1234 - Fiat Strada', idS1,'Site Alpha (CC001)', idSv1,'Manutenção Preventiva',
          '07:00','16:00','9h','concluido','Manutenção realizada com sucesso','07:02:34','',agora,agora],
        [gerarId(), new Date().toISOString().slice(0,10),
          id2, 'Maria Santos', JSON.stringify([{id:id2,nome:'Maria Santos'}]),
          '','', idS2,'Site Beta (CC002)', idSv3,'Inspeção de Campo',
          '08:00','','','andamento','','08:01:12','',agora,agora]
      ]
    }
  };

  // Cores por aba
  const cores = {
    usuarios:      { bg: '#1a56db', fg: '#ffffff' },
    colaboradores: { bg: '#0e9f6e', fg: '#ffffff' },
    veiculos:      { bg: '#7c3aed', fg: '#ffffff' },
    sites:         { bg: '#ff8800', fg: '#ffffff' },
    servicos:      { bg: '#0891b2', fg: '#ffffff' },
    apontamentos:  { bg: '#374151', fg: '#ffffff' }
  };

  Object.entries(estrutura).forEach(([nome, cfg]) => {
    let sheet = ss.getSheetByName(nome);
    if (!sheet) {
      sheet = ss.insertSheet(nome);
    } else {
      sheet.clearContents();
    }

    // Insere cabeçalho
    sheet.appendRow(cfg.headers);

    // Insere dados de exemplo
    cfg.dados.forEach(row => sheet.appendRow(row));

    // Formata cabeçalho
    const cor = cores[nome] || { bg: '#1a56db', fg: '#ffffff' };
    const headerRange = sheet.getRange(1, 1, 1, cfg.headers.length);
    headerRange.setBackground(cor.bg);
    headerRange.setFontColor(cor.fg);
    headerRange.setFontWeight('bold');
    headerRange.setFontSize(11);
    headerRange.setHorizontalAlignment('center');

    // Congela linha do cabeçalho
    sheet.setFrozenRows(1);

    // Ajusta largura das colunas automaticamente
    sheet.autoResizeColumns(1, cfg.headers.length);

    // Formata linhas de dados (zebra)
    if (cfg.dados.length > 0) {
      for (let i = 2; i <= cfg.dados.length + 1; i++) {
        const rowRange = sheet.getRange(i, 1, 1, cfg.headers.length);
        rowRange.setBackground(i % 2 === 0 ? '#f9fafb' : '#ffffff');
        rowRange.setFontSize(10);
      }
    }

    // Borda na tabela
    if (cfg.dados.length > 0) {
      sheet.getRange(1, 1, cfg.dados.length + 1, cfg.headers.length)
        .setBorder(true, true, true, true, true, true, '#e5e7eb', SpreadsheetApp.BorderStyle.SOLID);
    }

    Logger.log('✅ Aba criada: ' + nome + ' (' + cfg.dados.length + ' registros)');
  });

  // Remove aba padrão "Página1" se existir
  try {
    const defaultSheet = ss.getSheetByName('Página1') || ss.getSheetByName('Sheet1');
    if (defaultSheet) ss.deleteSheet(defaultSheet);
  } catch(e) {}

  // Vai para aba de apontamentos
  ss.setActiveSheet(ss.getSheetByName('apontamentos'));

  return { success: true, message: 'Planilha S.A.D inicializada com sucesso! Todas as abas criadas.' };
}

// ============================================
// UTILITÁRIOS
// ============================================
function gerarId() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}

function hashSenha(senha) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    senha,
    Utilities.Charset.UTF_8
  );
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function getSheet(nome) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(nome);
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function findRowById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1; // 1-indexed
  }
  return -1;
}

function calcularHoras(inicio, fim) {
  if (!inicio || !fim) return '';
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fim.split(':').map(Number);
  const totalMin = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (totalMin <= 0) return '';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h${m > 0 ? m + 'm' : ''}`;
}

function resposta(success, data, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ success, data, message }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// ROTEADOR PRINCIPAL - GET
// ============================================
function doGet(e) {
  try {
    const action = e.parameter.action;
    const params = e.parameter;

    switch (action) {
      case 'login':         return handleLogin(params);
      case 'getData':       return handleGetData(params);
      case 'getApontamentos': return handleGetApontamentos(params);
      case 'getDashboard':  return handleGetDashboard(params);
      case 'getRelatorio':  return handleGetRelatorio(params);
      default:
        return resposta(false, null, 'Ação não reconhecida: ' + action);
    }
  } catch (err) {
    return resposta(false, null, 'Erro interno: ' + err.message);
  }
}

// ============================================
// ROTEADOR PRINCIPAL - POST
// ============================================
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    switch (action) {
      case 'salvarApontamento':  return handleSalvarApontamento(body);
      case 'concluirApontamento': return handleConcluirApontamento(body);
      case 'excluirApontamento': return handleExcluirApontamento(body);
      case 'salvarCadastro':     return handleSalvarCadastro(body);
      case 'excluirCadastro':    return handleExcluirCadastro(body);
      default:
        return resposta(false, null, 'Ação POST não reconhecida: ' + action);
    }
  } catch (err) {
    return resposta(false, null, 'Erro interno POST: ' + err.message);
  }
}

// ============================================
// AUTH - LOGIN
// ============================================
function handleLogin(params) {
  const { usuario, senha } = params;
  if (!usuario || !senha) return resposta(false, null, 'Usuário e senha obrigatórios.');

  const sheet = getSheet(SHEETS.USUARIOS);
  const usuarios = sheetToObjects(sheet);
  const senhaHash = hashSenha(senha);

  const user = usuarios.find(u =>
    u.usuario === usuario &&
    u.senha === senhaHash &&
    u.status === 'ativo'
  );

  if (!user) return resposta(false, null, 'Usuário ou senha incorretos.');

  return resposta(true, {
    id: user.id,
    nome: user.nome,
    usuario: user.usuario,
    perfil: user.perfil
  }, 'Login realizado com sucesso.');
}

// ============================================
// GET DATA (CADASTROS)
// ============================================
function handleGetData(params) {
  const { sheet: sheetName } = params;
  const validSheets = Object.values(SHEETS);
  if (!validSheets.includes(sheetName)) {
    return resposta(false, null, 'Aba inválida.');
  }

  const sheet = getSheet(sheetName);
  if (!sheet) return resposta(false, [], 'Aba não encontrada.');

  let data = sheetToObjects(sheet);

  // Remove senha dos usuários
  if (sheetName === SHEETS.USUARIOS) {
    data = data.map(u => { const { senha, ...rest } = u; return rest; });
  }

  // Filtra apenas ativos (exceto apontamentos)
  if (sheetName !== SHEETS.APONTAMENTOS) {
    data = data.filter(d => d.status === 'ativo');
  }

  return resposta(true, data, 'OK');
}

// ============================================
// GET APONTAMENTOS
// ============================================
function handleGetApontamentos(params) {
  const sheet = getSheet(SHEETS.APONTAMENTOS);
  let data = sheetToObjects(sheet);

  // Filtro por data
  if (params.data) {
    data = data.filter(a => String(a.data).slice(0, 10) === params.data);
  }

  // Filtro por colaborador
  if (params.colaboradorId) {
    data = data.filter(a => String(a.colaboradorId) === params.colaboradorId);
  }

  // Filtro por site
  if (params.siteId) {
    data = data.filter(a => String(a.siteId) === params.siteId);
  }

  // Filtro por status
  if (params.status) {
    data = data.filter(a => a.status === params.status);
  }

  // Parseia colaboradoresJson e adiciona campo colaboradores[]
  data = data.map(a => {
    let colaboradores = [];
    try {
      if (a.colaboradoresJson) {
        const parsed = JSON.parse(a.colaboradoresJson);
        colaboradores = parsed.map(c => c.nome);
      } else if (a.colaborador) {
        colaboradores = [a.colaborador];
      }
    } catch(e) {
      colaboradores = a.colaborador ? [a.colaborador] : [];
    }
    return { ...a, colaboradores };
  });

  // Ordena por hora de criação (mais recente primeiro)
  data.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));

  return resposta(true, data, 'OK');
}

// ============================================
// SALVAR APONTAMENTO (POST)
// Suporta múltiplos colaboradores + hora do registro
// ============================================
function handleSalvarApontamento(body) {
  const { colaboradoresIds, colaboradoresNomes, veiculoId, siteId, servicoId,
          horaInicio, horaRegistro, observacao, data, usuarioId } = body;

  // Compatibilidade retroativa: aceita colaboradorId singular também
  const idsArray = colaboradoresIds && colaboradoresIds.length > 0
    ? colaboradoresIds
    : (body.colaboradorId ? [body.colaboradorId] : []);

  if (!idsArray || idsArray.length === 0 || !siteId || !servicoId || !horaInicio) {
    return resposta(false, null, 'Campos obrigatórios não preenchidos.');
  }

  // Busca nomes
  const veiculos = sheetToObjects(getSheet(SHEETS.VEICULOS));
  const sites    = sheetToObjects(getSheet(SHEETS.SITES));
  const servicos = sheetToObjects(getSheet(SHEETS.SERVICOS));

  const veiculo  = veiculos.find(v => String(v.id) === String(veiculoId));
  const site     = sites.find(s => String(s.id) === String(siteId));
  const servico  = servicos.find(s => String(s.id) === String(servicoId));

  if (!site)   return resposta(false, null, 'Site não encontrado.');
  if (!servico) return resposta(false, null, 'Serviço não encontrado.');

  const agora = new Date().toISOString();
  const dataApontamento = data || agora.slice(0, 10);
  const nomes = colaboradoresNomes && colaboradoresNomes.length > 0
    ? colaboradoresNomes
    : idsArray; // fallback

  // Grava colaboradores como JSON array na coluna
  const colaboradoresJson = JSON.stringify(
    idsArray.map((id, i) => ({ id: String(id), nome: nomes[i] || '' }))
  );

  // Nome resumido para exibição (ex: "João Silva + 2")
  const nomeExibicao = nomes.length === 1
    ? nomes[0]
    : nomes[0] + ' +' + (nomes.length - 1);

  const id = gerarId();

  const row = [
    id,
    dataApontamento,
    idsArray.join(','),          // colaboradorId (múltiplos separados por vírgula)
    nomeExibicao,                // colaborador (nome resumido)
    colaboradoresJson,           // colaboradoresJson (array completo)
    veiculoId || '',
    veiculo ? veiculo.placa + ' - ' + veiculo.modelo : '',
    siteId,
    site.nome + ' (' + site.codigo + ')',
    servicoId,
    servico.nome,
    horaInicio,
    '',                          // horaFim
    '',                          // totalHoras
    'andamento',                 // status
    observacao || '',
    horaRegistro || agora.slice(11, 19), // horaRegistro (hora que o form foi aberto)
    usuarioId || '',
    agora,                       // criadoEm
    agora                        // atualizadoEm
  ];

  getSheet(SHEETS.APONTAMENTOS).appendRow(row);
  return resposta(true, { id }, 'Apontamento registrado com sucesso.');
}

// ============================================
// CONCLUIR APONTAMENTO (POST)
// ============================================
function handleConcluirApontamento(body) {
  const { id, horaFinal } = body;
  if (!id || !horaFinal) return resposta(false, null, 'ID e hora final obrigatórios.');

  const sheet = getSheet(SHEETS.APONTAMENTOS);
  const rowNum = findRowById(sheet, id);
  if (rowNum === -1) return resposta(false, null, 'Apontamento não encontrado.');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0];
  const obj = {};
  headers.forEach((h, i) => { obj[h] = row[i]; });

  const totalHoras = calcularHoras(obj.horaInicio, horaFinal);
  const agora = new Date().toISOString();

  // Atualiza colunas: horaFim, totalHoras, status, atualizadoEm
  const colHoraFim    = headers.indexOf('horaFim') + 1;
  const colTotal      = headers.indexOf('totalHoras') + 1;
  const colStatus     = headers.indexOf('status') + 1;
  const colAtualizado = headers.indexOf('atualizadoEm') + 1;

  sheet.getRange(rowNum, colHoraFim).setValue(horaFinal);
  sheet.getRange(rowNum, colTotal).setValue(totalHoras);
  sheet.getRange(rowNum, colStatus).setValue('concluido');
  sheet.getRange(rowNum, colAtualizado).setValue(agora);

  return resposta(true, { id, totalHoras }, 'Apontamento concluído com sucesso.');
}

// ============================================
// EXCLUIR APONTAMENTO (POST)
// ============================================
function handleExcluirApontamento(body) {
  const { id } = body;
  if (!id) return resposta(false, null, 'ID obrigatório.');

  const sheet = getSheet(SHEETS.APONTAMENTOS);
  const rowNum = findRowById(sheet, id);
  if (rowNum === -1) return resposta(false, null, 'Apontamento não encontrado.');

  sheet.deleteRow(rowNum);
  return resposta(true, null, 'Apontamento excluído.');
}

// ============================================
// SALVAR CADASTRO (POST)
// ============================================
function handleSalvarCadastro(body) {
  const { sheet: sheetName, dados } = body;
  const validSheets = [SHEETS.COLABORADORES, SHEETS.VEICULOS, SHEETS.SITES, SHEETS.SERVICOS, SHEETS.USUARIOS];

  if (!validSheets.includes(sheetName)) {
    return resposta(false, null, 'Aba inválida para cadastro.');
  }

  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const agora = new Date().toISOString();

  if (dados.id) {
    // EDITAR
    const rowNum = findRowById(sheet, dados.id);
    if (rowNum === -1) return resposta(false, null, 'Registro não encontrado.');

    headers.forEach((h, i) => {
      if (h === 'id' || h === 'criadoEm') return;
      if (h === 'senha' && dados.senha) {
        sheet.getRange(rowNum, i + 1).setValue(hashSenha(dados.senha));
      } else if (dados[h] !== undefined && dados[h] !== '') {
        sheet.getRange(rowNum, i + 1).setValue(dados[h]);
      }
    });
    return resposta(true, { id: dados.id }, 'Registro atualizado.');
  } else {
    // NOVO
    const id = gerarId();
    const row = headers.map(h => {
      if (h === 'id') return id;
      if (h === 'criadoEm') return agora;
      if (h === 'status') return dados.status || 'ativo';
      if (h === 'senha') return dados.senha ? hashSenha(dados.senha) : '';
      return dados[h] || '';
    });
    sheet.appendRow(row);
    return resposta(true, { id }, 'Registro criado com sucesso.');
  }
}

// ============================================
// EXCLUIR CADASTRO (POST)
// ============================================
function handleExcluirCadastro(body) {
  const { sheet: sheetName, id } = body;
  if (!sheetName || !id) return resposta(false, null, 'Parâmetros obrigatórios.');

  const sheet = getSheet(sheetName);
  const rowNum = findRowById(sheet, id);
  if (rowNum === -1) return resposta(false, null, 'Registro não encontrado.');

  // Soft delete: muda status para inativo
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colStatus = headers.indexOf('status') + 1;
  if (colStatus > 0) {
    sheet.getRange(rowNum, colStatus).setValue('inativo');
  } else {
    sheet.deleteRow(rowNum);
  }

  return resposta(true, null, 'Registro removido.');
}

// ============================================
// DASHBOARD
// ============================================
function handleGetDashboard() {
  const hoje = new Date().toISOString().slice(0, 10);
  const sheet = getSheet(SHEETS.APONTAMENTOS);
  const todos = sheetToObjects(sheet);
  const deHoje = todos.filter(a => String(a.data).slice(0, 10) === hoje);

  const emAndamento = deHoje.filter(a => a.status === 'andamento');
  const concluidos  = deHoje.filter(a => a.status === 'concluido');

  // Colaboradores únicos hoje
  const colsUnicos = [...new Set(deHoje.map(a => a.colaboradorId))];

  // Veículos únicos hoje
  const veisUnicos = [...new Set(deHoje.filter(a => a.veiculoId).map(a => a.veiculoId))];

  // Horas totais (apenas concluídos)
  let horasTotaisMin = 0;
  concluidos.forEach(a => {
    if (a.horaInicio && a.horaFim) {
      const [h1, m1] = a.horaInicio.split(':').map(Number);
      const [h2, m2] = a.horaFim.split(':').map(Number);
      horasTotaisMin += (h2 * 60 + m2) - (h1 * 60 + m1);
    }
  });
  const horasTotais = Math.round(horasTotaisMin / 60 * 10) / 10;
  const mediaHoras = concluidos.length > 0 ? Math.round(horasTotais / concluidos.length * 10) / 10 : 0;

  // Por site
  const porSiteMap = {};
  concluidos.forEach(a => {
    if (!porSiteMap[a.site]) porSiteMap[a.site] = 0;
    if (a.horaInicio && a.horaFim) {
      const [h1, m1] = a.horaInicio.split(':').map(Number);
      const [h2, m2] = a.horaFim.split(':').map(Number);
      porSiteMap[a.site] += Math.round(((h2 * 60 + m2) - (h1 * 60 + m1)) / 60 * 10) / 10;
    }
  });
  const porSite = Object.entries(porSiteMap)
    .map(([nome, horas]) => ({ nome, horas }))
    .sort((a, b) => b.horas - a.horas)
    .slice(0, 6);

  // Por serviço
  const porServicoMap = {};
  deHoje.forEach(a => {
    if (!porServicoMap[a.servico]) porServicoMap[a.servico] = 0;
    porServicoMap[a.servico]++;
  });
  const porServico = Object.entries(porServicoMap)
    .map(([nome, qtd]) => ({ nome, qtd }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 5);

  // Últimos 7 dias
  const semana = { labels: [], apontamentos: [], horas: [] };
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('pt-BR', { weekday: 'short' });
    const doDia = todos.filter(a => String(a.data).slice(0, 10) === dateStr);
    const horasDia = doDia.filter(a => a.status === 'concluido').reduce((acc, a) => {
      if (a.horaInicio && a.horaFim) {
        const [h1, m1] = a.horaInicio.split(':').map(Number);
        const [h2, m2] = a.horaFim.split(':').map(Number);
        acc += Math.round(((h2 * 60 + m2) - (h1 * 60 + m1)) / 60 * 10) / 10;
      }
      return acc;
    }, 0);
    semana.labels.push(label);
    semana.apontamentos.push(doDia.length);
    semana.horas.push(horasDia);
  }

  // Últimos apontamentos
  const ultimosApontamentos = deHoje.slice(0, 10).map(a => ({
    colaborador: a.colaborador,
    site: a.site,
    servico: a.servico,
    horaInicio: a.horaInicio,
    horaFim: a.horaFim,
    status: a.status
  }));

  return resposta(true, {
    totalHoje: deHoje.length,
    emAndamento: emAndamento.length,
    concluidos: concluidos.length,
    colaboradoresAtivos: colsUnicos.length,
    veiculosEmUso: veisUnicos.length,
    horasTotaisHoje: horasTotais,
    mediaHorasPorServico: mediaHoras,
    registrosAbertos: emAndamento.length,
    porSite,
    porServico,
    semana,
    ultimosApontamentos
  }, 'OK');
}

// ============================================
// RELATÓRIO
// ============================================
function handleGetRelatorio(params) {
  const sheet = getSheet(SHEETS.APONTAMENTOS);
  let data = sheetToObjects(sheet);

  // Filtros
  if (params.dataInicio) {
    data = data.filter(a => String(a.data).slice(0, 10) >= params.dataInicio);
  }
  if (params.dataFim) {
    data = data.filter(a => String(a.data).slice(0, 10) <= params.dataFim);
  }
  if (params.colaboradorId) {
    data = data.filter(a => String(a.colaboradorId) === params.colaboradorId);
  }
  if (params.veiculoId) {
    data = data.filter(a => String(a.veiculoId) === params.veiculoId);
  }
  if (params.siteId) {
    data = data.filter(a => String(a.siteId) === params.siteId);
  }
  if (params.servicoId) {
    data = data.filter(a => String(a.servicoId) === params.servicoId);
  }
  if (params.status) {
    data = data.filter(a => a.status === params.status);
  }

  // Ordena por data desc
  data.sort((a, b) => {
    const da = String(a.data) + String(a.horaInicio);
    const db = String(b.data) + String(b.horaInicio);
    return db.localeCompare(da);
  });

  const resultado = data.map(a => {
    // Parseia colaboradores
    let nomes = a.colaborador || '';
    try {
      if (a.colaboradoresJson) {
        const parsed = JSON.parse(a.colaboradoresJson);
        nomes = parsed.map(c => c.nome).join(', ');
      }
    } catch(e) {}

    return {
      data: String(a.data).slice(0, 10),
      colaborador: nomes,
      veiculo: a.veiculo || '',
      site: a.site,
      servico: a.servico,
      horaInicio: a.horaInicio,
      horaFim: a.horaFim || '',
      totalHoras: a.totalHoras || '--',
      horaRegistro: a.horaRegistro || '',
      status: a.status,
      observacao: a.observacao || ''
    };
  });

  return resposta(true, resultado, 'OK');
}

// ============================================
// FUNÇÃO DE TESTE (execute manualmente)
// ============================================
function testarSistema() {
  Logger.log('=== S.A.D – SISTEMA DE APONTAMENTO DIÁRIO ===');
  Logger.log('Inicializando planilha e criando todas as abas...');

  const init = inicializarPlanilha();
  Logger.log(JSON.stringify(init));

  Logger.log('---');
  Logger.log('Testando login Admin...');
  const loginAdmin = handleLogin({ usuario: 'admin', senha: 'admin123' });
  Logger.log(loginAdmin.getContent());

  Logger.log('Testando login Coordenador...');
  const loginCoord = handleLogin({ usuario: 'coord', senha: 'coord123' });
  Logger.log(loginCoord.getContent());

  Logger.log('Testando login Supervisor...');
  const loginSuper = handleLogin({ usuario: 'super', senha: 'super123' });
  Logger.log(loginSuper.getContent());

  Logger.log('---');
  Logger.log('✅ SISTEMA PRONTO PARA USO!');
  Logger.log('Abas criadas: usuarios, colaboradores, veiculos, sites, servicos, apontamentos');
  Logger.log('=== FIM DO TESTE ===');
}