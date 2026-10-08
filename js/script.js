/* =========================================
   Painel de Vencimentos — lógica
   ========================================= */

// ---------- Tema claro / escuro ----------
function aplicarTema(tema) {
  document.documentElement.classList.toggle('dark', tema === 'escuro');
  try { localStorage.setItem('tema', tema); } catch (e) {}
}
function alternarTema() {
  const escuroAgora = document.documentElement.classList.contains('dark');
  aplicarTema(escuroAgora ? 'claro' : 'escuro');
}

// ---------- Datas ----------
const HOJE = new Date();
HOJE.setHours(0, 0, 0, 0);

function somarDias(n) {
  const d = new Date(HOJE);
  d.setDate(d.getDate() + n);
  return d;
}
const formatarData = d => d.toLocaleDateString('pt-BR');
const diasAte = d => Math.round((d - HOJE) / 86400000);

// ---------- Dados de exemplo ----------
// Só são carregados ao clicar em "Carregar exemplos". O painel abre vazio.
// As datas usam somarDias() para o exemplo ficar sempre "atual".
const EXEMPLO_CLIENTES = [
  { id: 1, nome: 'Alfa Comércio Ltda',         cnpj: '12.345.678/0001-90' },
  { id: 2, nome: 'Beta Indústria Metalúrgica', cnpj: '23.456.789/0001-01' },
  { id: 3, nome: 'Gama Serviços Médicos',      cnpj: '34.567.890/0001-12' },
  { id: 4, nome: 'Delta Imóveis',              cnpj: '45.678.901/0001-23' },
  { id: 5, nome: 'Épsilon Transportes',        cnpj: '56.789.012/0001-34' },
  { id: 6, nome: 'Zeta Alimentos ME',          cnpj: '67.890.123/0001-45' },
];

const EXEMPLO_DOCUMENTOS = [
  { cliente: 1, tipo: 'Certificado A1', vencimento: somarDias(5),   responsavel: 'Mauricio' },
  { cliente: 1, tipo: 'CND Federal',    vencimento: somarDias(22),  responsavel: 'Fiscal' },
  { cliente: 1, tipo: 'CRF FGTS',       vencimento: somarDias(12),  responsavel: 'DP' },
  { cliente: 2, tipo: 'Certificado A1', vencimento: somarDias(-3),  responsavel: 'Mauricio' },
  { cliente: 2, tipo: 'CND Estadual',   vencimento: somarDias(28),  responsavel: 'Fiscal' },
  { cliente: 2, tipo: 'Licença',        vencimento: somarDias(90),  responsavel: 'Legal' },
  { cliente: 3, tipo: 'Alvará',         vencimento: somarDias(14),  responsavel: 'Legal' },
  { cliente: 3, tipo: 'CND Municipal',  vencimento: somarDias(45),  responsavel: 'Fiscal' },
  { cliente: 3, tipo: 'Procuração',     vencimento: somarDias(7),   responsavel: 'Legal' },
  { cliente: 4, tipo: 'Certificado A1', vencimento: somarDias(120), responsavel: 'Mauricio' },
  { cliente: 4, tipo: 'CND Federal',    vencimento: somarDias(60),  responsavel: 'Fiscal' },
  { cliente: 5, tipo: 'CRF FGTS',       vencimento: somarDias(2),   responsavel: 'DP' },
  { cliente: 5, tipo: 'Alvará',         vencimento: somarDias(-10), responsavel: 'Legal' },
  { cliente: 5, tipo: 'Licença',        vencimento: somarDias(19),  responsavel: 'Legal' },
  { cliente: 6, tipo: 'CND Estadual',   vencimento: somarDias(9),   responsavel: 'Fiscal' },
  { cliente: 6, tipo: 'Procuração',     vencimento: somarDias(200), responsavel: 'Legal' },
];

// Tipo de documento → cor do marcador no chip
const TIPOS = {
  'Certificado A1': '#6366f1',
  'CND Federal':    '#0ea5e9',
  'CND Estadual':   '#14b8a6',
  'CND Municipal':  '#22c55e',
  'CRF FGTS':       '#f97316',
  'Alvará':         '#a855f7',
  'Procuração':     '#ec4899',
  'Licença':        '#eab308',
};

// ---------- Status ----------
const STATUS = {
  vencido: { rotulo: 'Vencido',      peso: 4 },
  '7':     { rotulo: 'Até 7 dias',   peso: 3 },
  '15':    { rotulo: '8 a 15 dias',  peso: 2 },
  '30':    { rotulo: '16 a 30 dias', peso: 1 },
  ok:      { rotulo: 'Em dia',       peso: 0 },
};

function classificar(dias) {
  if (dias < 0)   return 'vencido';
  if (dias <= 7)  return '7';
  if (dias <= 15) return '15';
  if (dias <= 30) return '30';
  return 'ok';
}

// ---------- Dados em uso (começam vazios) ----------
let CLIENTES = [];
let DOCUMENTOS = [];
let docs = [];

