/* =========================================
   Painel de Vencimentos — lógica (Fase 1)
   - Cadastro de clientes e documentos
   - Salvamento automático no navegador (localStorage)
   - Importação de planilha (Excel/CSV) e modelo
   - Backup em JSON (exportar / restaurar)
   ========================================= */

// =========================================================
// Tema claro / escuro
// =========================================================
function aplicarTema(tema) {
  document.documentElement.classList.toggle('dark', tema === 'escuro');
  try { localStorage.setItem('tema', tema); } catch (e) {}
}
function alternarTema() {
  aplicarTema(document.documentElement.classList.contains('dark') ? 'claro' : 'escuro');
}

// =========================================================
// Utilidades gerais
// =========================================================
const $ = id => document.getElementById(id);

// Escapa texto antes de inserir no HTML (proteção contra dados maliciosos em planilhas)
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const soDigitos = s => String(s ?? '').replace(/\D/g, '');
const semAcento = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const gerarId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// =========================================================
// Datas (guardadas como texto "AAAA-MM-DD")
// =========================================================
const HOJE = new Date();
HOJE.setHours(0, 0, 0, 0);

function paraISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function deISO(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}
function somarDiasISO(n) {
  const d = new Date(HOJE);
  d.setDate(d.getDate() + n);
  return paraISO(d);
}
const formatarData = iso => iso ? deISO(iso).toLocaleDateString('pt-BR') : '—';
const diasAte = iso => Math.round((deISO(iso) - HOJE) / 86400000);
const isoValido = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

// =========================================================
// CNPJ / CPF / Telefone
// =========================================================
function digitoCNPJ(nums) {
  const pesos = nums.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const soma = nums.split('').reduce((a, n, i) => a + Number(n) * pesos[i], 0);
  const r = soma % 11;
  return r < 2 ? 0 : 11 - r;
}
function completarCNPJ(base12) {
  const b = base12 + digitoCNPJ(base12);
  return b + digitoCNPJ(b);
}
function validarCNPJ(v) {
  const c = soDigitos(v);
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  return completarCNPJ(c.slice(0, 12)) === c;
}
function validarCPF(v) {
  const c = soDigitos(v);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  const dv = n => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}
function validarDocumento(v) {
  const d = soDigitos(v);
  if (d.length === 11) return validarCPF(d);
  if (d.length === 14) return validarCNPJ(d);
  return false;
}
function formatarDocumento(v) {
  const d = soDigitos(v).slice(0, 14);
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d.replace(/^(\d{2})(\d)/, '$1.$2')
          .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
          .replace(/\.(\d{3})(\d)/, '.$1/$2')
          .replace(/(\d{4})(\d)/, '$1-$2');
}
function formatarTelefone(v) {
  const d = soDigitos(v).slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// =========================================================
// Tabelas fixas: tipos, regimes, status
// =========================================================
// Tipo de documento → cor do marcador
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

const REGIMES = ['Simples Nacional', 'MEI', 'Lucro Presumido', 'Lucro Real', 'Pessoa Física', 'Imune/Isenta', 'Outro'];

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

// =========================================================
// Estado e armazenamento (localStorage)
// =========================================================
const CHAVE = 'painelVencimentos:v1';
let estado = { clientes: [], documentos: [] };
let docs = [];             // documentos "enriquecidos" (cliente, dias, status)
let abaAtual = 'documentos';

function carregarDados() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return;
    const dados = JSON.parse(bruto);
    if (Array.isArray(dados.clientes) && Array.isArray(dados.documentos)) {
      estado = { clientes: dados.clientes, documentos: dados.documentos };
    }
  } catch (e) {
    console.warn('Não foi possível ler os dados salvos.', e);
  }
}

function salvarDados() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
    return true;
  } catch (e) {
    toast('Não foi possível salvar no navegador.', 'erro');
    return false;
  }
}

function salvarEAtualizar() {
  salvarDados();
  atualizar();
}

function montarDocs() {
  const mapa = new Map(estado.clientes.map(c => [c.id, c]));
  docs = estado.documentos
    .filter(d => mapa.has(d.clienteId) && isoValido(d.vencimento))
    .map(d => {
      const dias = diasAte(d.vencimento);
      return { ...d, cliente: mapa.get(d.clienteId), dias, status: classificar(dias) };
    })
    .sort((a, b) => a.dias - b.dias);
}

// =========================================================
// Dados de exemplo (só entram ao clicar em "Carregar exemplos")
// =========================================================
function dadosExemplo() {
  const cli = (n, nome, base, regime, contato, email, telefone) => ({
    id: 'ex-c' + n, nome, documento: formatarDocumento(completarCNPJ(base)), regime, contato, email, telefone,
  });
  const clientes = [
    cli(1, 'Alfa Comércio Ltda',         '123456780001', 'Simples Nacional', 'Ana',     'contato@alfacomercio.com.br', '(48) 99911-2233'),
    cli(2, 'Beta Indústria Metalúrgica', '234567890001', 'Lucro Presumido',  'Bruno',   'fiscal@betametal.com.br',     '(48) 3622-1100'),
    cli(3, 'Gama Serviços Médicos',      '345678900001', 'Lucro Presumido',  'Carla',   'adm@gamasaude.com.br',        '(48) 99822-3344'),
    cli(4, 'Delta Imóveis',              '456789010001', 'Lucro Real',       'Diego',   'financeiro@deltaimoveis.com', '(48) 3626-4455'),
    cli(5, 'Épsilon Transportes',        '567890120001', 'Simples Nacional', 'Elisa',   'elisa@epsilonlog.com.br',     '(48) 99733-5566'),
    cli(6, 'Zeta Alimentos ME',          '678901230001', 'MEI',              'Fábio',   'zetaalimentos@gmail.com',     '(48) 99644-6677'),
  ];
  const doc = (n, c, tipo, dias, responsavel, numero = '') => ({
    id: 'ex-d' + n, clienteId: 'ex-c' + c, tipo, numero, emissao: '', vencimento: somarDiasISO(dias), responsavel, observacoes: '',
  });
  const documentos = [
    doc(1, 1, 'Certificado A1', 5, 'Mauricio'),  doc(2, 1, 'CND Federal', 22, 'Fiscal'),   doc(3, 1, 'CRF FGTS', 12, 'DP'),
    doc(4, 2, 'Certificado A1', -3, 'Mauricio'), doc(5, 2, 'CND Estadual', 28, 'Fiscal'),  doc(6, 2, 'Licença', 90, 'Legal'),
    doc(7, 3, 'Alvará', 14, 'Legal'),            doc(8, 3, 'CND Municipal', 45, 'Fiscal'), doc(9, 3, 'Procuração', 7, 'Legal'),
    doc(10, 4, 'Certificado A1', 120, 'Mauricio'), doc(11, 4, 'CND Federal', 60, 'Fiscal'),
    doc(12, 5, 'CRF FGTS', 2, 'DP'),             doc(13, 5, 'Alvará', -10, 'Legal'),       doc(14, 5, 'Licença', 19, 'Legal'),
    doc(15, 6, 'CND Estadual', 9, 'Fiscal'),     doc(16, 6, 'Procuração', 200, 'Legal'),
  ];
  return { clientes, documentos };
}

