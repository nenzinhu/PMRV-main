/**
 * Modulo: Patrulhamento de Transito SC
 * Registro rapido de infracoes em lote com persistencia local.
 */

let patRelogioHandle = null;
let PAT_SPEECH_RECOGNITION = null;
const PAT_GPS_STATUS_LABEL = 'Sintonizando...';
const PAT_LOTE_MAX_PLACAS = 20;
let PAT_LOTE_PLACAS = [];
let PAT_LOTE_SEEN = new Set();

const PAT_QUICK_INFRACOES = {
  '518-51': { nome: 'Cinto - Condutor sem cinto', codigo: '518-51', gravidade: 'Grave', artigo: 'Art. 167' },
  '518-52': { nome: 'Cinto - Passageiro sem cinto', codigo: '518-52', gravidade: 'Grave', artigo: 'Art. 167' },
  '663-71': { nome: 'Equipam. em Desacordo', codigo: '663-71', gravidade: 'Grave', artigo: 'Art. 230, X' },
  '581-96': { nome: 'Desobedecer Agente', codigo: '581-96', gravidade: 'Grave', artigo: 'Art. 195' },
  '659-92': { nome: 'Nao Licenciado/Registrado', codigo: '659-92', gravidade: 'Gravissima', artigo: 'Art. 230, V' },
  '736-62': { nome: 'Celular - Utilizando telefone celular', codigo: '736-62', gravidade: 'Media', artigo: 'Art. 252, VI' },
  '763-31': { nome: 'Celular - Segurando aparelho', codigo: '763-31', gravidade: 'Gravissima', artigo: 'Art. 252, P.U.' },
  '763-32': { nome: 'Celular - Manuseando/teclando', codigo: '763-32', gravidade: 'Gravissima', artigo: 'Art. 252, P.U.' },
  '596-70': { nome: 'Ultrapassar Linha Continua', codigo: '596-70', gravidade: 'Gravissima (5x)', artigo: 'Art. 203, V' },
  '544-40': { nome: 'Estacionar no acostamento', codigo: '544-40', gravidade: 'Leve', artigo: 'Art. 181, VII' },
  '545-27': { nome: 'Estacionar em gramado/jardim publico', codigo: '545-27', gravidade: 'Grave', artigo: 'Art. 181, VIII' },
  '734-01': { nome: 'Calcado que nao se firme nos pes', codigo: '734-01', gravidade: 'Media', artigo: 'Art. 252, IV' },
  '577-01': { nome: 'Nao dar preferencia a viatura', codigo: '577-01', gravidade: 'Grave', artigo: 'Art. 189' },
  '605-01': { nome: 'Avancar sinal vermelho', codigo: '605-01', gravidade: 'Gravissima', artigo: 'Art. 208' },
  '682-32': { nome: 'Restricao Peso/Dimensao', codigo: '682-32', gravidade: 'Grave', artigo: 'Art. 231, IV' },
  '667-00': { nome: 'Lanterna/Luz Placa Queimada', codigo: '667-00', gravidade: 'Media', artigo: 'Art. 230, XXII' },
  '658-00': { nome: 'Placa Ilegivel/Sem Visib.', codigo: '658-00', gravidade: 'Gravissima', artigo: 'Art. 230, VI' }
};

