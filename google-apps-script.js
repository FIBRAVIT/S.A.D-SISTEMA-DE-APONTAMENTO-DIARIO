/**
 * ============================================
 * S.P.A.D.O - Google Apps Script (Backend)
 * Sistema de Planejamento e Apontamento Diário Operacional
 * ============================================
 * INSTRUÇÕES:
 * 1. Acesse: https://script.google.com
 * 2. Cole TODO este código
 * 3. Substitua SPREADSHEET_ID pelo ID da sua planilha
 * 4. Execute testarSistema() para inicializar
 * 5. Implante como Web App (Qualquer pessoa)
 * ============================================
 */

// ============================================
// CONFIGURAÇÃO
// ============================================
var SPREADSHEET_ID = '11YZeseMRZZlUui73l4YUsZCOsbdH_I9gzPoc2MEAThY';

var SHEETS = {
  USUARIOS:      'usuarios',
  COLABORADORES: 'colaboradores',
  VEICULOS:      'veiculos',
  SITES:         'sites',
  SERVICOS:      'servicos',
  PLANEJAMENTOS: 'planejamentos',
  APONTAMENTOS:  'apontamentos'
};

// ============================================
// UTILITÁRIOS (devem vir antes de inicializarPlanilha)
// ============================================
function gerarId() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}

function hashSenha(senha) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    senha,
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

function getSheet(nome) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(nome);
}

function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function findRowById(sheet, id) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1;
  }
  return -1;
}

function calcularHoras(inicio, fim) {
  if (!inicio || !fim) return '';
  var p1 = inicio.toString().split(':').map(Number);
  var p2 = fim.toString().split(':').map(Number);
  var totalMin = (p2[0] * 60 + p2[1]) - (p1[0] * 60 + p1[1]);
  if (totalMin <= 0) return '';
  var h = Math.floor(totalMin / 60);
  var m = totalMin % 60;
  return h + 'h' + (m > 0 ? m + 'm' : '');
}

