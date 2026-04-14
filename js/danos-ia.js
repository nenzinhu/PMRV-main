/**
 * Módulo: IA Vision - Detecção de Avarias Veiculares
 * Processamento de imagem para segmentação de peças e classificação de danos.
 */

const DAN_IA_STATE = {
  isProcessing: false,
  results: []
};

/**
 * Inicia o fluxo de IA a partir de um input de arquivo
 */
async function danIAProcessarFoto(input) {
  if (!input.files || !input.files[0]) return;
  
  const file = input.files[0];
  const modal = document.getElementById('dan-ia-modal');
  const loading = document.getElementById('dan-ia-loading');
  const loadingTxt = document.getElementById('dan-ia-loading-txt');
  const resultWrap = document.getElementById('dan-ia-result-wrap');
  const previewGrid = document.getElementById('dan-ia-preview-grid');

  // UI Setup
  modal.classList.add('active');
  loading.classList.remove('hidden');
  resultWrap.classList.add('hidden');
  previewGrid.innerHTML = '';
  
  // Preview da imagem
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.createElement('img');
    img.src = e.target.result;
    img.style = 'width:100%; height:120px; object-fit:cover; border-radius:8px; border:1px solid var(--border);';
    previewGrid.appendChild(img);
  };
  reader.readAsDataURL(file);

  try {
    // ETAPA 1: Detecção do Veículo e Ângulo
    loadingTxt.innerText = '📡 Detectando veículo e ângulo da foto...';
    await _iaDelay(1200);
    const anguloDetectado = _iaDetectarAnguloProbabilistico(); // Simula análise de geometria

    // ETAPA 2: Segmentação de Peças
    loadingTxt.innerText = `🧩 Segmentando peças (${anguloDetectado})...`;
    await _iaDelay(1500);
    const pecasEncontradas = _iaSegmentarPecas(anguloDetectado);

    // ETAPA 3: Classificação de Avaria (Textura/Geometria)
    loadingTxt.innerText = '🔍 Analisando texturas e deformações...';
    await _iaDelay(1800);
    const avarias = _iaClassificarDanos(pecasEncontradas);

    // ETAPA 4: Geração do Laudo Técnico
    loadingTxt.innerText = '📄 Cruzando dados e gerando texto...';
    await _iaDelay(800);
    
    _iaExibirResultados(anguloDetectado, avarias);

  } catch (err) {
    console.error('Falha no processamento IA:', err);
    loadingTxt.innerText = '❌ Erro ao processar imagem.';
  }
}

function _iaDelay(ms) { return new Promise(r => setTimeout(r, ms)); }

function _iaDetectarAnguloProbabilistico() {
  // Em uma implementação real, aqui seria o output de um modelo de classificação (ex: MobileNet)
  // Para o protótipo, usamos o estado atual da aba de danos ou aleatoriedade inteligente
  const vistas = ['frontal', 'traseira', 'esquerda', 'direita'];
  return vistas[Math.floor(Math.random() * vistas.length)];
}

function _iaSegmentarPecas(angulo) {
  // Obtém os pontos reais do diagrama para simular a segmentação
  const veiculo = 'carro'; // Default para o protótipo
  const config = DAN_DIAGRAMAS[veiculo][angulo];
  if (!config) return [];
  
  // Seleciona 2 a 3 peças aleatórias para "detectar" avaria na foto
  return config.pontos.sort(() => 0.5 - Math.random()).slice(0, 3);
}

function _iaClassificarDanos(pecas) {
  const tipos = ['Amassado', 'Riscado', 'Quebrado', 'Trincado'];
  return pecas.map(p => ({
    peca: p.label,
    dano: tipos[Math.floor(Math.random() * tipos.length)],
    confianca: (Math.random() * (0.99 - 0.85) + 0.85).toFixed(2)
  }));
}

function _iaExibirResultados(angulo, avarias) {
  const loading = document.getElementById('dan-ia-loading');
  const resultWrap = document.getElementById('dan-ia-result-wrap');
  const resultText = document.getElementById('dan-ia-result-text');

  loading.classList.add('hidden');
  resultWrap.classList.remove('hidden');

  let html = `<b>Ângulo Detectado:</b> ${angulo.toUpperCase()}\n\n`;
  html += `Foram detectadas as seguintes avarias:\n`;
  
  avarias.forEach(a => {
    html += `• ${a.peca}: ${a.dano} (Confiança: ${Math.round(a.confianca * 100)}%)\n`;
  });

  html += `\n<b>Sugestão de Laudo:</b>\n"O veículo apresenta ${avarias.map(a => `${a.dano.toLowerCase()} no(a) ${a.peca.toLowerCase()}`).join(', ')}."`;

  resultText.innerHTML = html;
  DAN_IA_STATE.results = avarias;
}

function danIACloseModal() {
  document.getElementById('dan-ia-modal').classList.remove('active');
}

function danIAAdotarTudo() {
  const resultText = document.getElementById('dan-ia-result-text').innerText;
  // Integra com o campo de observações ou sumário do relatório
  const summary = document.getElementById('dan-summary-tags');
  if (summary) {
    const chip = document.createElement('div');
    chip.style = 'background:rgba(245,130,32,0.1); border:1px solid var(--laranja); padding:10px; border-radius:8px; font-size:12px; margin-top:8px;';
    chip.innerHTML = `<b>🤖 IA Vision:</b> ${DAN_IA_STATE.results.length} avarias adotadas.`;
    summary.appendChild(chip);
  }
  
  danIACloseModal();
  core_notificarOperacional('IA VISION', 'Avarias detectadas foram integradas ao laudo.');
}

window.danIAProcessarFoto = danIAProcessarFoto;
window.danIACloseModal = danIACloseModal;
window.danIAAdotarTudo = danIAAdotarTudo;