const PAT_VOICE_TOKEN_MAP = {
  // Letras - Pronúncias e Alfabeto Fonético (Português/NATO)
  a: 'A', ah: 'A', abe: 'A', alfa: 'A', amor: 'A', abelha: 'A', ave: 'A',
  be: 'B', b: 'B', bi: 'B', bravo: 'B', bola: 'B', banana: 'B', ba: 'B',
  ce: 'C', c: 'C', ci: 'C', charlie: 'C', casa: 'C', cavalo: 'C', ca: 'C',
  de: 'D', d: 'D', di: 'D', delta: 'D', dado: 'D', dedo: 'D', da: 'D',
  e: 'E', echo: 'E', escola: 'E', elefante: 'E', eva: 'E',
  efe: 'F', f: 'F', foxtrot: 'F', faca: 'F', fogo: 'F', fe: 'F',
  ge: 'G', g: 'G', gue: 'G', golf: 'G', gato: 'G', gelo: 'G',
  aga: 'H', ha: 'H', h: 'H', hotel: 'H', hipopotamo: 'H', hoje: 'H',
  i: 'I', ih: 'I', india: 'I', igreja: 'I', ilha: 'I',
  jota: 'J', j: 'J', juliet: 'J', jacare: 'J', jogo: 'J',
  ka: 'K', k: 'K', kilo: 'K', kiwi: 'K',
  ele: 'L', l: 'L', el: 'L', lima: 'L', leite: 'L', lua: 'L',
  eme: 'M', m: 'M', mike: 'M', macaco: 'M', macado: 'M', maria: 'M', mapa: 'M',
  ene: 'N', n: 'N', november: 'N', navio: 'N', nuvem: 'N', nada: 'N',
  o: 'O', oh: 'O', oscar: 'O', ovo: 'O', olho: 'O',
  pe: 'P', p: 'P', papa: 'P', pato: 'P', pipa: 'P', para: 'P',
  que: 'Q', q: 'Q', quebec: 'Q', queijo: 'Q', quero: 'Q',
  erre: 'R', r: 'R', romeo: 'R', rato: 'R', rosa: 'R',
  esse: 'S', s: 'S', sierra: 'S', sapo: 'S', sol: 'S',
  te: 'T', t: 'T', ti: 'T', tango: 'T', tatu: 'T', tomate: 'T',
  u: 'U', uniform: 'U', uva: 'U', urso: 'U', uniao: 'U',
  ve: 'V', v: 'V', victor: 'V', vaca: 'V', vela: 'V', vida: 'V',
  dobleve: 'W', dabliu: 'W', w: 'W', whiskey: 'W',
  xis: 'X', x: 'X', xray: 'X', xadrez: 'X', xicara: 'X',
  ipsilon: 'Y', ypsilon: 'Y', y: 'Y', yankee: 'Y',
  ze: 'Z', z: 'Z', zulu: 'Z', zebra: 'Z',
  // Números
  zero: '0',
  um: '1', uma: '1',
  dois: '2',
  tres: '3',
  quatro: '4', for: '4',
  cinco: '5',
  seis: '6', meia: '6',
  sete: '7',
  oito: '8',
  nove: '9'
};

const PAT_VOICE_IGNORE_TOKENS = new Set([
  'placa', 'mercosul', 'brasil', 'antiga', 'modelo', 'letra', 'numero', 'nÃºmero',
  'nova', 'novo', 'tipo', 'formato'
]);

const PAT_VOICE_CONNECTORS = new Set(['de', 'da', 'do']);

function pat_escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pat_getStore() {
  return PMRV.patrulhamentoStore;
}

function pat_getReport() {
  return PMRV.patrulhamentoReport;
}

function pat_getRender() {
  return PMRV.patrulhamentoRender;
}

function pat_getVeiculos() {
  return pat_getStore()?.getAll?.() || [];
}

function pat_init() {
  pat_carregarCache();
  pat_atualizarDataHora();
  if (!patRelogioHandle) {
    patRelogioHandle = setInterval(pat_atualizarDataHora, 30000);
  }
}

function pat_carregarCache() {
  const veiculos = pat_getStore()?.load?.() || [];
  pat_renderizarLista();
  if (veiculos.length > 0) {
    pat_setBoxVisible('pat_lista_card', true);
  }
}

function pat_setBoxVisible(id, visible) {
  const element = document.getElementById(id);
  if (!element) return;
  element.classList.toggle('hidden', !visible);
  element.classList.toggle('visible', visible);
}

function pat_resetFormulario() {
  const placaInput = document.getElementById('pat_placa');
  const obsInput = document.getElementById('pat_obs');
  const localInput = document.getElementById('pat_local');
  const infraDisplay = document.getElementById('pat_infracao_display');
  const infraData = document.getElementById('pat_infracao_data');
  const manualNome = document.getElementById('pat_manual_infra_nome');
  const manualCodigo = document.getElementById('pat_manual_infra_codigo');

  if (placaInput) {
    placaInput.value = '';
    pat_formatarPlaca(placaInput);
    placaInput.focus();
  }
  if (obsInput) obsInput.value = '';
  if (localInput) localInput.value = '';
  if (infraDisplay) infraDisplay.value = '';
  if (infraData) infraData.value = '';
  if (manualNome) manualNome.value = '';
  if (manualCodigo) manualCodigo.value = '';
  pat_limparLotePlacas();

  document.getElementById('pat_infra_manual_box')?.classList.add('hidden');
  document.getElementById('pat_quick_cinto_box')?.classList.add('hidden');
  document.getElementById('pat_quick_celular_box')?.classList.add('hidden');
  document.querySelectorAll('.infra-quick-card').forEach(c => c.classList.remove('active'));
  pat_atualizarDataHora();
}