function carregarExemplos() {
  if (estado.clientes.length && !confirm('Isso vai substituir os dados atuais pelos exemplos. Continuar?')) return;
  estado = dadosExemplo();
  limparFiltros();
  salvarEAtualizar();
  toast('Exemplos carregados.');
}

function limparTudo() {
  if (!estado.clientes.length && !estado.documentos.length) { toast('O painel já está vazio.', 'aviso'); return; }
  if (!confirm('Remover TODOS os clientes e documentos? Considere exportar um backup antes.')) return;
  estado = { clientes: [], documentos: [] };
  limparFiltros();
  salvarEAtualizar();
  toast('Todos os dados foram removidos.');
}

// =========================================================
// Utilidades visuais
// =========================================================
const CORES_AVATAR = ['#2563eb', '#7c3aed', '#db2777', '#0891b2', '#059669', '#d97706', '#4f46e5'];

function iniciais(nome) {
  const partes = String(nome).split(/\s+/).filter(p => p.length > 2);
  return (partes.length ? partes : [String(nome)]).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}
function corAvatar(nome) {
  let h = 0;
  for (const c of String(nome)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
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

const ICONES = {
  editar:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  excluir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
  mais:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="w-4 h-4"><path d="M12 5v14M5 12h14"/></svg>',
};

function avatarHTML(nome) {
  return `<span class="avatar" style="background:${corAvatar(nome)}">${esc(iniciais(nome))}</span>`;
}

// =========================================================
// Notificações (toasts)
// =========================================================
function toast(mensagem, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = `toast toast-${tipo}`;
  el.textContent = mensagem;
  const caixa = $('toasts');
  caixa.appendChild(el);
  while (caixa.children.length > 3) caixa.firstElementChild.remove(); // no máximo 3 na tela
  setTimeout(() => {
    el.classList.add('saindo');
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

// =========================================================
// Filtros
// =========================================================
const elBusca = $('busca');
const elTipo = $('filtroTipo');
const elPeriodo = $('filtroPeriodo');

function limparFiltros() {
  elBusca.value = '';
  elTipo.value = '';
  elPeriodo.value = '';
}

function clienteCombina(cliente, termo) {
  if (!termo) return true;
  const t = semAcento(termo).toLowerCase();
  const tDig = soDigitos(termo);
  return semAcento(cliente.nome).toLowerCase().includes(t) ||
         (tDig.length > 0 && soDigitos(cliente.documento).includes(tDig));
}

function filtrar() {
  const termo = elBusca.value.trim();
  const tipo = elTipo.value;
  const periodo = elPeriodo.value;
  return docs.filter(d =>
    clienteCombina(d.cliente, termo) &&
    (!tipo || d.tipo === tipo) &&
    (!periodo || d.status === periodo)
  );
}

// =========================================================
// Render: destaque + cards de resumo
// =========================================================
function renderResumo() {
  const cont = { vencido: 0, '7': 0, '15': 0, '30': 0, ok: 0 };
  docs.forEach(d => cont[d.status]++);
  const total = docs.length || 1;

  const sufixos = { vencido: 'Vencido', '7': '7', '15': '15', '30': '30', ok: 'Ok' };
  Object.entries(sufixos).forEach(([st, suf]) => {
    $('qtd' + suf).textContent = cont[st];
    $('bar' + suf).style.width = (cont[st] / total * 100) + '%';
  });

  document.querySelectorAll('.card-resumo').forEach(card =>
    card.classList.toggle('ativo', card.dataset.periodo === elPeriodo.value));

  const vazio = !estado.clientes.length;
  const destaque = document.querySelector('.destaque');
  destaque.classList.toggle('alerta', cont.vencido + cont['7'] > 0);
  $('acoesVazio').classList.toggle('hidden', !vazio);

  if (vazio) {
    $('tituloDestaque').textContent = 'Comece cadastrando seus clientes';
    $('textoDestaque').textContent = 'Cadastre manualmente, importe uma planilha ou carregue os exemplos para testar.';
  } else if (!docs.length) {
    $('tituloDestaque').textContent = 'Nenhum documento cadastrado';
    $('textoDestaque').textContent = 'Clique em "Documento" para registrar o primeiro vencimento.';
  } else if (cont.vencido > 0) {
    const s = cont.vencido > 1 ? 's' : '';
    $('tituloDestaque').textContent = `${cont.vencido} documento${s} vencido${s}`;
    $('textoDestaque').textContent = `E mais ${cont['7']} vencendo nos próximos 7 dias. Priorize a renovação.`;
  } else if (cont['7'] > 0) {
    $('tituloDestaque').textContent = `${cont['7']} vencendo esta semana`;
    $('textoDestaque').textContent = 'Nenhum vencido, mas há documentos que precisam de atenção imediata.';
  } else {
    $('tituloDestaque').textContent = 'Tudo sob controle';
    $('textoDestaque').textContent = 'Nenhum documento vencido ou vencendo nos próximos 7 dias.';
  }
  $('totalClientes').textContent = estado.clientes.length;
  $('totalDocs').textContent = docs.length;
}

// =========================================================
// Render: aba Vencimentos (tabela por documento)
// =========================================================
function renderTabela(lista) {
  $('tabelaDocumentos').innerHTML = lista.map((d, i) => `
    <tr class="${d.status === 'vencido' ? 'linha-vencida' : ''}" style="animation-delay:${Math.min(i, 20) * 25}ms">
      <td class="td">
        <div class="flex items-center gap-3">
          ${avatarHTML(d.cliente.nome)}
          <div>
            <div class="font-semibold">${esc(d.cliente.nome)}</div>
            <div class="text-xs texto-suave">${esc(d.cliente.documento) || '—'}</div>
          </div>
        </div>
      </td>
      <td class="td">
        <span class="chip"><span class="w-2 h-2 rounded-full" style="background:${TIPOS[d.tipo] || '#94a3b8'}"></span>${esc(d.tipo)}</span>
        ${d.numero ? `<div class="text-xs texto-suave mt-1">Nº ${esc(d.numero)}</div>` : ''}
      </td>
      <td class="td texto-suave">${formatarData(d.vencimento)}</td>
      <td class="td">
        <div class="prazo">
          <div class="prazo-barra"><span class="bg-st-${d.status}" style="width:${urgencia(d.dias)}%"></span></div>
          <span class="prazo-texto txt-${d.status}">${textoDias(d.dias)}</span>
        </div>
      </td>
      <td class="td"><span class="selo selo-${d.status}">${STATUS[d.status].rotulo}</span></td>
      <td class="td texto-suave">${esc(d.responsavel) || '—'}</td>
      <td class="td">
        <div class="flex justify-end gap-1">
          <button class="acao" data-acao="editar-doc" data-id="${esc(d.id)}" title="Editar documento" aria-label="Editar">${ICONES.editar}</button>
          <button class="acao acao-perigo" data-acao="excluir-doc" data-id="${esc(d.id)}" title="Excluir documento" aria-label="Excluir">${ICONES.excluir}</button>
        </div>
      </td>
    </tr>
  `).join('');

  $('semResultados').classList.toggle('hidden', lista.length > 0);
  $('textoVazio').textContent = !estado.clientes.length
    ? 'Nenhum dado ainda. Cadastre um cliente, importe uma planilha ou carregue os exemplos.'
    : !docs.length
      ? 'Nenhum documento cadastrado ainda.'
      : 'Nenhum documento encontrado com esses filtros.';
}

// =========================================================
// Render: aba Por cliente (cards)
// =========================================================
function renderClientes(lista) {
  const porCliente = new Map();
  lista.forEach(d => {
    if (!porCliente.has(d.clienteId)) porCliente.set(d.clienteId, []);
    porCliente.get(d.clienteId).push(d);
  });

  const cards = [...porCliente.values()].map(itens => {
    const pior = itens.reduce((a, b) => STATUS[b.status].peso > STATUS[a.status].peso ? b : a).status;
    return { itens, pior, cliente: itens[0].cliente };
  }).sort((a, b) => STATUS[b.pior].peso - STATUS[a.pior].peso || a.cliente.nome.localeCompare(b.cliente.nome, 'pt-BR'));

  if (!cards.length) {
    const msg = !estado.clientes.length
      ? 'Nenhum dado ainda. Cadastre um cliente, importe uma planilha ou carregue os exemplos.'
      : 'Nenhum cliente com documentos para esses filtros.';
    $('painelClientes').innerHTML = `<div class="painel vazio col-span-full">${msg}</div>`;
    return;
  }

  $('painelClientes').innerHTML = cards.map(({ itens, pior, cliente }, i) => `
    <article class="card-cliente st-${pior}" style="animation-delay:${Math.min(i, 12) * 50}ms">
      <div class="flex items-start justify-between gap-2 mb-4">
        <div class="flex items-center gap-3 min-w-0">
          ${avatarHTML(cliente.nome)}
          <div class="min-w-0">
            <h3 class="font-semibold leading-tight truncate">${esc(cliente.nome)}</h3>
            <p class="text-xs texto-suave">${esc(cliente.documento) || '—'}</p>
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <span class="selo selo-${pior}">${STATUS[pior].rotulo}</span>
          <button class="acao" data-acao="editar-cli" data-id="${esc(cliente.id)}" title="Editar cliente" aria-label="Editar cliente">${ICONES.editar}</button>
        </div>
      </div>
      <ul class="space-y-2">
        ${itens.map(d => `
          <li class="item-doc item-clicavel" data-acao="editar-doc" data-id="${esc(d.id)}" title="Editar documento">
            <span class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full" style="background:${TIPOS[d.tipo] || '#94a3b8'}"></span>${esc(d.tipo)}
            </span>
            <span class="flex items-center gap-2">
              <span class="text-xs texto-suave hidden sm:inline">${formatarData(d.vencimento)}</span>
              <span class="selo selo-${d.status}">${textoDias(d.dias)}</span>
            </span>
          </li>
        `).join('')}
      </ul>
      <button class="link text-xs mt-3" data-acao="novo-doc-cli" data-id="${esc(cliente.id)}">+ Adicionar documento</button>
    </article>
  `).join('');
}

// =========================================================
// Render: aba Clientes (cadastro)
// =========================================================
function renderCadastro() {
  const termo = elBusca.value.trim();
  const lista = estado.clientes
    .filter(c => clienteCombina(c, termo))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  $('tabelaCadastro').innerHTML = lista.map((c, i) => {
    const seus = docs.filter(d => d.clienteId === c.id);
    const pior = seus.length
      ? seus.reduce((a, b) => STATUS[b.status].peso > STATUS[a.status].peso ? b : a).status
      : null;
    const contato = [c.contato, c.email, c.telefone].filter(Boolean);
    return `
      <tr style="animation-delay:${Math.min(i, 20) * 25}ms">
        <td class="td">
          <div class="flex items-center gap-3">
            ${avatarHTML(c.nome)}
            <div>
              <div class="font-semibold">${esc(c.nome)}</div>
              <div class="text-xs texto-suave">${esc(c.documento) || 'Sem documento'}</div>
            </div>
          </div>
        </td>
        <td class="td texto-suave">${esc(c.regime) || '—'}</td>
        <td class="td texto-suave text-xs leading-relaxed">${contato.length ? contato.map(esc).join('<br>') : '—'}</td>
        <td class="td">
          <div class="flex items-center gap-2">
            <span class="font-semibold">${seus.length}</span>
            ${pior ? `<span class="selo selo-${pior}">${STATUS[pior].rotulo}</span>` : '<span class="texto-suave text-xs">nenhum</span>'}
          </div>
        </td>
        <td class="td">
          <div class="flex justify-end gap-1">
            <button class="acao" data-acao="novo-doc-cli" data-id="${esc(c.id)}" title="Adicionar documento" aria-label="Adicionar documento">${ICONES.mais}</button>
            <button class="acao" data-acao="editar-cli" data-id="${esc(c.id)}" title="Editar cliente" aria-label="Editar">${ICONES.editar}</button>
            <button class="acao acao-perigo" data-acao="excluir-cli" data-id="${esc(c.id)}" title="Excluir cliente" aria-label="Excluir">${ICONES.excluir}</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  const vazio = $('cadastroVazio');
  vazio.classList.toggle('hidden', lista.length > 0);
  vazio.textContent = estado.clientes.length
    ? 'Nenhum cliente encontrado com essa busca.'
    : 'Nenhum cliente cadastrado ainda. Clique em "Cliente" no topo para começar.';
  return lista.length;
}

// =========================================================
// Atualizar tudo
// =========================================================
function atualizar() {
  montarDocs();
  const lista = filtrar();
  renderResumo();
  renderTabela(lista);
  renderClientes(lista);
  const qtdClientes = renderCadastro();

  if (abaAtual === 'cadastro') {
    $('contador').textContent = estado.clientes.length ? `${qtdClientes} de ${estado.clientes.length} clientes` : '';
  } else {
    $('contador').textContent = docs.length ? `${lista.length} de ${docs.length} documentos` : '';
  }
}

function trocarAba(nome) {
  abaAtual = nome;
  document.querySelectorAll('.aba').forEach(a => a.classList.toggle('aba-ativa', a.dataset.aba === nome));
  $('painelDocumentos').classList.toggle('hidden', nome !== 'documentos');
  $('painelClientes').classList.toggle('hidden', nome !== 'clientes');
  $('painelCadastro').classList.toggle('hidden', nome !== 'cadastro');
  atualizar();
}

// =========================================================
// Formulários: erros
// =========================================================
function mostrarErro(campoId, mensagem) {
  $(campoId).classList.add('invalido');
  const p = $('erro-' + campoId);
  if (p) p.textContent = mensagem;
}
function limparErros(form) {
  form.querySelectorAll('.erro').forEach(p => (p.textContent = ''));
  form.querySelectorAll('.invalido').forEach(c => c.classList.remove('invalido'));
}
function focarPrimeiroErro(form) {
  const campo = form.querySelector('.invalido');
  if (campo) campo.focus();
}

// =========================================================
// Cliente: cadastrar / editar / excluir
// =========================================================
let clienteEditando = null;
let voltarParaDocumento = false;

function abrirCliente(id = null, { doDocumento = false } = {}) {
  clienteEditando = id;
  voltarParaDocumento = doDocumento;
  const c = id ? estado.clientes.find(x => x.id === id) : null;
  if (id && !c) return;

  $('tituloCliente').textContent = c ? 'Editar cliente' : 'Novo cliente';
  $('cliNome').value = c?.nome || '';
  $('cliDoc').value = c?.documento || '';
  $('cliRegime').value = REGIMES.includes(c?.regime) ? c.regime : '';
  $('cliContato').value = c?.contato || '';
  $('cliEmail').value = c?.email || '';
  $('cliTelefone').value = c?.telefone || '';
  limparErros($('formCliente'));
  $('dlgCliente').showModal();
  $('cliNome').focus();
}

function salvarCliente(e) {
  e.preventDefault();
  const form = $('formCliente');
  limparErros(form);

  const dados = {
    nome: $('cliNome').value.trim().replace(/\s+/g, ' '),
    documento: formatarDocumento($('cliDoc').value),
    regime: $('cliRegime').value,
    contato: $('cliContato').value.trim(),
    email: $('cliEmail').value.trim(),
    telefone: formatarTelefone($('cliTelefone').value),
  };
  const dig = soDigitos(dados.documento);

  if (!dados.nome) mostrarErro('cliNome', 'Informe o nome ou razão social.');
  if (!dig) mostrarErro('cliDoc', 'Informe o CNPJ ou CPF.');
  else if (!validarDocumento(dig)) mostrarErro('cliDoc', dig.length === 11 ? 'CPF inválido.' : dig.length === 14 ? 'CNPJ inválido.' : 'Digite 11 (CPF) ou 14 (CNPJ) números.');
  else if (estado.clientes.some(c => c.id !== clienteEditando && soDigitos(c.documento) === dig)) mostrarErro('cliDoc', 'Já existe um cliente com esse documento.');
  if (dados.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) mostrarErro('cliEmail', 'E-mail inválido.');

  if (form.querySelector('.invalido')) { focarPrimeiroErro(form); return; }

  let id = clienteEditando;
  if (id) {
    Object.assign(estado.clientes.find(c => c.id === id), dados);
    toast('Cliente atualizado.');
  } else {
    id = gerarId();
    estado.clientes.push({ id, ...dados });
    toast('Cliente cadastrado.');
  }
  salvarEAtualizar();
  $('dlgCliente').close();

  // Se veio do formulário de documento, já seleciona o cliente criado
  if (voltarParaDocumento) {
    preencherSelectClientes();
    $('docCliente').value = id;
    limparErrosCampo('docCliente');
  }
}

function excluirCliente(id) {
  const c = estado.clientes.find(x => x.id === id);
  if (!c) return;
  const qtd = estado.documentos.filter(d => d.clienteId === id).length;
  const msg = qtd
    ? `Excluir "${c.nome}" e ${qtd === 1 ? 'o documento vinculado' : `os ${qtd} documentos vinculados`}?`
    : `Excluir "${c.nome}"?`;
  if (!confirm(msg)) return;
  estado.clientes = estado.clientes.filter(x => x.id !== id);
  estado.documentos = estado.documentos.filter(d => d.clienteId !== id);
  salvarEAtualizar();
  toast('Cliente excluído.');
}

// =========================================================
// Documento: cadastrar / editar / excluir
// =========================================================
let docEditando = null;

function limparErrosCampo(id) {
  $(id).classList.remove('invalido');
  const p = $('erro-' + id);
  if (p) p.textContent = '';
}

function preencherSelectClientes() {
  const sel = $('docCliente');
  const atual = sel.value;
  const ordenados = [...estado.clientes].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  sel.innerHTML = `<option value="">${ordenados.length ? 'Selecione o cliente...' : 'Nenhum cliente — cadastre um primeiro'}</option>` +
    ordenados.map(c => `<option value="${esc(c.id)}">${esc(c.nome)}${c.documento ? ' — ' + esc(c.documento) : ''}</option>`).join('');
  sel.value = atual;
}

function preencherResponsaveis() {
  const nomes = new Set(['Fiscal', 'DP', 'Legal', 'Contábil']);
  estado.documentos.forEach(d => d.responsavel && nomes.add(d.responsavel));
  $('listaResponsaveis').innerHTML = [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map(n => `<option value="${esc(n)}"></option>`).join('');
}

function atualizarPrevia() {
  const v = $('docVencimento').value;
  const el = $('docPrevia');
  if (!isoValido(v)) { el.innerHTML = ''; return; }
  const dias = diasAte(v);
  const st = classificar(dias);
  el.innerHTML = `<div class="flex items-center gap-2 text-sm"><span class="selo selo-${st}">${STATUS[st].rotulo}</span><span class="texto-suave">${dias < 0 ? 'venceu há ' + Math.abs(dias) + ' dia(s)' : dias === 0 ? 'vence hoje' : 'vence em ' + dias + ' dia(s)'}</span></div>`;
}

function abrirDocumento(id = null, clienteId = '') {
  docEditando = id;
  const d = id ? estado.documentos.find(x => x.id === id) : null;
  if (id && !d) return;

  preencherSelectClientes();
  preencherResponsaveis();
  $('tituloDocumento').textContent = d ? 'Editar documento' : 'Novo documento';
  $('docCliente').value = d?.clienteId || clienteId || '';
  $('docTipo').value = d?.tipo || '';
  $('docNumero').value = d?.numero || '';
  $('docEmissao').value = d?.emissao || '';
  $('docVencimento').value = d?.vencimento || '';
  $('docResponsavel').value = d?.responsavel || '';
  $('docObs').value = d?.observacoes || '';
  limparErros($('formDocumento'));
  atualizarPrevia();
  $('dlgDocumento').showModal();
  ($('docCliente').value ? $('docTipo') : $('docCliente')).focus();
}

function salvarDocumento(e) {
  e.preventDefault();
  const form = $('formDocumento');
  limparErros(form);

  const dados = {
    clienteId: $('docCliente').value,
    tipo: $('docTipo').value,
    numero: $('docNumero').value.trim(),
    emissao: $('docEmissao').value,
    vencimento: $('docVencimento').value,
    responsavel: $('docResponsavel').value.trim(),
    observacoes: $('docObs').value.trim(),
  };

  if (!dados.clienteId) mostrarErro('docCliente', 'Selecione o cliente.');
  if (!dados.tipo) mostrarErro('docTipo', 'Selecione o tipo.');
  if (!isoValido(dados.vencimento)) mostrarErro('docVencimento', 'Informe a data de vencimento.');
  if (dados.emissao && !isoValido(dados.emissao)) mostrarErro('docEmissao', 'Data inválida.');
  if (isoValido(dados.emissao) && isoValido(dados.vencimento) && dados.emissao > dados.vencimento) {
    mostrarErro('docEmissao', 'A emissão não pode ser depois do vencimento.');
  }
  if (!form.querySelector('.invalido') && estado.documentos.some(d =>
      d.id !== docEditando && d.clienteId === dados.clienteId && d.tipo === dados.tipo && d.vencimento === dados.vencimento)) {
    mostrarErro('docVencimento', 'Esse cliente já tem esse documento com essa data.');
  }

  if (form.querySelector('.invalido')) { focarPrimeiroErro(form); return; }

  if (docEditando) {
    Object.assign(estado.documentos.find(d => d.id === docEditando), dados);
    toast('Documento atualizado.');
  } else {
    estado.documentos.push({ id: gerarId(), ...dados });
    toast('Documento cadastrado.');
  }
  salvarEAtualizar();
  $('dlgDocumento').close();
}

function excluirDocumento(id) {
  const d = estado.documentos.find(x => x.id === id);
  if (!d) return;
  const c = estado.clientes.find(x => x.id === d.clienteId);
  if (!confirm(`Excluir "${d.tipo}" de ${c ? c.nome : 'cliente desconhecido'} (vence ${formatarData(d.vencimento)})?`)) return;
  estado.documentos = estado.documentos.filter(x => x.id !== id);
  salvarEAtualizar();
  toast('Documento excluído.');
}

// =========================================================
// Importação de planilha (Excel / CSV)
// =========================================================
// Nomes de coluna aceitos (sem acento, minúsculos)
const COLUNAS = {
  cliente:     ['cliente', 'nome', 'razao social', 'empresa', 'nome do cliente'],
  documento:   ['cnpj/cpf', 'cpf/cnpj', 'cnpj', 'cpf', 'cnpj ou cpf', 'documento do cliente'],
  tipo:        ['tipo', 'tipo de documento', 'documento'],
  vencimento:  ['vencimento', 'validade', 'data de vencimento', 'vence em', 'data vencimento'],
  numero:      ['numero', 'n', 'no', 'n.', 'n°', 'nº', 'identificacao'],
  emissao:     ['emissao', 'data de emissao', 'data emissao'],
  responsavel: ['responsavel'],
  observacoes: ['observacoes', 'observacao', 'obs'],
  regime:      ['regime', 'regime tributario'],
  email:       ['email', 'e-mail'],
  telefone:    ['telefone', 'fone', 'celular', 'whatsapp'],
  contato:     ['contato', 'pessoa de contato'],
};

const normalizarCabecalho = h => semAcento(h).toLowerCase().trim().replace(/\s+/g, ' ');

function normalizarTipo(valor) {
  const t = semAcento(valor).toLowerCase();
  if (!t.trim()) return null;
  if (/certific|\ba1\b|e-?cnpj|e-?cpf/.test(t)) return 'Certificado A1';
  if (/fgts|\bcrf\b/.test(t)) return 'CRF FGTS';
  if (/federal|receita|pgfn/.test(t)) return 'CND Federal';
  if (/estadual|sefaz|\bsef\b/.test(t)) return 'CND Estadual';
  if (/municipal|prefeitura/.test(t)) return 'CND Municipal';
  if (/alvara/.test(t)) return 'Alvará';
  if (/procura/.test(t)) return 'Procuração';
  if (/licen/.test(t)) return 'Licença';
  return null;
}

function normalizarRegime(valor) {
  const t = semAcento(valor).toLowerCase().trim();
  if (!t) return '';
  return REGIMES.find(r => semAcento(r).toLowerCase() === t) ||
         (/simples/.test(t) ? 'Simples Nacional' : /presumido/.test(t) ? 'Lucro Presumido' : /real/.test(t) ? 'Lucro Real' : /\bmei\b/.test(t) ? 'MEI' : 'Outro');
}

function dataDeAMD(a, m, d) {
  const dt = new Date(a, m - 1, d);
  if (dt.getFullYear() !== a || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return paraISO(dt);
}

// Retorna "AAAA-MM-DD", "" (vazio) ou null (inválida)
function lerData(valor) {
  if (valor === '' || valor == null) return '';
  if (typeof valor === 'number') {
    const p = XLSX.SSF.parse_date_code(valor);
    return p ? dataDeAMD(p.y, p.m, p.d) : null;
  }
  if (valor instanceof Date) return paraISO(valor);
  const s = String(valor).trim();
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return dataDeAMD(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/))) {
    let ano = +m[3];
    if (ano < 100) ano += 2000;
    return dataDeAMD(ano, +m[2], +m[1]);
  }
  return null;
}

function bibliotecaPlanilhaOk() {
  if (typeof XLSX !== 'undefined') return true;
  toast('A biblioteca de planilhas não carregou. Verifique a conexão com a internet.', 'erro');
  return false;
}

let importPendente = null;

async function lerPlanilha(arquivo) {
  if (!bibliotecaPlanilhaOk()) return;
  try {
    const conteudo = await arquivo.arrayBuffer();
    // raw: true evita que o CSV interprete "10/12" como data americana
    const pasta = XLSX.read(conteudo, { type: 'array', raw: true });
    const aba = pasta.Sheets[pasta.SheetNames[0]];
    const linhas = XLSX.utils.sheet_to_json(aba, { raw: true, defval: '' });
    importPendente = analisarLinhas(linhas);
    mostrarResumoImportacao(importPendente, arquivo.name);
  } catch (e) {
    console.error(e);
    toast('Não foi possível ler o arquivo. Use .xlsx, .xls ou .csv.', 'erro');
  }
}

function analisarLinhas(linhas) {
  const res = { novosClientes: [], novosDocs: [], erros: [], duplicados: 0, linhasLidas: 0, faltaColuna: null };
  if (!linhas.length) { res.faltaColuna = 'A planilha está vazia.'; return res; }

  // Descobre qual coluna da planilha corresponde a cada campo
  const cabecalhos = Object.keys(linhas[0]);
  const mapa = {};
  for (const [campo, apelidos] of Object.entries(COLUNAS)) {
    const h = cabecalhos.find(h => apelidos.includes(normalizarCabecalho(h)));
    if (h) mapa[campo] = h;
  }
  if (!mapa.cliente && !mapa.documento) { res.faltaColuna = 'Não encontrei a coluna "Cliente" nem "CNPJ/CPF".'; return res; }
  if (!mapa.tipo) { res.faltaColuna = 'Não encontrei a coluna "Tipo".'; return res; }
  if (!mapa.vencimento) { res.faltaColuna = 'Não encontrei a coluna "Vencimento".'; return res; }

  const chaveNome = n => semAcento(n).toLowerCase().trim().replace(/\s+/g, ' ');
  const porDocumento = new Map(estado.clientes.filter(c => soDigitos(c.documento)).map(c => [soDigitos(c.documento), c]));
  const porNome = new Map(estado.clientes.map(c => [chaveNome(c.nome), c]));
  const existentes = new Set(estado.documentos.map(d => `${d.clienteId}|${d.tipo}|${d.vencimento}`));

  linhas.forEach((linha, i) => {
    const numLinha = i + 2; // +1 do cabeçalho, +1 porque o Excel começa em 1
    if (Object.values(linha).every(v => String(v).trim() === '')) return;
    res.linhasLidas++;

    const texto = campo => mapa[campo] ? String(linha[mapa[campo]] ?? '').trim() : '';
    const bruto = campo => mapa[campo] ? linha[mapa[campo]] : '';

    const nome = texto('cliente').replace(/\s+/g, ' ');
    const dig = soDigitos(texto('documento'));
    const tipo = normalizarTipo(texto('tipo'));
    const vencimento = lerData(bruto('vencimento'));
    const emissao = lerData(bruto('emissao'));

    const falhas = [];
    if (!nome && !dig) falhas.push('cliente não informado');
    if (dig && !validarDocumento(dig)) falhas.push(`CNPJ/CPF "${texto('documento')}" inválido`);
    if (!tipo) falhas.push(`tipo "${texto('tipo') || 'vazio'}" não reconhecido`);
    if (!vencimento) falhas.push(vencimento === '' ? 'vencimento vazio' : `vencimento "${texto('vencimento')}" inválido`);
    if (emissao === null) falhas.push(`emissão "${texto('emissao')}" inválida`);
    if (falhas.length) { res.erros.push({ linha: numLinha, msg: falhas.join('; ') }); return; }

    // Localiza o cliente pelo documento ou pelo nome; se não existir, cria
    let cliente = (dig && porDocumento.get(dig)) || (nome && porNome.get(chaveNome(nome)));
    if (!cliente) {
      if (!nome) { res.erros.push({ linha: numLinha, msg: 'cliente não cadastrado e sem nome na planilha' }); return; }
      cliente = {
        id: gerarId(),
        nome,
        documento: dig ? formatarDocumento(dig) : '',
        regime: normalizarRegime(texto('regime')),
        contato: texto('contato'),
        email: texto('email'),
        telefone: formatarTelefone(texto('telefone')),
      };
      res.novosClientes.push(cliente);
      if (dig) porDocumento.set(dig, cliente);
      porNome.set(chaveNome(nome), cliente);
    }

    const chave = `${cliente.id}|${tipo}|${vencimento}`;
    if (existentes.has(chave)) { res.duplicados++; return; }
    existentes.add(chave);

    res.novosDocs.push({
      id: gerarId(),
      clienteId: cliente.id,
      tipo,
      numero: texto('numero'),
      emissao: emissao || '',
      vencimento,
      responsavel: texto('responsavel'),
      observacoes: texto('observacoes'),
    });
  });

  return res;
}

function mostrarResumoImportacao(res, nomeArquivo) {
  const caixa = $('importResumo');
  const btn = $('btnConfirmarImport');

  if (res.faltaColuna) {
    caixa.innerHTML = `
      <p class="mb-3"><strong>${esc(nomeArquivo)}</strong></p>
      <div class="aviso-caixa aviso-erro">${esc(res.faltaColuna)}</div>
      <p class="texto-suave text-sm mt-3">Baixe o modelo em <strong>Dados → Baixar modelo de planilha</strong> para ver as colunas esperadas.</p>`;
    btn.disabled = true;
    $('dlgImportar').showModal();
    return;
  }

  const listaErros = res.erros.slice(0, 50).map(e => `<li><strong>Linha ${e.linha}:</strong> ${esc(e.msg)}</li>`).join('');
  caixa.innerHTML = `
    <p class="mb-4"><strong>${esc(nomeArquivo)}</strong> <span class="texto-suave">— ${res.linhasLidas} linha(s) lida(s)</span></p>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      <div class="mini-card"><span class="mini-num txt-ok">${res.novosDocs.length}</span><span class="mini-rot">documentos novos</span></div>
      <div class="mini-card"><span class="mini-num" style="color:var(--primaria)">${res.novosClientes.length}</span><span class="mini-rot">clientes novos</span></div>
      <div class="mini-card"><span class="mini-num texto-suave">${res.duplicados}</span><span class="mini-rot">já existiam</span></div>
      <div class="mini-card"><span class="mini-num txt-vencido">${res.erros.length}</span><span class="mini-rot">com erro</span></div>
    </div>
    ${res.erros.length ? `
      <div class="aviso-caixa aviso-erro">
        <p class="font-semibold mb-2">Linhas ignoradas</p>
        <ul class="lista-erros">${listaErros}</ul>
        ${res.erros.length > 50 ? `<p class="text-xs mt-2">...e mais ${res.erros.length - 50}.</p>` : ''}
      </div>` : ''}
    ${!res.novosDocs.length ? '<p class="texto-suave text-sm mt-3">Nada novo para importar.</p>' : ''}`;
  btn.disabled = !res.novosDocs.length;
  btn.textContent = res.novosDocs.length ? `Importar ${res.novosDocs.length} documento(s)` : 'Importar';
  $('dlgImportar').showModal();
}

function confirmarImportacao() {
  if (!importPendente || !importPendente.novosDocs.length) return;
  // Só adiciona clientes novos que de fato receberam documentos
  const usados = new Set(importPendente.novosDocs.map(d => d.clienteId));
  estado.clientes.push(...importPendente.novosClientes.filter(c => usados.has(c.id)));
  estado.documentos.push(...importPendente.novosDocs);
  const qtd = importPendente.novosDocs.length;
  importPendente = null;
  limparFiltros();
  salvarEAtualizar();
  $('dlgImportar').close();
  toast(`${qtd} documento(s) importado(s).`);
}

function baixarModelo() {
  if (!bibliotecaPlanilhaOk()) return;
  const cabecalho = ['Cliente', 'CNPJ/CPF', 'Tipo', 'Vencimento', 'Número', 'Emissão', 'Responsável', 'Observações', 'Regime', 'E-mail', 'Telefone', 'Contato'];
  const exemplo1 = ['Empresa Exemplo Ltda', formatarDocumento(completarCNPJ('112223330001')), 'Certificado A1', '31/12/2026', '', '01/01/2026', 'Mauricio', 'Renovar com antecedência', 'Simples Nacional', 'contato@exemplo.com.br', '(48) 99999-0000', 'Fulano'];
  const exemplo2 = ['Empresa Exemplo Ltda', formatarDocumento(completarCNPJ('112223330001')), 'CND Federal', '15/11/2026', '', '', 'Fiscal', '', '', '', '', ''];

  const aba = XLSX.utils.aoa_to_sheet([cabecalho, exemplo1, exemplo2]);
  aba['!cols'] = [28, 22, 18, 13, 14, 13, 14, 28, 18, 26, 17, 14].map(wch => ({ wch }));

  const instrucoes = XLSX.utils.aoa_to_sheet([
    ['Como preencher'],
    ['• Uma linha por documento. O mesmo cliente pode aparecer em várias linhas.'],
    ['• Obrigatórios: Cliente (ou CNPJ/CPF), Tipo e Vencimento.'],
    ['• Datas no formato dd/mm/aaaa.'],
    ['• Clientes que ainda não existem no painel são criados automaticamente.'],
    ['• Documentos repetidos (mesmo cliente, tipo e vencimento) são ignorados.'],
    [],
    ['Tipos aceitos'],
    ...Object.keys(TIPOS).map(t => [t]),
    [],
    ['Regimes aceitos'],
    ...REGIMES.map(r => [r]),
  ]);
  instrucoes['!cols'] = [{ wch: 80 }];

  const pasta = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(pasta, aba, 'Vencimentos');
  XLSX.utils.book_append_sheet(pasta, instrucoes, 'Instruções');
  XLSX.writeFile(pasta, 'modelo-vencimentos.xlsx');
}

// =========================================================
// Backup em JSON
// =========================================================
function baixarArquivo(conteudo, nome, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportarBackup() {
  if (!estado.clientes.length) { toast('Não há dados para exportar.', 'aviso'); return; }
  const backup = { app: 'painel-vencimentos', versao: 1, exportadoEm: new Date().toISOString(), ...estado };
  baixarArquivo(JSON.stringify(backup, null, 2), `backup-vencimentos-${paraISO(HOJE)}.json`, 'application/json');
  toast('Backup exportado.');
}

async function restaurarBackup(arquivo) {
  let dados;
  try {
    dados = JSON.parse(await arquivo.text());
  } catch (e) {
    toast('Arquivo de backup inválido.', 'erro');
    return;
  }
  if (!dados || !Array.isArray(dados.clientes) || !Array.isArray(dados.documentos)) {
    toast('Esse arquivo não é um backup do painel.', 'erro');
    return;
  }

  // Copia só os campos conhecidos, garantindo os tipos
  const txt = v => (v == null ? '' : String(v));
  const clientes = dados.clientes
    .filter(c => c && c.id && c.nome)
    .map(c => ({ id: txt(c.id), nome: txt(c.nome), documento: txt(c.documento), regime: txt(c.regime), contato: txt(c.contato), email: txt(c.email), telefone: txt(c.telefone) }));
  const ids = new Set(clientes.map(c => c.id));
  const documentos = dados.documentos
    .filter(d => d && d.id && ids.has(String(d.clienteId)) && d.tipo && isoValido(d.vencimento))
    .map(d => ({ id: txt(d.id), clienteId: txt(d.clienteId), tipo: txt(d.tipo), numero: txt(d.numero), emissao: isoValido(d.emissao) ? d.emissao : '', vencimento: d.vencimento, responsavel: txt(d.responsavel), observacoes: txt(d.observacoes) }));

  const resumo = `${clientes.length} cliente(s) e ${documentos.length} documento(s)`;
  if (estado.clientes.length && !confirm(`Substituir os dados atuais por ${resumo} do backup?`)) return;

  estado = { clientes, documentos };
  limparFiltros();
  salvarEAtualizar();
  toast(`Backup restaurado: ${resumo}.`);
}

// =========================================================
// Menu "Dados"
// =========================================================
function fecharMenu() {
  $('menuDados').classList.add('hidden');
  $('btnMenu').setAttribute('aria-expanded', 'false');
}

function executarMenu(acao) {
  fecharMenu();
  switch (acao) {
    case 'importar':     $('inputPlanilha').click(); break;
    case 'modelo':       baixarModelo(); break;
    case 'exportar':     exportarBackup(); break;
    case 'restaurar':    $('inputBackup').click(); break;
    case 'exemplos':     carregarExemplos(); break;
    case 'limpar':       limparTudo(); break;
    case 'novo-cliente': abrirCliente(); break;
  }
}

// =========================================================
// Inicialização e eventos
// =========================================================
function iniciar() {
  $('dataHoje').textContent = HOJE.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  // Preenche selects fixos
  Object.keys(TIPOS).forEach(t => {
    elTipo.insertAdjacentHTML('beforeend', `<option value="${t}">${t}</option>`);
    $('docTipo').insertAdjacentHTML('beforeend', `<option value="${t}">${t}</option>`);
  });
  REGIMES.forEach(r => $('cliRegime').insertAdjacentHTML('beforeend', `<option value="${r}">${r}</option>`));

  // Cabeçalho
  $('btnTema').addEventListener('click', alternarTema);
  $('btnNovoCliente').addEventListener('click', () => abrirCliente());
  $('btnNovoDocumento').addEventListener('click', () => abrirDocumento());
  $('btnMenu').addEventListener('click', e => {
    e.stopPropagation();
    const menu = $('menuDados');
    menu.classList.toggle('hidden');
    $('btnMenu').setAttribute('aria-expanded', String(!menu.classList.contains('hidden')));
  });
  document.querySelectorAll('[data-menu]').forEach(b => b.addEventListener('click', () => executarMenu(b.dataset.menu)));
  document.addEventListener('click', e => { if (!e.target.closest('#menuDados')) fecharMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharMenu(); });

  // Arquivos
  $('inputPlanilha').addEventListener('change', e => { const f = e.target.files[0]; if (f) lerPlanilha(f); e.target.value = ''; });
  $('inputBackup').addEventListener('change', e => { const f = e.target.files[0]; if (f) restaurarBackup(f); e.target.value = ''; });
  $('btnConfirmarImport').addEventListener('click', confirmarImportacao);

  // Formulários
  $('formCliente').addEventListener('submit', salvarCliente);
  $('formDocumento').addEventListener('submit', salvarDocumento);
  $('cliDoc').addEventListener('input', e => { e.target.value = formatarDocumento(e.target.value); limparErrosCampo('cliDoc'); });
  $('cliTelefone').addEventListener('input', e => { e.target.value = formatarTelefone(e.target.value); });
  $('docVencimento').addEventListener('input', () => { atualizarPrevia(); limparErrosCampo('docVencimento'); });
  ['cliNome', 'cliEmail', 'docCliente', 'docTipo', 'docEmissao'].forEach(id =>
    $(id).addEventListener('input', () => limparErrosCampo(id)));
  $('btnClienteRapido').addEventListener('click', () => abrirCliente(null, { doDocumento: true }));

  // Fechar modais: botões "Cancelar/X" e clique fora
  document.querySelectorAll('dialog').forEach(dlg => {
    dlg.querySelectorAll('[data-fechar]').forEach(b => b.addEventListener('click', () => dlg.close()));
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  });
  $('dlgImportar').addEventListener('close', () => { importPendente = null; });

  // Ações nas linhas e cards (delegação de eventos)
  document.querySelector('main').addEventListener('click', e => {
    const alvo = e.target.closest('[data-acao]');
    if (!alvo) return;
    const id = alvo.dataset.id;
    switch (alvo.dataset.acao) {
      case 'editar-doc':   abrirDocumento(id); break;
      case 'excluir-doc':  excluirDocumento(id); break;
      case 'editar-cli':   abrirCliente(id); break;
      case 'excluir-cli':  excluirCliente(id); break;
      case 'novo-doc-cli': abrirDocumento(null, id); break;
    }
  });

  // Filtros
  elBusca.addEventListener('input', atualizar);
  elTipo.addEventListener('change', atualizar);
  elPeriodo.addEventListener('change', atualizar);
  document.querySelectorAll('.card-resumo').forEach(card => {
    card.addEventListener('click', () => {
      elPeriodo.value = elPeriodo.value === card.dataset.periodo ? '' : card.dataset.periodo;
      if (abaAtual === 'cadastro') trocarAba('documentos'); else atualizar();
    });
  });
  $('limparFiltros').addEventListener('click', () => { limparFiltros(); atualizar(); });

  // Abas
  document.querySelectorAll('.aba').forEach(aba => aba.addEventListener('click', () => trocarAba(aba.dataset.aba)));

  // Atalho: "/" foca a busca
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !e.target.closest('input, textarea, select') && !document.querySelector('dialog[open]')) {
      e.preventDefault();
      elBusca.focus();
    }
  });

  carregarDados();
  atualizar();
}

document.addEventListener('DOMContentLoaded', iniciar);
