/**
 * Modulo: Croqui Dinamico de Sinistros
 * Motor de desenho tecnico para pericia rodoviaria
 */

let CROQUI_SELECTED = null;
let CROQUI_SVG = null;
let CROQUI_CANVAS = null;
let CROQUI_CTX = null;
let CROQUI_DRAGGING = false;
let CROQUI_DRAWING = false;
let CROQUI_DRAG_OFFSET_X = 0;
let CROQUI_DRAG_OFFSET_Y = 0;
let CROQUI_MODO = 'objeto'; // 'objeto', 'pincel', 'borracha'
let CROQUI_LAST_X = 0;
let CROQUI_LAST_Y = 0;

const CROQUI_DEFAULT_TRANSFORM = {
  x: 150,
  y: 150,
  rotate: 0,
  scaleX: 1,
  scaleY: 1
};

const CROQUI_ICON_MAP = {
  v1: { emoji: '🚗', label: 'V1', fontSize: 40 },
  v2: { emoji: '🚘', label: 'V2', fontSize: 40 },
  moto: { emoji: '🏍️', label: 'MOTO', fontSize: 38 },
  caminhao: { emoji: '🚚', label: 'CAMINHAO', fontSize: 40 },
  carreta: { emoji: '🚛', label: 'CARRETA', fontSize: 44 },
  onibus: { emoji: '🚌', label: 'ONIBUS', fontSize: 40 },
  bicicleta: { emoji: '🚲', label: 'BIKE', fontSize: 36 },
  viatura: { emoji: '🚓', label: 'PMRV', fontSize: 40 },
  ambulancia: { emoji: '🚑', label: 'SAMU', fontSize: 40 },
  reboque: { emoji: '🛻', label: 'REBOQUE', fontSize: 38 },
  cone: { emoji: '⚠️', label: 'CONE', fontSize: 28 },
  pare: { emoji: '🛑', label: 'PARE', fontSize: 34 },
  preferencial: { emoji: '🔻', label: 'PREF.', fontSize: 34 },
  semaforo: { emoji: '🚦', label: 'SEMAFORO', fontSize: 34 },
  sem_verde: { emoji: '🟢', label: 'SEM. VERDE', fontSize: 28 },
  sem_vermelho: { emoji: '🔴', label: 'SEM. VERM.', fontSize: 28 },
  arvore: { emoji: '🌳', label: 'ARVORE', fontSize: 34 },
  poste: { emoji: '💡', label: 'POSTE', fontSize: 28 },
  norte: { emoji: '🧭', label: 'NORTE', fontSize: 34 },
  buraco: { emoji: '🕳️', label: 'DEFEITO', fontSize: 30 },
  animal_via: { emoji: '🐄', label: 'ANIMAL', fontSize: 36 },
  pedestre: { emoji: '🚶', label: 'PEDESTRE', fontSize: 34 },
  idoso: { emoji: '👨‍🦳', label: 'IDOSO', fontSize: 30 },
  crianca: { emoji: '🧒', label: 'CRIANCA', fontSize: 30 },
  cadeirante: { emoji: '👨‍🦽', label: 'PCD', fontSize: 30 },
  oleo: { emoji: '🛢️', label: 'OLEO', fontSize: 30 },
  vtr_emergencia: { emoji: '🚨', label: 'EMERG.', fontSize: 30 },
  frenagem: { emoji: '⬛', label: 'FRENAGEM', fontSize: 18, asRect: true }
};

function croqui_getLayer(id) {
  return document.getElementById(id);
}

function croqui_composeTransform({ x, y, rotate, scaleX, scaleY }) {
  return `translate(${x.toFixed(2)}, ${y.toFixed(2)}) rotate(${rotate.toFixed(2)}) scale(${scaleX.toFixed(2)}, ${scaleY.toFixed(2)})`;
}

function croqui_parseTransform(element) {
  const transform = element?.getAttribute('transform') || '';
  const translateMatch = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(transform);
  const rotateMatch = /rotate\(([-\d.]+)\)/.exec(transform);
  const scaleMatch = /scale\(([-\d.]+)(?:[ ,]+([-\d.]+))?\)/.exec(transform);

  const scaleX = scaleMatch ? parseFloat(scaleMatch[1]) : CROQUI_DEFAULT_TRANSFORM.scaleX;
  const scaleY = scaleMatch && scaleMatch[2] ? parseFloat(scaleMatch[2]) : scaleX;

  return {
    x: translateMatch ? parseFloat(translateMatch[1]) : CROQUI_DEFAULT_TRANSFORM.x,
    y: translateMatch ? parseFloat(translateMatch[2]) : CROQUI_DEFAULT_TRANSFORM.y,
    rotate: rotateMatch ? parseFloat(rotateMatch[1]) : CROQUI_DEFAULT_TRANSFORM.rotate,
    scaleX,
    scaleY
  };
}

function croqui_applyTransform(element, patch) {
  const current = croqui_parseTransform(element);
  const next = { ...current, ...patch };
  element.setAttribute('transform', croqui_composeTransform(next));
}