async function pat_simularOCR(input) {
  if (!input?.files || !input.files[0]) return;

  const label = input.closest('label');
  const originalText = label?.innerHTML;
  if (label) {
    label.innerHTML = 'Processando placa...';
    label.classList.add('loading');
  }

  try {
    const result = await Tesseract.recognize(input.files[0], 'eng', {
      logger: m => console.log(m)
    });

    const plate = result.data.text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const match = plate.match(/[A-Z]{3}[0-9][A-Z0-9][0-9]{2}/);
    if (match) {
      const placaEl = document.getElementById('pat_placa');
      if (placaEl) {
        placaEl.value = match[0];
        pat_formatarPlaca(placaEl);
      }
      pat_setModoPlaca('manual');
      if (navigator.vibrate) navigator.vibrate(100);
    } else {
      alert('Nao foi possivel identificar a placa com clareza.');
    }
  } catch (err) {
    alert('Erro no OCR: ' + err.message);
  } finally {
    if (label && typeof originalText === 'string') {
      label.innerHTML = originalText;
      label.classList.remove('loading');
    }
  }
}

function pat_atualizarDataHora() {
  const dataInput = document.getElementById('pat_data');
  const horaInput = document.getElementById('pat_hora');
  if (!dataInput || !horaInput) return;

  const agora = new Date();
  dataInput.value = agora.toLocaleDateString('pt-BR');
  horaInput.value = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function pat_formatarPlaca(el) {
  if (!el) return;
  let val = el.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (val.length > 7) val = val.substring(0, 7);
  el.value = val;

  const badge = document.getElementById('pat_placa_tipo');
  if (!badge) return;

  if (val.length === 7) {
    const isMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(val);
    badge.innerText = isMercosul ? 'MERCOSUL' : 'BRASIL (ANTIGA)';
    badge.style.background = isMercosul ? '#003399' : '#555';
  } else {
    badge.innerText = 'DIGITANDO...';
    badge.style.background = '#999';
  }
}

function pat_setBotaoVoz(state, text) {
  const btn = document.getElementById('btn-pat-placa-voz');
  if (!btn) return;

  btn.disabled = state === 'loading';
  btn.textContent = text;
}

function pat_setBotaoLote(state, text) {
  const btn = document.getElementById('btn-pat-placa-lote');
  if (!btn) return;

  btn.disabled = state === 'loading';
  btn.textContent = text;
}

function pat_normalizarTextoVoz(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pat_converterFalaEmPlaca(texto) {
  const normalizado = pat_normalizarTextoVoz(texto);
  if (!normalizado) return '';

  const tokens = normalizado
    .split(' ')
    .filter(token => token && !PAT_VOICE_IGNORE_TOKENS.has(token));

  let convertido = '';

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const char = pat_tokenParaChar(token);
    if (!char) continue;

    // Lógica para evitar duplicidade fonética (ex: "M de macaco" ou "M macaco")
    // Se o próximo token (ou o após o conector) resultar no mesmo caractere, nós o pulamos.
    let skipCount = 0;
    if (i + 1 < tokens.length) {
      const nextToken = tokens[i + 1];
      if (PAT_VOICE_CONNECTORS.has(nextToken)) {
        if (i + 2 < tokens.length && pat_tokenParaChar(tokens[i + 2]) === char) {
          skipCount = 2; // Pula o conector e a palavra fonética
        }
      } else if (pat_tokenParaChar(nextToken) === char && (token.length > 1 || nextToken.length > 1)) {
        // Se não houver conector, mas um dos tokens for uma palavra longa (fonética), pula o segundo.
        // Ex: "M macaco" ou "macaco M" -> resulta em apenas um M.
        // Evitamos pular "A A" pois pode ser uma placa AAA.
        skipCount = 1;
      }
    }

    convertido += char;
    i += skipCount;
  }

  const match = convertido.match(/[A-Z]{3}[0-9][A-Z0-9][0-9]{2}/);
  if (match) return match[0];

  const fallback = convertido.replace(/[^A-Z0-9]/g, '');
  return fallback.length >= 7 ? fallback.slice(0, 7) : fallback;
}

function pat_validarFormatoPlaca(placa) {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(String(placa || '').toUpperCase());
}

function pat_normalizarPossivelPlaca(placa) {
  return String(placa || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 7);
}

function pat_placaEhParecida(a, b) {
  const left = pat_normalizarPossivelPlaca(a);
  const right = pat_normalizarPossivelPlaca(b);
  if (!left || !right || left.length !== 7 || right.length !== 7) return false;
  if (left === right) return true;

  let diff = 0;
  for (let i = 0; i < 7; i++) {
    if (left[i] !== right[i]) diff++;
    if (diff > 1) return false;
  }
  return diff <= 1;
}

function pat_tokenParaChar(token) {
  if (!token) return '';
  if (PAT_VOICE_IGNORE_TOKENS.has(token)) return '';
  if (PAT_VOICE_TOKEN_MAP[token]) return PAT_VOICE_TOKEN_MAP[token];
  if (/^[a-z]$/.test(token)) return token.toUpperCase();
  if (/^\d$/.test(token)) return token;
  if (/^[a-z0-9]{1,7}$/i.test(token)) return token.toUpperCase();
  if (/^\d{2,7}$/.test(token)) return token;
  return '';
}

function pat_extrairPlacasDeLote(texto) {
  const tokens = pat_normalizarTextoVoz(texto).split(' ').filter(Boolean);
  const placas = [];

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] !== 'placa') continue;

    let valor = '';
    for (let j = i + 1; j < tokens.length && valor.length < 7; j++) {
      const token = tokens[j];
      if (token === 'placa' || token === 'terminou') break;
      
      const char = pat_tokenParaChar(token);
      if (!char) continue;

      // Lógica para evitar duplicidade fonética (ex: "M de macaco")
      let skipCount = 0;
      if (j + 1 < tokens.length) {
        const nextToken = tokens[j + 1];
        if (PAT_VOICE_CONNECTORS.has(nextToken)) {
          if (j + 2 < tokens.length && pat_tokenParaChar(tokens[j + 2]) === char) {
            skipCount = 2;
          }
        } else if (pat_tokenParaChar(nextToken) === char && (token.length > 1 || nextToken.length > 1)) {
          skipCount = 1;
        }
      }

      valor += char;
      j += skipCount;
    }

    const placa = valor.replace(/[^A-Z0-9]/g, '').slice(0, 7);
    if (placa.length === 7 && pat_validarFormatoPlaca(placa)) placas.push(placa);
  }

  return placas;
}