function resposta(success, data, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: success, data: data, message: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// INICIALIZAÇÃO DA PLANILHA
// ============================================
function inicializarPlanilha() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var agora = new Date().toISOString();

  var id1 = gerarId(), id2 = gerarId(), id3 = gerarId(), id4 = gerarId();
  var idV1 = gerarId(), idV2 = gerarId();
  var idS1 = gerarId(), idS2 = gerarId(), idS3 = gerarId();
  var idSv1 = gerarId(), idSv2 = gerarId(), idSv3 = gerarId(), idSv4 = gerarId();

  var estrutura = {
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
    planejamentos: {
      headers: [
        'id','data','colaboradoresIds','colaboradoresNomes','colaboradoresJson',
        'veiculoId','veiculo','siteId','site',
        'servicoId','servico','horaInicioPlano','horaFimPlano',
        'status','observacao','usuarioId','criadoEm','atualizadoEm'
      ],
      dados: [
        [gerarId(), new Date().toISOString().slice(0,10),
         id1+','+id3, 'João Silva, Carlos Lima',
         JSON.stringify([{id:id1,nome:'João Silva'},{id:id3,nome:'Carlos Lima'}]),
         idV1, 'ABC-1234 - Fiat Strada',
         idS1, 'Site Alpha (CC001)',
         idSv1, 'Manutenção Preventiva',
         '07:00', '16:00', 'planejado', '', '', agora, agora],
        [gerarId(), new Date().toISOString().slice(0,10),
         id2, 'Maria Santos',
         JSON.stringify([{id:id2,nome:'Maria Santos'}]),
         '', '',
         idS2, 'Site Beta (CC002)',
         idSv3, 'Inspeção de Campo',
         '08:00', '17:00', 'planejado', '', '', agora, agora]
      ]
    },
    apontamentos: {
      headers: [
        'id','planejamentoId','data',
        'colaboradoresIds','colaborador','colaboradoresJson',
        'veiculoId','veiculo','siteId','site',
        'servicoId','servico','horaInicio','horaFim',
        'totalHoras','statusApontamento','statusConformidade',
        'observacao','horaRegistro','usuarioId','criadoEm','atualizadoEm'
      ],
      dados: []
    }
  };

  var cores = {
    usuarios:      { bg: '#1a56db', fg: '#ffffff' },
    colaboradores: { bg: '#0e9f6e', fg: '#ffffff' },
    veiculos:      { bg: '#7c3aed', fg: '#ffffff' },
    sites:         { bg: '#ff8800', fg: '#ffffff' },
    servicos:      { bg: '#0891b2', fg: '#ffffff' },
    planejamentos: { bg: '#10243B', fg: '#ffffff' },
    apontamentos:  { bg: '#374151', fg: '#ffffff' }
  };

  var nomes = Object.keys(estrutura);
  for (var n = 0; n < nomes.length; n++) {
    var nome = nomes[n];
    var cfg = estrutura[nome];
    var sheet = ss.getSheetByName(nome);
    if (!sheet) {
      sheet = ss.insertSheet(nome);
    } else {
      sheet.clearContents();
    }

    sheet.appendRow(cfg.headers);
    for (var d = 0; d < cfg.dados.length; d++) {
      sheet.appendRow(cfg.dados[d]);
    }

    var cor = cores[nome] || { bg: '#1a56db', fg: '#ffffff' };
    var headerRange = sheet.getRange(1, 1, 1, cfg.headers.length);
    headerRange.setBackground(cor.bg);
    headerRange.setFontColor(cor.fg);
    headerRange.setFontWeight('bold');
    headerRange.setFontSize(11);
    headerRange.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, cfg.headers.length);

    if (cfg.dados.length > 0) {
      for (var i = 2; i <= cfg.dados.length + 1; i++) {
        var rowRange = sheet.getRange(i, 1, 1, cfg.headers.length);
        rowRange.setBackground(i % 2 === 0 ? '#f9fafb' : '#ffffff');
        rowRange.setFontSize(10);
      }
      sheet.getRange(1, 1, cfg.dados.length + 1, cfg.headers.length)
        .setBorder(true, true, true, true, true, true, '#e5e7eb', SpreadsheetApp.BorderStyle.SOLID);
    }

    Logger.log('Aba criada: ' + nome + ' (' + cfg.dados.length + ' registros)');
  }

  try {
    var defaultSheet = ss.getSheetByName('Página1') || ss.getSheetByName('Sheet1');
    if (defaultSheet) ss.deleteSheet(defaultSheet);
  } catch(e) {}

  ss.setActiveSheet(ss.getSheetByName('planejamentos'));
  Logger.log('S.P.A.D.O inicializado com sucesso!');
  return 'Planilha S.P.A.D.O inicializada com sucesso!';
}

// ============================================
// ROTEADOR GET
// ============================================
function doGet(e) {
  try {
    var action = e.parameter.action;
    var params = e.parameter;
    switch (action) {
      case 'login':            return handleLogin(params);
      case 'getData':          return handleGetData(params);
      case 'getApontamentos':  return handleGetApontamentos(params);
      case 'getPlanejamentos': return handleGetPlanejamentos(params);
      case 'getDashboard':     return handleGetDashboard(params);
      case 'getRelatorio':     return handleGetRelatorio(params);
      default:                 return resposta(false, null, 'Acao nao reconhecida: ' + action);
    }
  } catch(err) {
    return resposta(false, null, 'Erro interno: ' + err.message);
  }
}

// ============================================
// ROTEADOR POST
// ============================================
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    switch (action) {
      case 'salvarApontamento':     return handleSalvarApontamento(body);
      case 'concluirApontamento':   return handleConcluirApontamento(body);
      case 'excluirApontamento':    return handleExcluirApontamento(body);
      case 'salvarPlanejamento':    return handleSalvarPlanejamento(body);
      case 'atualizarPlanejamento': return handleAtualizarPlanejamento(body);
      case 'excluirPlanejamento':   return handleExcluirPlanejamento(body);
      case 'salvarCadastro':        return handleSalvarCadastro(body);
      case 'excluirCadastro':       return handleExcluirCadastro(body);
      default:                      return resposta(false, null, 'Acao POST nao reconhecida: ' + action);
    }
  } catch(err) {
    return resposta(false, null, 'Erro interno POST: ' + err.message);
  }
}