function croqui_createGroup(idPrefix, type, transform) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  element.setAttribute('id', `${idPrefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
  element.setAttribute('data-type', type);
  element.setAttribute('transform', croqui_composeTransform(transform));
  element.style.cursor = 'move';
  return element;
}

function croqui_init() {
  CROQUI_SVG = document.getElementById('croqui-svg');
  CROQUI_CANVAS = document.getElementById('croqui-canvas');
  if (!CROQUI_SVG || !CROQUI_CANVAS) return;

  CROQUI_CTX = CROQUI_CANVAS.getContext('2d');
  
  const container = document.getElementById('croqui-container');
  if (!container) return;

  // Eventos no container para capturar ambos (SVG e Canvas)
  container.addEventListener('mousedown', croqui_onStart);
  container.addEventListener('mousemove', croqui_onMove);
  container.addEventListener('mouseup', croqui_onEnd);
  container.addEventListener('mouseleave', croqui_onEnd);

  container.addEventListener('touchstart', croqui_onStart, { passive: false });
  container.addEventListener('touchmove', croqui_onMove, { passive: false });
  container.addEventListener('touchend', croqui_onEnd, { passive: false });
  container.addEventListener('touchcancel', croqui_onEnd, { passive: false });
}

function croqui_setModo(modo) {
  CROQUI_MODO = modo;
  const btnObj = document.getElementById('croqui-btn-objeto');
  const btnPin = document.getElementById('croqui-btn-pincel');
  const btnBor = document.getElementById('croqui-btn-borracha');

  [btnObj, btnPin, btnBor].forEach(b => b?.classList.remove('btn-primary'));

  if (modo === 'objeto') {
    btnObj?.classList.add('btn-primary');
    CROQUI_CANVAS.style.pointerEvents = 'none';
  } else {
    if (modo === 'pincel') btnPin?.classList.add('btn-primary');
    if (modo === 'borracha') btnBor?.classList.add('btn-primary');
    CROQUI_CANVAS.style.pointerEvents = 'auto';
  }
  
  croqui_clearSelection();
}

function croqui_onStart(event) {
  if (event.cancelable) event.preventDefault();

  const coords = croqui_getCoords(event);

  if (CROQUI_MODO === 'objeto') {
    const target = event.target.closest('g[id]');
    if (!target) {
      croqui_clearSelection();
      return;
    }
    croqui_selecionar(target);
    CROQUI_DRAGGING = true;
    const transform = croqui_parseTransform(target);
    CROQUI_DRAG_OFFSET_X = coords.x - transform.x;
    CROQUI_DRAG_OFFSET_Y = coords.y - transform.y;
  } else {
    CROQUI_DRAWING = true;
    CROQUI_LAST_X = coords.x * 2; // Canvas é 2x o SVG (840x640)
    CROQUI_LAST_Y = coords.y * 2;
    
    CROQUI_CTX.beginPath();
    CROQUI_CTX.moveTo(CROQUI_LAST_X, CROQUI_LAST_Y);
    
    if (CROQUI_MODO === 'pincel') {
      CROQUI_CTX.strokeStyle = '#555';
      CROQUI_CTX.lineWidth = 12;
      CROQUI_CTX.lineCap = 'round';
      CROQUI_CTX.lineJoin = 'round';
      CROQUI_CTX.globalCompositeOperation = 'source-over';
    } else {
      CROQUI_CTX.lineWidth = 40;
      CROQUI_CTX.globalCompositeOperation = 'destination-out';
    }
  }
}

function croqui_onMove(event) {
  event.preventDefault();
  const coords = croqui_getCoords(event);

  if (CROQUI_DRAGGING && CROQUI_SELECTED) {
    croqui_applyTransform(CROQUI_SELECTED, {
      x: coords.x - CROQUI_DRAG_OFFSET_X,
      y: coords.y - CROQUI_DRAG_OFFSET_Y
    });
  } else if (CROQUI_DRAWING) {
    const currX = coords.x * 2;
    const currY = coords.y * 2;
    
    // Suavização simples
    CROQUI_CTX.lineTo(currX, currY);
    CROQUI_CTX.stroke();
    
    CROQUI_LAST_X = currX;
    CROQUI_LAST_Y = currY;
  }
}

function croqui_onEnd() {
  CROQUI_DRAGGING = false;
  CROQUI_DRAWING = false;
  if (CROQUI_CTX) CROQUI_CTX.closePath();
}

function croqui_getCoords(event) {
  const rect = CROQUI_SVG.getBoundingClientRect();
  const point = event.touches ? event.touches[0] : event;
  
  return {
    x: (point.clientX - rect.left) * (420 / rect.width),
    y: (point.clientY - rect.top) * (320 / rect.height)
  };
}

function croqui_limpar() {
  if (!confirm('Deseja limpar todo o croqui?')) return;
  croqui_getLayer('croqui-vias').innerHTML = '';
  croqui_getLayer('croqui-objetos').innerHTML = '';
  if (CROQUI_CTX) {
    CROQUI_CTX.clearRect(0, 0, CROQUI_CANVAS.width, CROQUI_CANVAS.height);
  }
  croqui_clearSelection();
}

async function croqui_exportar() {
  if (!CROQUI_SVG || !CROQUI_CANVAS) return;

  const canvas = document.createElement('canvas');
  canvas.width = 1680; // Alta resolução (4K-ish)
  canvas.height = 1280;
  const ctx = canvas.getContext('2d');

  // 1. Fundo
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Renderizar SVG (Vias e Objetos)
  const svgData = new XMLSerializer().serializeToString(CROQUI_SVG);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const imgSvg = new Image();

  imgSvg.onload = () => {
    ctx.drawImage(imgSvg, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    // 3. Renderizar Canvas de Desenho
    ctx.drawImage(CROQUI_CANVAS, 0, 0, canvas.width, canvas.height);

    // 4. Marca d'água PMRv (Opcional, mas profissional)
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('PMRv-SC | Croqui Digital Pericial', 40, canvas.height - 40);
    ctx.fillText(new Date().toLocaleString('pt-BR'), canvas.width - 300, canvas.height - 40);

    // Download
    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `Croqui_Pericial_PMRv_${Date.now()}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  imgSvg.src = url;
}