function pat_renderizarLotePlacas() {
  const box = document.getElementById('pat_lote_box');
  const lista = document.getElementById('pat_lote_lista');
  const status = document.getElementById('pat_lote_status');
  if (!box || !lista || !status) return;

  box.classList.toggle('hidden', PAT_LOTE_PLACAS.length === 0);
  if (!PAT_LOTE_PLACAS.length) {
    lista.innerHTML = '';
    status.textContent = `Diga "placa" e os 7 caracteres. Diga "terminou" para encerrar. Maximo: ${PAT_LOTE_MAX_PLACAS} placas.`;
    return;
  }

  status.textContent = `Lote capturado: ${PAT_LOTE_PLACAS.length}/${PAT_LOTE_MAX_PLACAS} placa(s).`;
  lista.innerHTML = PAT_LOTE_PLACAS.map((placa) =>
    `<span style="display:inline-flex;align-items:center;gap:6px;padding:8px 10px;border-radius:999px;border:1px solid var(--border);background:rgba(37,99,235,.08);font-family:monospace;font-weight:700;">${pat_escapeHtml(placa)} <button type="button" class="btn btn-sm" style="padding:2px 8px;min-height:auto;" data-click="pat_removerPlacaLote('${placa}')">x</button></span>`
  ).join('');
}

function pat_adicionarPlacaNoLote(placa) {
  const valor = pat_normalizarPossivelPlaca(placa);
  if (!pat_validarFormatoPlaca(valor)) return false;
  if (PAT_LOTE_PLACAS.length >= PAT_LOTE_MAX_PLACAS) return false;
  if (PAT_LOTE_SEEN.has(valor)) return false;
  if (PAT_LOTE_PLACAS.some((item) => pat_placaEhParecida(item, valor))) return false;
  PAT_LOTE_SEEN.add(valor);
  PAT_LOTE_PLACAS.push(valor);
  pat_renderizarLotePlacas();
  return true;
}

function pat_limparLotePlacas() {
  PAT_LOTE_PLACAS = [];
  PAT_LOTE_SEEN = new Set();
  pat_renderizarLotePlacas();
}