// ============================================
// LOGIN
// ============================================
function handleLogin(params) {
  var usuario = params.usuario;
  var senha = params.senha;
  if (!usuario || !senha) return resposta(false, null, 'Usuario e senha obrigatorios.');

  var sheet = getSheet(SHEETS.USUARIOS);
  var usuarios = sheetToObjects(sheet);
  var senhaHash = hashSenha(senha);
  var user = null;

  for (var i = 0; i < usuarios.length; i++) {
    if (String(usuarios[i].usuario) === String(usuario) &&
        String(usuarios[i].senha) === String(senhaHash) &&
        usuarios[i].status === 'ativo') {
      user = usuarios[i];
      break;
    }
  }

  if (!user) return resposta(false, null, 'Usuario ou senha incorretos.');
  return resposta(true, {
    id: user.id,
    nome: user.nome,
    usuario: user.usuario,
    perfil: user.perfil
  }, 'OK');
}

// ============================================
// GET DATA (CADASTROS)
// ============================================
function handleGetData(params) {
  var sheetName = params.sheet;
  var validSheets = [
    SHEETS.USUARIOS, SHEETS.COLABORADORES, SHEETS.VEICULOS,
    SHEETS.SITES, SHEETS.SERVICOS, SHEETS.PLANEJAMENTOS, SHEETS.APONTAMENTOS
  ];
  if (validSheets.indexOf(sheetName) === -1) return resposta(false, null, 'Aba invalida.');

  var sheet = getSheet(sheetName);
  if (!sheet) return resposta(false, [], 'Aba nao encontrada.');

  var data = sheetToObjects(sheet);

  if (sheetName === SHEETS.USUARIOS) {
    data = data.map(function(u) {
      var r = {};
      Object.keys(u).forEach(function(k) { if (k !== 'senha') r[k] = u[k]; });
      return r;
    });
  }

  if (sheetName !== SHEETS.APONTAMENTOS && sheetName !== SHEETS.PLANEJAMENTOS) {
    data = data.filter(function(d) { return d.status === 'ativo'; });
  }

  return resposta(true, data, 'OK');
}

// ============================================
// GET PLANEJAMENTOS
// ============================================
function handleGetPlanejamentos(params) {
  var sheet = getSheet(SHEETS.PLANEJAMENTOS);
  if (!sheet) return resposta(true, [], 'OK');
  var data = sheetToObjects(sheet);

  if (params.data) {
    data = data.filter(function(p) { return String(p.data).slice(0,10) === params.data; });
  }
  if (params.dataInicio) {
    data = data.filter(function(p) { return String(p.data).slice(0,10) >= params.dataInicio; });
  }
  if (params.dataFim) {
    data = data.filter(function(p) { return String(p.data).slice(0,10) <= params.dataFim; });
  }
  if (params.siteId) {
    data = data.filter(function(p) { return String(p.siteId) === params.siteId; });
  }
  if (params.status) {
    data = data.filter(function(p) { return p.status === params.status; });
  }

  data = data.map(function(p) {
    var colaboradores = [];
    try {
      if (p.colaboradoresJson) {
        colaboradores = JSON.parse(p.colaboradoresJson).map(function(c) { return c.nome; });
      } else if (p.colaboradoresNomes) {
        colaboradores = p.colaboradoresNomes.toString().split(',').map(function(n) { return n.trim(); });
      }
    } catch(e) {
      colaboradores = p.colaboradoresNomes ? [p.colaboradoresNomes.toString()] : [];
    }
    p.colaboradores = colaboradores;
    return p;
  });

  data.sort(function(a, b) { return String(a.data).localeCompare(String(b.data)); });
  return resposta(true, data, 'OK');
}