function montarDocs() {
  docs = DOCUMENTOS.map(d => {
    const cliente = CLIENTES.find(c => c.id === d.cliente);
    const dias = diasAte(d.vencimento);
    return { ...d, clienteNome: cliente.nome, cnpj: cliente.cnpj, dias, status: classificar(dias) };
  }).sort((a, b) => a.dias - b.dias);
}

function limparFiltros() {
  elBusca.value = '';
  elTipo.value = '';
  elPeriodo.value = '';
}

function carregarExemplos() {
  CLIENTES = EXEMPLO_CLIENTES.map(c => ({ ...c }));
  DOCUMENTOS = EXEMPLO_DOCUMENTOS.map(d => ({ ...d }));
  montarDocs();
  limparFiltros();
  atualizar();
}

function limparTudo() {
  if (!docs.length) return;
  if (!confirm('Remover todos os dados do painel?')) return;
  CLIENTES = [];
  DOCUMENTOS = [];
  docs = [];
  limparFiltros();
  atualizar();
}

// ---------- Utilidades visuais ----------
const CORES_AVATAR = ['#2563eb', '#7c3aed', '#db2777', '#0891b2', '#059669', '#d97706', '#4f46e5'];

function iniciais(nome) {
  return nome.split(' ').filter(p => p.length > 2).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}
function corAvatar(nome) {
  let h = 0;
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CORES_AVATAR[h % CORES_AVATAR.length];
}
function textoDias(dias) {
  if (dias < 0) return `${Math.abs(dias)}d atrás`;
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Amanhã';
  return `${dias} dias`;
}
// Quanto mais perto do vencimento, mais cheia a barra (janela de 30 dias)
function urgencia(dias) {
  if (dias < 0) return 100;
  return Math.max(4, Math.min(100, ((30 - dias) / 30) * 100));
}

// ---------- Elementos ----------
const $ = id => document.getElementById(id);
const elBusca = $('busca');
const elTipo = $('filtroTipo');
const elPeriodo = $('filtroPeriodo');

// ---------- Filtros ----------
function filtrar() {
  const termo = elBusca.value.trim().toLowerCase();
  const tipo = elTipo.value;
  const periodo = elPeriodo.value;
  return docs.filter(d =>
    (!termo || d.clienteNome.toLowerCase().includes(termo) || d.cnpj.includes(termo)) &&
    (!tipo || d.tipo === tipo) &&
    (!periodo || d.status === periodo)
  );
}

// ---------- Render: destaque + resumo ----------
function renderResumo() {
  const cont = { vencido: 0, '7': 0, '15': 0, '30': 0, ok: 0 };
  docs.forEach(d => cont[d.status]++);
  const total = docs.length || 1;

  const mapa = { vencido: 'Vencido', '7': '7', '15': '15', '30': '30', ok: 'Ok' };
  Object.entries(mapa).forEach(([st, sufixo]) => {
    $('qtd' + sufixo).textContent = cont[st];
    $('bar' + sufixo).style.width = (cont[st] / total * 100) + '%';
  });

  document.querySelectorAll('.card-resumo').forEach(card =>
    card.classList.toggle('ativo', card.dataset.periodo === elPeriodo.value));

  // Faixa de destaque
  const urgentes = cont.vencido + cont['7'];
  const destaque = document.querySelector('.destaque');
  destaque.classList.toggle('alerta', urgentes > 0);
  if (!docs.length) {
    $('tituloDestaque').textContent = 'Nenhum dado carregado';
    $('textoDestaque').textContent = 'Clique em "Carregar exemplos" para ver o painel funcionando.';
  } else if (cont.vencido > 0) {
    $('tituloDestaque').textContent = `${cont.vencido} documento${cont.vencido > 1 ? 's' : ''} vencido${cont.vencido > 1 ? 's' : ''}`;
    $('textoDestaque').textContent = `E mais ${cont['7']} vencendo nos próximos 7 dias. Priorize a renovação.`;
  } else if (cont['7'] > 0) {
    $('tituloDestaque').textContent = `${cont['7']} vencendo esta semana`;
    $('textoDestaque').textContent = 'Nenhum vencido, mas há documentos que precisam de atenção imediata.';
  } else {
    $('tituloDestaque').textContent = 'Tudo sob controle';
    $('textoDestaque').textContent = 'Nenhum documento vencido ou vencendo nos próximos 7 dias.';
  }
  $('totalClientes').textContent = CLIENTES.length;
  $('totalDocs').textContent = docs.length;
}