function pat_removerPlacaLote(placa) {
  PAT_LOTE_PLACAS = PAT_LOTE_PLACAS.filter((item) => item !== placa);
  PAT_LOTE_SEEN = new Set(PAT_LOTE_PLACAS);
  pat_renderizarLotePlacas();
}

function pat_aplicarPlacaReconhecida(placa) {
  const placaEl = document.getElementById('pat_placa');
  if (!placaEl) return false;

  const valor = String(placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  if (!pat_validarFormatoPlaca(valor)) {
    return false;
  }

  placaEl.value = valor;
  pat_formatarPlaca(placaEl);
  pat_setModoPlaca('manual');
  if (navigator.vibrate) navigator.vibrate(80);
  return true;
}

function pat_iniciarVozPlaca() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Reconhecimento de voz nao suportado neste navegador.');
    return;
  }

  if (PAT_SPEECH_RECOGNITION) {
    try {
      PAT_SPEECH_RECOGNITION.stop();
    } catch (error) {
      console.warn('Falha ao interromper reconhecimento anterior:', error);
    }
    PAT_SPEECH_RECOGNITION = null;
  }

  const recognition = new SpeechRecognition();
  PAT_SPEECH_RECOGNITION = recognition;

  recognition.lang = 'pt-BR';
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;

  pat_setBotaoVoz('loading', '🎙️ Ouvindo...');

  recognition.onresult = (event) => {
    const resultados = [];
    for (let i = event.resultIndex; i < event.results.length; i++) {
      resultados.push(event.results[i][0].transcript || '');
    }

    const textoFalado = resultados.join(' ').trim();
    const placaConvertida = pat_converterFalaEmPlaca(textoFalado);

    if (event.results[event.results.length - 1]?.isFinal) {
      if (!pat_aplicarPlacaReconhecida(placaConvertida)) {
        alert(`Nao foi possivel montar a placa com clareza.\n\nReconhecido: ${textoFalado || '---'}`);
      }
    } else {
      const btn = document.getElementById('btn-pat-placa-voz');
      if (btn) {
        btn.textContent = placaConvertida ? `🎙️ ${placaConvertida}` : '🎙️ Ouvindo...';
      }
    }
  };

  recognition.onerror = (event) => {
    const erro = event?.error || 'desconhecido';
    if (erro !== 'no-speech' && erro !== 'aborted') {
      alert(`Erro no reconhecimento de voz: ${erro}`);
    }
  };

  recognition.onend = () => {
    PAT_SPEECH_RECOGNITION = null;
    pat_setBotaoVoz('idle', '🎙️ Voz');
  };

  recognition.start();
}

function pat_pararReconhecimentoVoz() {
  if (!PAT_SPEECH_RECOGNITION) return;
  try {
    PAT_SPEECH_RECOGNITION.stop();
  } catch (error) {
    console.warn('Falha ao interromper reconhecimento de voz:', error);
  }
  PAT_SPEECH_RECOGNITION = null;
}

function pat_iniciarVozLotePlacas() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Reconhecimento de voz nao suportado neste navegador.');
    return;
  }

  pat_pararReconhecimentoVoz();
  pat_limparLotePlacas();

  const recognition = new SpeechRecognition();
  PAT_SPEECH_RECOGNITION = recognition;

  recognition.lang = 'pt-BR';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;

  pat_setBotaoLote('loading', '🎙️ Lote ouvindo...');
  document.getElementById('pat_lote_box')?.classList.remove('hidden');

  recognition.onresult = (event) => {
    const resultados = [];
    for (let i = event.resultIndex; i < event.results.length; i++) {
      resultados.push(event.results[i][0].transcript || '');
    }

    const textoFalado = resultados.join(' ').trim();
    const normalizado = pat_normalizarTextoVoz(textoFalado);
    if (!normalizado) return;

    pat_extrairPlacasDeLote(textoFalado).forEach((placa) => pat_adicionarPlacaNoLote(placa));

    const status = document.getElementById('pat_lote_status');
    if (status && !normalizado.includes('terminou')) {
      status.textContent = `Ouvindo lote... ${PAT_LOTE_PLACAS.length}/${PAT_LOTE_MAX_PLACAS} placa(s) reconhecida(s).`;
    }

    if (PAT_LOTE_PLACAS.length >= PAT_LOTE_MAX_PLACAS) {
      if (status) status.textContent = `Limite maximo atingido: ${PAT_LOTE_MAX_PLACAS} placas.`;
      pat_pararReconhecimentoVoz();
      pat_setBotaoLote('idle', '🎙️ Lote');
      pat_renderizarLotePlacas();
      return;
    }

    if (normalizado.includes('terminou')) {
      pat_pararReconhecimentoVoz();
      pat_setBotaoLote('idle', '🎙️ Lote');
      pat_renderizarLotePlacas();
    }
  };

  recognition.onerror = (event) => {
    const erro = event?.error || 'desconhecido';
    if (erro !== 'no-speech' && erro !== 'aborted') {
      alert(`Erro no reconhecimento de voz: ${erro}`);
    }
  };

  recognition.onend = () => {
    PAT_SPEECH_RECOGNITION = null;
    pat_setBotaoLote('idle', '🎙️ Lote');
  };

  recognition.start();
}