// ============================================
// SALVAR PLANEJAMENTO
// ============================================
function handleSalvarPlanejamento(body) {
  var colaboradoresIds = body.colaboradoresIds;
  var colaboradoresNomes = body.colaboradoresNomes;
  var veiculoId = body.veiculoId;
  var siteId = body.siteId;
  var servicoId = body.servicoId;
  var horaInicioPlano = body.horaInicioPlano;
  var horaFimPlano = body.horaFimPlano;
  var observacao = body.observacao;
  var data = body.data;
  var usuarioId = body.usuarioId;

  var idsArray = Array.isArray(colaboradoresIds) ? colaboradoresIds : (colaboradoresIds ? [colaboradoresIds] : []);
  if (idsArray.length === 0 || !siteId || !servicoId || !data) {
    return resposta(false, null, 'Campos obrigatorios nao preenchidos.');
  }

  var veiculos = sheetToObjects(getSheet(SHEETS.VEICULOS));
  var sites    = sheetToObjects(getSheet(SHEETS.SITES));
  var servicos = sheetToObjects(getSheet(SHEETS.SERVICOS));

  var veiculo = null, site = null, servico = null;
  for (var i = 0; i < veiculos.length; i++) { if (String(veiculos[i].id) === String(veiculoId)) { veiculo = veiculos[i]; break; } }
  for (var i = 0; i < sites.length; i++) { if (String(sites[i].id) === String(siteId)) { site = sites[i]; break; } }
  for (var i = 0; i < servicos.length; i++) { if (String(servicos[i].id) === String(servicoId)) { servico = servicos[i]; break; } }

  if (!site) return resposta(false, null, 'Site nao encontrado.');
  if (!servico) return resposta(false, null, 'Servico nao encontrado.');

  var agora = new Date().toISOString();
  var nomesArray = Array.isArray(colaboradoresNomes) ? colaboradoresNomes : (colaboradoresNomes ? [colaboradoresNomes] : []);
  var idsStr = idsArray.join(',');
  var nomesStr = nomesArray.join(', ');
  var colaboradoresJson = JSON.stringify(idsArray.map(function(id, idx) {
    return { id: String(id), nome: nomesArray[idx] || '' };
  }));

  var id = gerarId();
  var row = [
    id, data, idsStr, nomesStr, colaboradoresJson,
    veiculoId || '', veiculo ? veiculo.placa + ' - ' + veiculo.modelo : '',
    siteId, site.nome + ' (' + site.codigo + ')',
    servicoId, servico.nome,
    horaInicioPlano || '', horaFimPlano || '',
    'planejado', observacao || '', usuarioId || '', agora, agora
  ];

  getSheet(SHEETS.PLANEJAMENTOS).appendRow(row);
  return resposta(true, { id: id }, 'Planejamento registrado com sucesso.');
}

// ============================================
// ATUALIZAR PLANEJAMENTO
// ============================================
function handleAtualizarPlanejamento(body) {
  var id = body.id;
  var status = body.status;
  var observacao = body.observacao;
  if (!id) return resposta(false, null, 'ID obrigatorio.');

  var sheet = getSheet(SHEETS.PLANEJAMENTOS);
  var rowNum = findRowById(sheet, id);
  if (rowNum === -1) return resposta(false, null, 'Planejamento nao encontrado.');

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var agora = new Date().toISOString();

  var colStatus = headers.indexOf('status') + 1;
  var colObs    = headers.indexOf('observacao') + 1;
  var colAtual  = headers.indexOf('atualizadoEm') + 1;

  if (colStatus > 0) sheet.getRange(rowNum, colStatus).setValue(status || 'planejado');
  if (colObs > 0 && observacao !== undefined) sheet.getRange(rowNum, colObs).setValue(observacao);
  if (colAtual > 0) sheet.getRange(rowNum, colAtual).setValue(agora);

  return resposta(true, { id: id }, 'Planejamento atualizado.');
}

// ============================================
// EXCLUIR PLANEJAMENTO
// ============================================
function handleExcluirPlanejamento(body) {
  var id = body.id;
  if (!id) return resposta(false, null, 'ID obrigatorio.');
  var sheet = getSheet(SHEETS.PLANEJAMENTOS);
  var rowNum = findRowById(sheet, id);
  if (rowNum === -1) return resposta(false, null, 'Planejamento nao encontrado.');
  sheet.deleteRow(rowNum);
  return resposta(true, null, 'Planejamento excluido.');
}