// ---------- Render: tabela ----------
function renderTabela(lista) {
  $('tabelaDocumentos').innerHTML = lista.map((d, i) => `
    <tr class="${d.status === 'vencido' ? 'linha-vencida' : ''}" style="animation-delay:${i * 25}ms">
      <td class="td">
        <div class="flex items-center gap-3">
          <span class="avatar" style="background:${corAvatar(d.clienteNome)}">${iniciais(d.clienteNome)}</span>
          <div>
            <div class="font-semibold">${d.clienteNome}</div>
            <div class="text-xs texto-suave">${d.cnpj}</div>
          </div>
        </div>
      </td>
      <td class="td">
        <span class="chip"><span class="w-2 h-2 rounded-full" style="background:${TIPOS[d.tipo]}"></span>${d.tipo}</span>
      </td>
      <td class="td texto-suave">${formatarData(d.vencimento)}</td>
      <td class="td">
        <div class="prazo">
          <div class="prazo-barra"><span class="bg-st-${d.status}" style="width:${urgencia(d.dias)}%"></span></div>
          <span class="prazo-texto txt-${d.status}">${textoDias(d.dias)}</span>
        </div>
      </td>
      <td class="td"><span class="selo selo-${d.status}">${STATUS[d.status].rotulo}</span></td>
      <td class="td texto-suave">${d.responsavel}</td>
    </tr>
  `).join('');
  $('semResultados').classList.toggle('hidden', lista.length > 0);
  $('textoVazio').textContent = docs.length
    ? 'Nenhum documento encontrado com esses filtros.'
    : 'Nenhum dado carregado ainda. Use "Carregar exemplos" para testar.';
}

// ---------- Render: cards por cliente ----------
function renderClientes(lista) {
  const porCliente = {};
  lista.forEach(d => (porCliente[d.cliente] ??= []).push(d));

  const cards = Object.values(porCliente).map(itens => {
    const pior = itens.reduce((a, b) => STATUS[b.status].peso > STATUS[a.status].peso ? b : a).status;
    return { itens, pior };
  }).sort((a, b) => STATUS[b.pior].peso - STATUS[a.pior].peso);

  if (!cards.length) {
    const msg = docs.length
      ? 'Nenhum cliente encontrado com esses filtros.'
      : 'Nenhum dado carregado ainda. Use "Carregar exemplos" para testar.';
    $('painelClientes').innerHTML = `<div class="painel vazio col-span-full">${msg}</div>`;
    return;
  }

  $('painelClientes').innerHTML = cards.map(({ itens, pior }, i) => {
    const nome = itens[0].clienteNome;
    return `
      <article class="card-cliente st-${pior}" style="animation-delay:${i * 50}ms">
        <div class="flex items-start justify-between gap-2 mb-4">
          <div class="flex items-center gap-3">
            <span class="avatar" style="background:${corAvatar(nome)}">${iniciais(nome)}</span>
            <div>
              <h3 class="font-semibold leading-tight">${nome}</h3>
              <p class="text-xs texto-suave">${itens[0].cnpj}</p>
            </div>
          </div>
          <span class="selo selo-${pior}">${STATUS[pior].rotulo}</span>
        </div>
        <ul class="space-y-2">
          ${itens.map(d => `
            <li class="item-doc">
              <span class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" style="background:${TIPOS[d.tipo]}"></span>${d.tipo}
              </span>
              <span class="flex items-center gap-2">
                <span class="text-xs texto-suave hidden sm:inline">${formatarData(d.vencimento)}</span>
                <span class="selo selo-${d.status}">${textoDias(d.dias)}</span>
              </span>
            </li>
          `).join('')}
        </ul>
      </article>`;
  }).join('');
}

// ---------- Atualizar tudo ----------
function atualizar() {
  const lista = filtrar();
  renderResumo();
  renderTabela(lista);
  renderClientes(lista);
  $('contador').textContent = docs.length ? `${lista.length} de ${docs.length} documentos` : '';
  $('btnLimparTudo').disabled = !docs.length;
}

// ---------- Eventos ----------
function iniciar() {
  $('dataHoje').textContent = HOJE.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  Object.keys(TIPOS).forEach(t => elTipo.insertAdjacentHTML('beforeend', `<option value="${t}">${t}</option>`));

  $('btnTema').addEventListener('click', alternarTema);
  $('btnExemplos').addEventListener('click', carregarExemplos);
  $('btnLimparTudo').addEventListener('click', limparTudo);

  elBusca.addEventListener('input', atualizar);
  elTipo.addEventListener('change', atualizar);
  elPeriodo.addEventListener('change', atualizar);

  // Cards de resumo = filtro rápido (clicar de novo desmarca)
  document.querySelectorAll('.card-resumo').forEach(card => {
    card.addEventListener('click', () => {
      elPeriodo.value = elPeriodo.value === card.dataset.periodo ? '' : card.dataset.periodo;
      atualizar();
    });
  });

  // Abas
  document.querySelectorAll('.aba').forEach(aba => {
    aba.addEventListener('click', () => {
      document.querySelectorAll('.aba').forEach(a => a.classList.remove('aba-ativa'));
      aba.classList.add('aba-ativa');
      const porCliente = aba.dataset.aba === 'clientes';
      $('painelDocumentos').classList.toggle('hidden', porCliente);
      $('painelClientes').classList.toggle('hidden', !porCliente);
    });
  });

  $('limparFiltros').addEventListener('click', () => {
    limparFiltros();
    atualizar();
  });

  atualizar();
}

document.addEventListener('DOMContentLoaded', iniciar);