function pat_selectQuick(codigo) {
  const display = document.getElementById('pat_infracao_display');
  const dataInput = document.getElementById('pat_infracao_data');
  const manualBox = document.getElementById('pat_infra_manual_box');
  const cintoBox = document.getElementById('pat_quick_cinto_box');
  const celularBox = document.getElementById('pat_quick_celular_box');
  if (!display || !dataInput) return;

  document.querySelectorAll('.infra-quick-card').forEach(c => c.classList.remove('active'));
  cintoBox?.classList.add('hidden');
  celularBox?.classList.add('hidden');

  if (codigo === 'MANUAL') {
    manualBox?.classList.remove('hidden');
    display.value = 'Infracao Manual';
    dataInput.value = '';
    document.getElementById('pat_manual_infra_nome')?.focus();
    return;
  }

  if (codigo === 'CINTO') {
    manualBox?.classList.add('hidden');
    display.value = 'Selecione: Cinto - condutor ou passageiro';
    dataInput.value = '';
    cintoBox?.classList.remove('hidden');
    const btn = document.querySelector(`[data-click="pat_selectQuick('CINTO')"]`);
    if (btn) btn.classList.add('active');
    return;
  }

  if (codigo === 'CELULAR') {
    manualBox?.classList.add('hidden');
    display.value = 'Selecione o tipo de uso de celular';
    dataInput.value = '';
    celularBox?.classList.remove('hidden');
    const btn = document.querySelector(`[data-click="pat_selectQuick('CELULAR')"]`);
    if (btn) btn.classList.add('active');
    return;
  }

  manualBox?.classList.add('hidden');
  const infra = PAT_QUICK_INFRACOES[codigo];
  if (!infra) return;

  display.value = `${infra.nome} (${infra.codigo})`;
  dataInput.value = JSON.stringify(infra);
  const btn = document.querySelector(`[data-click="pat_selectQuick('${codigo}')"]`);
  if (btn) btn.classList.add('active');
}

function pat_coletarContextoFormulario() {
  const infracaoDataInput = document.getElementById('pat_infracao_data');
  if (!infracaoDataInput) return null;

  const agora = new Date();
  const data = document.getElementById('pat_data')?.value || agora.toLocaleDateString('pt-BR');
  const hora = document.getElementById('pat_hora')?.value || agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const obs = document.getElementById('pat_obs')?.value.trim() || '';

  let local = '';
  const gpsBox = document.getElementById('pat_local_gps_box');
  if (gpsBox && !gpsBox.classList.contains('hidden')) {
    local = pat_normalizarLocalGps(document.getElementById('pat_local')?.value);
  } else {
    const rod = document.getElementById('pat_manual_rodovia')?.value;
    const kmInput = document.getElementById('pat_manual_km');
    if (kmInput) core_formatarKM(kmInput);
    const km = kmInput?.value || '0,000';
    local = rod ? `${rod}, KM ${km}` : `KM ${km}`;
  }

  let infracaoObj = null;
  if (infracaoDataInput.value) {
    try {
      infracaoObj = JSON.parse(infracaoDataInput.value);
    } catch (err) {
      alert('Dados da infracao invalidos. Selecione novamente.');
      return null;
    }
  } else {
    const mNome = document.getElementById('pat_manual_infra_nome')?.value.trim();
    const mCod = document.getElementById('pat_manual_infra_codigo')?.value.trim();
    if (mNome && mCod) {
      infracaoObj = { nome: mNome, codigo: mCod, artigo: '' };
    }
  }

  if (!infracaoObj) {
    alert('Selecione a infracao.');
    return null;
  }

  return { data, hora, local, obs, infracao: infracaoObj };
}