// ============================================
// GET APONTAMENTOS
// ============================================
function handleGetApontamentos(params) {
  var sheet = getSheet(SHEETS.APONTAMENTOS);
  if (!sheet) return resposta(true, [], 'OK');
  var data = sheetToObjects(sheet);

  if (params.data) {
    data = data.filter(function(a) { return String(a.data).slice(0,10) === params.data; });
  }
  if (params.dataInicio) {
    data = data.filter(function(a) { return String(a.data).slice(0,10) >= params.dataInicio; });
  }
  if (params.dataFim) {
    data = data.filter(function(a) { return String(a.data).slice(0,10) <= params.dataFim; });
  }
  if (params.siteId) {
    data = data.filter(function(a) { return String(a.siteId) === params.siteId; });
  }
  if (params.status) {
    data = data.filter(function(a) { return a.statusConformidade === params.status; });
  }

  data = data.map(function(a) {
    var colaboradores = [];
    try {
      if (a.colaboradoresJson) {
        colaboradores = JSON.parse(a.colaboradoresJson).map(function(c) { return c.nome; });
      } else if (a.colaborador) {
        colaboradores = [a.colaborador.toString()];
      }
    } catch(e) {
      colaboradores = a.colaborador ? [a.colaborador.toString()] : [];
    }
    a.colaboradores = colaboradores;
    return a;
  });

  data.sort(function(a, b) { return new Date(b.criadoEm) - new Date(a.criadoEm); });
  return resposta(true, data, 'OK');
}

// ============================================
// SALVAR APONTAMENTO
// ============================================
function handleSalvarApontamento(body) {
  var colaboradoresIds = body.colaboradoresIds;
  var colaboradoresNomes = body.colaboradoresNomes;
  var veiculoId = body.veiculoId;
  var siteId = body.siteId;
  var servicoId = body.servicoId;
  var horaInicio = body.horaInicio;
  var horaFim = body.horaFim;
  var horaRegistro = body.horaRegistro;
  var observacao = body.observacao;
  var statusConformidade = body.statusConformidade || 'avulso';
  var planejamentoId = body.planejamentoId || '';
  var data = body.data;
  var usuarioId = body.usuarioId;

  var idsArray = Array.isArray(colaboradoresIds) ? colaboradoresIds :
    (colaboradoresIds ? [colaboradoresIds] : (body.colaboradorId ? [body.colaboradorId] : []));

  if (!siteId || !servicoId) {
    return resposta(false, null, 'Campos obrigatorios nao preenchidos.');
  }

  var veiculos = sheetToObjects(getSheet(SHEETS.VEICULOS));
  var sites    = sheetToObjects(getSheet(SHEETS.SITES));
  var servicos = sheetToObjects(getSheet(SHEETS.SERVICOS));

  var veiculo = null, site = null, servico = null;
  for (var i = 0; i < veiculos.length; i++) { if (String(veiculos[i].id) === String(veiculoId)) { veiculo = veiculos[i]; break; } }
  for (var i = 0; i < sites.length; i++) { if (String(sites[i].id) === String(siteId)) { site = sites[i]; break; } }
  for (var i = 0; i < servicos.length; i++) { if (String(servicos[i].id) === String(servicoId)) { servico = servicos[i]; break; } }

  if (!site) return resposta(false, null, 'Site nao encontrado.');
  if (!servico) return resposta(false, null, 'Servico nao encontrado.');

  var agora = new Date().toISOString();
  var nomesArray = Array.isArray(colaboradoresNomes) ? colaboradoresNomes : (colaboradoresNomes ? [colaboradoresNomes] : []);
  var nomeExibicao = nomesArray.length > 0 ? (nomesArray.length === 1 ? nomesArray[0] : nomesArray[0] + ' +' + (nomesArray.length - 1)) : '';
  var colaboradoresJson = JSON.stringify(idsArray.map(function(id, idx) {
    return { id: String(id), nome: nomesArray[idx] || '' };
  }));
  var totalHoras = calcularHoras(horaInicio, horaFim);

  var id = gerarId();
  var row = [
    id, planejamentoId, data || agora.slice(0,10),
    idsArray.join(','), nomeExibicao, colaboradoresJson,
    veiculoId || '', veiculo ? veiculo.placa + ' - ' + veiculo.modelo : '',
    siteId, site.nome + ' (' + site.codigo + ')',
    servicoId, servico.nome,
    horaInicio || '', horaFim || '', totalHoras,
    'concluido', statusConformidade,
    observacao || '', horaRegistro || agora.slice(11,19),
    usuarioId || '', agora, agora
  ];

  getSheet(SHEETS.APONTAMENTOS).appendRow(row);
  return resposta(true, { id: id }, 'Apontamento registrado com sucesso.');
}