function croqui_whatsapp() {
  alert("Dica: use 'Salvar PNG' e anexe a imagem no WhatsApp.");
}

function croqui_resetCanvas() {
  croqui_getLayer('croqui-vias').innerHTML = '';
  croqui_getLayer('croqui-objetos').innerHTML = '';
  croqui_clearSelection();
}

function croqui_placeSelected(transform) {
  if (!CROQUI_SELECTED) return;
  croqui_applyTransform(CROQUI_SELECTED, transform);
}

function croqui_placeElement(element, transform) {
  if (!element) return null;
  croqui_applyTransform(element, transform);
  return element;
}

async function croqui_aplicarModelo(tipo) {
  if (!confirm('Isso ira limpar o desenho atual para aplicar o modelo. Continuar?')) return;

  croqui_resetCanvas();

  if (tipo === 'frontal') {
    croqui_adicionarVia('reta');
    const v1 = croqui_inserirIcone('v1');
    croqui_placeElement(v1, { x: 80, y: 185 });
    const v2 = croqui_inserirIcone('v2');
    croqui_placeElement(v2, { x: 220, y: 185, rotate: 180 });
    const impacto = await croqui_inserirSvg('3.1-colisao-frontal.svg');
    croqui_placeElement(impacto, { x: 150, y: 185 });
  } else if (tipo === 'traseira') {
    croqui_adicionarVia('reta');
    const v1 = croqui_inserirIcone('v1');
    croqui_placeElement(v1, { x: 200, y: 185 });
    const v2 = croqui_inserirIcone('v2');
    croqui_placeElement(v2, { x: 100, y: 185 });
    const impacto = await croqui_inserirSvg('3.2-colisao-traseira.svg');
    croqui_placeElement(impacto, { x: 180, y: 185 });
  } else if (tipo === 'transversal') {
    croqui_adicionarVia('cruzamento');
    const v1 = croqui_inserirIcone('v1');
    croqui_placeElement(v1, { x: 130, y: 220, rotate: -90 });
    const v2 = croqui_inserirIcone('v2');
    croqui_placeElement(v2, { x: 220, y: 130, rotate: 180 });
    const impacto = await croqui_inserirSvg('2.3-abalroamento-transversal.svg');
    croqui_placeElement(impacto, { x: 130, y: 130 });
  } else if (tipo === 'saida') {
    croqui_adicionarVia('curva');
    const v1 = croqui_inserirIcone('v1');
    croqui_placeElement(v1, { x: 100, y: 100, rotate: 45 });
    const impacto = await croqui_inserirSvg('5.3-saida-pista-capotamento.svg');
    croqui_placeElement(impacto, { x: 120, y: 120 });
  }

  croqui_fecharModal();
}

window.croqui_init = croqui_init;
window.croqui_setModo = croqui_setModo;
window.croqui_adicionarVia = croqui_adicionarVia;
window.croqui_abrirModalIcones = croqui_abrirModalIcones;
window.croqui_fecharModal = croqui_fecharModal;
window.croqui_fecharModalOnBackdrop = croqui_fecharModalOnBackdrop;
window.croqui_filtrarIcones = croqui_filtrarIcones;
window.croqui_inserirIcone = croqui_inserirIcone;
window.croqui_inserirSvg = croqui_inserirSvg;
window.croqui_inserirPistaSvg = croqui_inserirPistaSvg;
window.croqui_girar = croqui_girar;
window.croqui_escala = croqui_escala;
window.croqui_espelhar = croqui_espelhar;
window.croqui_camada = croqui_camada;
window.croqui_limpar = croqui_limpar;
window.croqui_exportar = croqui_exportar;
window.croqui_whatsapp = croqui_whatsapp;
window.croqui_aplicarModelo = croqui_aplicarModelo;

document.addEventListener('DOMContentLoaded', croqui_init);