function pat_adicionarRegistro(placa, context) {
  if (!pat_validarFormatoPlaca(placa) || !context) return false;

  pat_getStore()?.add?.({
    id: Date.now() + Math.floor(Math.random() * 1000),
    placa,
    data: context.data,
    hora: context.hora,
    local: context.local,
    obs: context.obs,
    infracao: context.infracao
  });

  return true;
}

function pat_salvarLotePlacas() {
  if (!PAT_LOTE_PLACAS.length) {
    alert('Nenhuma placa foi capturada no lote.');
    return;
  }

  const context = pat_coletarContextoFormulario();
  if (!context) return;

  PAT_LOTE_PLACAS.forEach((placa) => pat_adicionarRegistro(placa, context));
  pat_renderizarLista();
  pat_setBoxVisible('pat_lista_card', true);
  pat_setBoxVisible('pat_result_area', false);
  pat_limparLotePlacas();
  pat_resetFormulario();
  if (navigator.vibrate) navigator.vibrate([100, 40, 100, 40, 100]);
}

function pat_salvarVeiculo() {
  const placaInput = document.getElementById('pat_placa');
  if (!placaInput) return;
  const placa = placaInput.value.trim();

  if (!pat_validarFormatoPlaca(placa)) {
    alert('Placa invalida.');
    return;
  }

  const context = pat_coletarContextoFormulario();
  if (!context) return;

  pat_adicionarRegistro(placa, context);
  pat_renderizarLista();
  pat_setBoxVisible('pat_lista_card', true);
  pat_setBoxVisible('pat_result_area', false);
  pat_resetFormulario();
  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
}

function pat_renderizarLista() {
  const container = document.getElementById('pat_lista_container');
  const card = document.getElementById('pat_lista_card');
  const totalEl = document.getElementById('pat_total_turno');
  const veiculos = pat_getVeiculos();
  if (!container || !card) return;

  if (veiculos.length === 0) {
    pat_setBoxVisible('pat_lista_card', false);
    if (totalEl) totalEl.textContent = 'Total de abordagens: 0';
    return;
  }

  pat_setBoxVisible('pat_lista_card', true);
  if (totalEl) totalEl.textContent = `Total de abordagens: ${veiculos.length}`;
  container.innerHTML = '';

  veiculos.forEach((v, index) => {
    const num = veiculos.length - index;
    const item = document.createElement('div');
    item.className = 'pat-item';
    item.style.cssText = 'display:flex; align-items:center; gap:12px; padding:12px; border-radius:12px; background:rgba(255,255,255,0.05); margin-bottom:8px; border-left:4px solid var(--primary);';
    const renderedHtml = pat_getRender()?.buildListItemHtml?.(v, index, veiculos.length, pat_escapeHtml);
    if (renderedHtml) {
      item.innerHTML = renderedHtml;
      container.appendChild(item);
      return;
    }
    
    item.innerHTML = `
      <div style="background:var(--primary); color:white; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:900; flex-shrink:0;">
        ${num}
      </div>
      <div style="flex:1;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:18px; color:var(--primary); font-family:monospace; letter-spacing:1px;">${pat_escapeHtml(v.placa)}</strong>
          <span style="font-size:10px; color:var(--muted);">${v.hora}</span>
        </div>
        <div style="font-size:13px; color:#fff; font-weight:600; margin:2px 0;">${pat_escapeHtml(v.infracao.nome)}</div>
        <div style="font-size:11px; color:var(--muted);">${pat_escapeHtml(v.local)}</div>
      </div>
      <button class="btn btn-sm btn-danger" style="padding:6px 10px; border-radius:8px;" onclick="pat_removerVeiculo(${index})">✕</button>
    `;
    container.appendChild(item);
  });
}

function pat_removerVeiculo(index) {
  if (!confirm('Remover este registro?')) return;
  pat_getStore()?.removeAt?.(index);
  pat_renderizarLista();
  if (pat_getVeiculos().length === 0) {
    pat_setBoxVisible('pat_lista_card', false);
  }
}

function pat_limparTudo() {
  if (!confirm('Apagar todo o lote?')) return;
  pat_getStore()?.clear?.();
  pat_renderizarLista();
  pat_setBoxVisible('pat_lista_card', false);
  pat_setBoxVisible('pat_result_area', false);
}