// ============================================
// CONCLUIR APONTAMENTO
// ============================================
function handleConcluirApontamento(body) {
  var id = body.id;
  var horaFinal = body.horaFinal;
  if (!id || !horaFinal) return resposta(false, null, 'ID e hora final obrigatorios.');

  var sheet = getSheet(SHEETS.APONTAMENTOS);
  var rowNum = findRowById(sheet, id);
  if (rowNum === -1) return resposta(false, null, 'Apontamento nao encontrado.');

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0];
  var obj = {};
  headers.forEach(function(h, i) { obj[h] = row[i]; });

  var totalHoras = calcularHoras(obj.horaInicio, horaFinal);
  var agora = new Date().toISOString();

  var colHoraFim    = headers.indexOf('horaFim') + 1;
  var colTotal      = headers.indexOf('totalHoras') + 1;
  var colStatus     = headers.indexOf('statusApontamento') + 1;
  var colAtualizado = headers.indexOf('atualizadoEm') + 1;

  if (colHoraFim > 0)    sheet.getRange(rowNum, colHoraFim).setValue(horaFinal);
  if (colTotal > 0)      sheet.getRange(rowNum, colTotal).setValue(totalHoras);
  if (colStatus > 0)     sheet.getRange(rowNum, colStatus).setValue('concluido');
  if (colAtualizado > 0) sheet.getRange(rowNum, colAtualizado).setValue(agora);

  return resposta(true, { id: id, totalHoras: totalHoras }, 'Apontamento concluido.');
}

// ============================================
// EXCLUIR APONTAMENTO
// ============================================
function handleExcluirApontamento(body) {
  var id = body.id;
  if (!id) return resposta(false, null, 'ID obrigatorio.');
  var sheet = getSheet(SHEETS.APONTAMENTOS);
  var rowNum = findRowById(sheet, id);
  if (rowNum === -1) return resposta(false, null, 'Apontamento nao encontrado.');
  sheet.deleteRow(rowNum);
  return resposta(true, null, 'Apontamento excluido.');
}

// ============================================
// SALVAR CADASTRO
// ============================================
function handleSalvarCadastro(body) {
  var sheetName = body.sheet;
  var dados = body.dados;
  var validSheets = [SHEETS.COLABORADORES, SHEETS.VEICULOS, SHEETS.SITES, SHEETS.SERVICOS, SHEETS.USUARIOS];

  if (validSheets.indexOf(sheetName) === -1) return resposta(false, null, 'Aba invalida para cadastro.');

  var sheet = getSheet(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var agora = new Date().toISOString();

  if (dados.id) {
    var rowNum = findRowById(sheet, dados.id);
    if (rowNum === -1) return resposta(false, null, 'Registro nao encontrado.');
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i];
      if (h === 'id' || h === 'criadoEm') continue;
      if (h === 'senha' && dados.senha) {
        sheet.getRange(rowNum, i + 1).setValue(hashSenha(dados.senha));
      } else if (dados[h] !== undefined && dados[h] !== '') {
        sheet.getRange(rowNum, i + 1).setValue(dados[h]);
      }
    }
    return resposta(true, { id: dados.id }, 'Registro atualizado.');
  } else {
    var id = gerarId();
    var row = headers.map(function(h) {
      if (h === 'id') return id;
      if (h === 'criadoEm') return agora;
      if (h === 'status') return dados.status || 'ativo';
      if (h === 'senha') return dados.senha ? hashSenha(dados.senha) : '';
      return dados[h] || '';
    });
    sheet.appendRow(row);
    return resposta(true, { id: id }, 'Registro criado com sucesso.');
  }
}