function pat_gerarRelatorio() {
  const txt = pat_getReport()?.build?.(pat_getVeiculos()) || '';
  if (!txt) return;

  const resultText = document.getElementById('pat_result_text');
  const resultArea = document.getElementById('pat_result_area');
  if (resultText) resultText.innerText = txt;
  pat_setBoxVisible('pat_result_area', true);
}

function pat_encerrarPatrulhamento() {
  if (pat_getVeiculos().length === 0) {
    alert('Nenhum registro foi adicionado ao patrulhamento.');
    return;
  }

  pat_gerarRelatorio();
  document.getElementById('pat_result_area')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function pat_baixarTxt() {
  const resultText = document.getElementById('pat_result_text');
  const texto = resultText?.innerText?.trim();

  if (!texto) {
    alert('Finalize o patrulhamento antes de gerar o TXT.');
    return;
  }

  const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dataArquivo = pat_getReport()?.buildFileDate?.(pat_getVeiculos()) || new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');

  link.href = url;
  link.download = `Patrulhamento_PMrv_${dataArquivo}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function pat_setModoPlaca(modo) {
  document.getElementById('pat_placa_manual_wrap')?.classList.toggle('hidden', modo !== 'manual');
  document.getElementById('pat_placa_ocr_wrap')?.classList.toggle('hidden', modo !== 'ocr');
  document.getElementById('btn-pat-placa-manual')?.classList.toggle('btn-primary', modo === 'manual');
  document.getElementById('btn-pat-placa-ocr')?.classList.toggle('btn-primary', modo === 'ocr');
}

function pat_setModoLocal(modo) {
  document.getElementById('pat_local_gps_box')?.classList.toggle('hidden', modo !== 'gps');
  document.getElementById('pat_local_manual_box')?.classList.toggle('hidden', modo !== 'manual');
  document.getElementById('btn-pat-local-gps')?.classList.toggle('btn-primary', modo === 'gps');
  document.getElementById('btn-pat-local-manual')?.classList.toggle('btn-primary', modo === 'manual');
}

function pat_normalizarLocalGps(valor) {
  const texto = String(valor || '').trim();
  if (!texto || texto === PAT_GPS_STATUS_LABEL) return 'GPS nao obtido';
  return texto;
}

function pat_obterGPS() {
  const localInput = document.getElementById('pat_local');
  if (!localInput) return;
  if (!navigator.geolocation) {
    localInput.value = 'GPS nao suportado';
    alert('GPS nao suportado neste dispositivo.');
    return;
  }

  localInput.value = PAT_GPS_STATUS_LABEL;

  navigator.geolocation.getCurrentPosition(
    async pos => {
      const { latitude, longitude } = pos.coords;
      if (typeof window.gps_descreverLocal === 'function') {
        const resultado = await window.gps_descreverLocal(latitude, longitude);
        localInput.value = resultado.localPrincipal || resultado.descricao;
      } else {
        localInput.value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      }
    },
    err => {
      localInput.value = 'GPS nao obtido';
      alert('Erro GPS: ' + err.message);
    },
    { enableHighAccuracy: true, timeout: 5000 }
  );
}

window.pat_init = pat_init;
window.pat_formatarPlaca = pat_formatarPlaca;
window.pat_selectQuick = pat_selectQuick;
window.pat_salvarVeiculo = pat_salvarVeiculo;
window.pat_removerVeiculo = pat_removerVeiculo;
window.pat_limparTudo = pat_limparTudo;
window.pat_gerarRelatorio = pat_gerarRelatorio;
window.pat_encerrarPatrulhamento = pat_encerrarPatrulhamento;
window.pat_baixarTxt = pat_baixarTxt;
window.pat_setModoPlaca = pat_setModoPlaca;
window.pat_setModoLocal = pat_setModoLocal;
window.pat_obterGPS = pat_obterGPS;
window.pat_simularOCR = pat_simularOCR;
window.pat_iniciarVozPlaca = pat_iniciarVozPlaca;
window.pat_iniciarVozLotePlacas = pat_iniciarVozLotePlacas;
window.pat_salvarLotePlacas = pat_salvarLotePlacas;
window.pat_limparLotePlacas = pat_limparLotePlacas;
window.pat_removerPlacaLote = pat_removerPlacaLote;

document.addEventListener('DOMContentLoaded', pat_init);