// ============================================
// EXCLUIR CADASTRO
// ============================================
function handleExcluirCadastro(body) {
  var sheetName = body.sheet;
  var id = body.id;
  if (!sheetName || !id) return resposta(false, null, 'Parametros obrigatorios.');

  var sheet = getSheet(sheetName);
  var rowNum = findRowById(sheet, id);
  if (rowNum === -1) return resposta(false, null, 'Registro nao encontrado.');

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colStatus = headers.indexOf('status') + 1;
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
function handleGetDashboard(params) {
  var hoje = new Date().toISOString().slice(0, 10);
  var dataInicio = (params && params.dataInicio) ? params.dataInicio : hoje;
  var dataFim    = (params && params.dataFim)    ? params.dataFim    : hoje;

  var sheetPlan = getSheet(SHEETS.PLANEJAMENTOS);
  var sheetApt  = getSheet(SHEETS.APONTAMENTOS);
  var todosPlans = sheetPlan ? sheetToObjects(sheetPlan) : [];
  var todosApts  = sheetApt  ? sheetToObjects(sheetApt)  : [];

  var plans = todosPlans.filter(function(p) {
    var d = String(p.data).slice(0,10);
    return d >= dataInicio && d <= dataFim;
  });

  var apts = todosApts.filter(function(a) {
    var d = String(a.data).slice(0,10);
    return d >= dataInicio && d <= dataFim;
  });

  var concluidos   = plans.filter(function(p) { return p.status === 'concluido' || p.status === 'conforme'; }).length;
  var emExecucao   = plans.filter(function(p) { return p.status === 'em_execucao'; }).length;
  var planejados   = plans.filter(function(p) { return p.status === 'planejado'; }).length;
  var naoExec      = plans.filter(function(p) { return p.status === 'nao_executado'; }).length;
  var comAlteracao = plans.filter(function(p) { return p.status === 'alteracao'; }).length;

  var colsSet = {};
  plans.forEach(function(p) {
    if (p.colaboradoresIds) {
      p.colaboradoresIds.toString().split(',').forEach(function(id) {
        if (id.trim()) colsSet[id.trim()] = true;
      });
    }
  });

  var veisSet = {};
  plans.forEach(function(p) { if (p.veiculoId) veisSet[p.veiculoId] = true; });

  var horasTotaisMin = 0;
  apts.forEach(function(a) {
    if (a.horaInicio && a.horaFim) {
      var p1 = a.horaInicio.toString().split(':').map(Number);
      var p2 = a.horaFim.toString().split(':').map(Number);
      horasTotaisMin += (p2[0] * 60 + p2[1]) - (p1[0] * 60 + p1[1]);
    }
  });
  var horasTotais = Math.round(horasTotaisMin / 60 * 10) / 10;

  var porSiteMap = {};
  apts.forEach(function(a) {
    if (!porSiteMap[a.site]) porSiteMap[a.site] = 0;
    if (a.horaInicio && a.horaFim) {
      var p1 = a.horaInicio.toString().split(':').map(Number);
      var p2 = a.horaFim.toString().split(':').map(Number);
      porSiteMap[a.site] += Math.round(((p2[0]*60+p2[1])-(p1[0]*60+p1[1]))/60*10)/10;
    }
  });
  var porSite = Object.keys(porSiteMap).map(function(nome) {
    return { nome: nome, horas: porSiteMap[nome] };
  }).sort(function(a,b) { return b.horas - a.horas; }).slice(0,6);

  var porServicoMap = {};
  plans.forEach(function(p) {
    if (!porServicoMap[p.servico]) porServicoMap[p.servico] = 0;
    porServicoMap[p.servico]++;
  });
  var porServico = Object.keys(porServicoMap).map(function(nome) {
    return { nome: nome, qtd: porServicoMap[nome] };
  }).sort(function(a,b) { return b.qtd - a.qtd; }).slice(0,5);

  var semana = { labels: [], apontamentos: [], horas: [] };
  for (var i = 6; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    var dateStr = d.toISOString().slice(0,10);
    var label = d.toLocaleDateString('pt-BR', { weekday: 'short' });
    var doDia = todosPlans.filter(function(p) { return String(p.data).slice(0,10) === dateStr; });
    var aptsDia = todosApts.filter(function(a) { return String(a.data).slice(0,10) === dateStr; });
    var horasDia = 0;
    aptsDia.forEach(function(a) {
      if (a.horaInicio && a.horaFim) {
        var p1 = a.horaInicio.toString().split(':').map(Number);
        var p2 = a.horaFim.toString().split(':').map(Number);
        horasDia += Math.round(((p2[0]*60+p2[1])-(p1[0]*60+p1[1]))/60*10)/10;
      }
    });
    semana.labels.push(label);
    semana.apontamentos.push(doDia.length);
    semana.horas.push(horasDia);
  }

  var ultimosApontamentos = plans.slice(0,10).map(function(p) {
    return {
      colaborador: p.colaboradoresNomes || '',
      site: p.site || '',
      servico: p.servico || '',
      horaInicio: p.horaInicioPlano || '',
      horaFim: p.horaFimPlano || '',
      status: p.status || 'planejado',
      horaRegistro: ''
    };
  });

  return resposta(true, {
    totalHoje: plans.length,
    concluidos: concluidos,
    emAndamento: emExecucao,
    planejados: planejados,
    colaboradoresAtivos: Object.keys(colsSet).length,
    veiculosEmUso: Object.keys(veisSet).length,
    horasTotaisHoje: horasTotais,
    mediaHorasPorServico: apts.length > 0 ? Math.round(horasTotais / apts.length * 10) / 10 : 0,
    registrosAbertos: naoExec,
    comAlteracao: comAlteracao,
    porSite: porSite,
    porServico: porServico,
    semana: semana,
    ultimosApontamentos: ultimosApontamentos
  }, 'OK');
}

// ============================================
// RELATÓRIO
// ============================================
function handleGetRelatorio(params) {
  var sheetApt = getSheet(SHEETS.APONTAMENTOS);
  var data = sheetApt ? sheetToObjects(sheetApt) : [];

  if (params.dataInicio) data = data.filter(function(a) { return String(a.data).slice(0,10) >= params.dataInicio; });
  if (params.dataFim)    data = data.filter(function(a) { return String(a.data).slice(0,10) <= params.dataFim; });
  if (params.siteId)     data = data.filter(function(a) { return String(a.siteId) === params.siteId; });
  if (params.servicoId)  data = data.filter(function(a) { return String(a.servicoId) === params.servicoId; });
  if (params.status)     data = data.filter(function(a) { return a.statusConformidade === params.status; });

  data.sort(function(a,b) {
    var da = String(a.data) + String(a.horaInicio);
    var db = String(b.data) + String(b.horaInicio);
    return db.localeCompare(da);
  });

  var resultado = data.map(function(a) {
    var nomes = a.colaborador || '';
    try {
      if (a.colaboradoresJson) {
        nomes = JSON.parse(a.colaboradoresJson).map(function(c) { return c.nome; }).join(', ');
      }
    } catch(e) {}
    return {
      data: String(a.data).slice(0,10),
      colaborador: nomes,
      veiculo: a.veiculo || '',
      site: a.site || '',
      servico: a.servico || '',
      horaInicio: a.horaInicio || '',
      horaFim: a.horaFim || '',
      totalHoras: a.totalHoras || '--',
      horaRegistro: a.horaRegistro || '',
      conformidade: a.statusConformidade || '',
      observacao: a.observacao || ''
    };
  });

  return resposta(true, resultado, 'OK');
}

// ============================================
// TESTE / INICIALIZAÇÃO
// ============================================
function testarSistema() {
  Logger.log('=== S.P.A.D.O - SISTEMA DE PLANEJAMENTO E APONTAMENTO DIARIO OPERACIONAL ===');
  Logger.log('Inicializando planilha...');
  var resultado = inicializarPlanilha();
  Logger.log(resultado);
  Logger.log('Testando login Admin...');
  var loginAdmin = handleLogin({ usuario: 'admin', senha: 'admin123' });
  Logger.log(loginAdmin.getContent());
  Logger.log('=== SISTEMA PRONTO PARA USO! ===');
}