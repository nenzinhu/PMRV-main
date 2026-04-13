/**
 * Módulo: Relatório Completo (Consolidação de Todos os Módulos)
 */

/**
 * Motor Pericial EITTR - Estampagem e Consolidação Visual
 */

/**
 * Carimba metadados periciais em uma imagem via Canvas.
 * @param {HTMLImageElement|File} imageSource 
 * @param {Object} metadata { rodovia, km, lat, lng, viatura }
 * @returns {Promise<string>} DataURL da imagem carimbada
 */
async function rel_estamparFoto(imageSource, metadata) {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    const process = (srcImg) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Mantém proporção original, mas limita para 1920px (Full HD) para performance
      const scale = Math.min(1, 1920 / srcImg.width);
      canvas.width = srcImg.width * scale;
      canvas.height = srcImg.height * scale;

      ctx.drawImage(srcImg, 0, 0, canvas.width, canvas.height);

      // Tarja Pericial (Fundo semi-transparente)
      const barHeight = canvas.height * 0.08;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

      // Texto do Carimbo
      ctx.fillStyle = '#FFFFFF';
      const fontSize = Math.round(barHeight * 0.3);
      ctx.font = `bold ${fontSize}px Roboto, Arial, sans-serif`;
      
      const line1 = `PMRv-SC | ${metadata.rodovia || 'Rodovia N/I'} KM ${metadata.km || '---'}`;
      const line2 = `COORD: ${metadata.lat.toFixed(6)}, ${metadata.lng.toFixed(6)} | ${new Date().toLocaleString('pt-BR')}`;
      const line3 = `VIATURA: ${metadata.viatura || 'OPERACIONAL'}`;

      ctx.fillText(line1, 20, canvas.height - barHeight + (fontSize * 1.2));
      ctx.font = `${fontSize * 0.8}px monospace`;
      ctx.fillText(line2, 20, canvas.height - barHeight + (fontSize * 2.5));
      ctx.fillText(line3, canvas.width - ctx.measureText(line3).width - 20, canvas.height - barHeight + (fontSize * 2.5));

      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };

    if (imageSource instanceof File) {
      reader.onload = (e) => {
        img.onload = () => process(img);
        img.src = e.target.result;
      };
      reader.readAsDataURL(imageSource);
    } else {
      img.onload = () => process(img);
      img.src = imageSource.src;
    }
  });
}

function relFull_gerarTexto() {
  const data = new Date().toLocaleDateString('pt-BR');
  const rodovia = document.getElementById('pmrv_rodovia')?.value || 'N/I';
  const km = document.getElementById('pmrv_km')?.value || '---';
  
  let txt = '📋 *LAUDO PERICIAL OPERACIONAL — PMRv SC*\n';
  txt += `Local: ${rodovia} KM ${km}\n`;
  txt += 'Data: ' + data + ' ' + new Date().toLocaleTimeString('pt-BR') + '\n';
  txt += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  // ── 🚔 PATRULHAMENTO (Lote de Infrações) ───────────────────
  if (typeof PAT_VEICULOS !== 'undefined' && PAT_VEICULOS.length > 0) {
    txt += '\n🚔 *INFRAÇÕES REGISTRADAS*\n';
    PAT_VEICULOS.forEach((v, i) => {
      txt += `${i+1}. [${v.placa}] - ${v.infracao.nome} (${v.hora})\n`;
      if (v.infracao.medida) txt += `   └ Medida: ${v.infracao.medida}\n`;
    });
    txt += '──────────────────────────\n';
  }

  // ── 👥 ENVOLVIDOS (Sinistro) ────────────────────────────────
  txt += '\n👥 *ENVOLVIDOS E RELATOS*\n';
  const cards = document.querySelectorAll('#env_lista .person-card');
  if (!cards.length) {
    txt += '(nenhum envolvido registrado)\n';
  } else {
    cards.forEach(function(c, i) {
      const nome     = (c.querySelector('.nome')?.value     || '').trim().toUpperCase();
      const placa    = (c.querySelector('.placa')?.value    || '').trim().toUpperCase();
      const relato   = (c.querySelector('.relato')?.value   || '').trim();
      const tipo     = (c.querySelector('.tipo')?.value     || 'ENVOLVIDO').toUpperCase();
      txt += `\n*${tipo} ${i+1}:* ${nome || 'N/I'}\n`;
      if (placa)  txt += `- Placa/Vei: ${placa}\n`;
      if (relato) txt += `- Relato: "${relato}"\n`;
    });
  }

  // ── 🚗 DANOS APARENTES ──────────────────────────────────────
  if (typeof danVeiculosSalvos !== 'undefined' && danVeiculosSalvos.length > 0) {
    txt += '\n🚗 *MAPA DE AVARIAS*\n';
    danVeiculosSalvos.forEach(function(v, idx) {
      txt += `\n*V${idx+1} (${v.tipo.toUpperCase()}):* `;
      let danosArr = [];
      if (v.tipo === 'moto' && v.v360db) {
        ['frente', 'tras', 'direita', 'esquerda'].forEach(tab => {
          (v.v360db[tab] || []).forEach(item => {
            if (item.dano !== null) danosArr.push(`${item.nome}(${item.dano})`);
          });
        });
      } else {
        danosArr = Object.entries(v.danos || {}).map(([id, tipo]) => `${id}:${tipo}`);
      }
      txt += danosArr.length ? danosArr.join(', ') : 'Sem avarias visíveis.';
      txt += '\n';
    });
  }

  // ── ⚖️ PESOS E DIMENSÕES ────────────────────────────────────
  const pbtVal = document.getElementById('res_pbt_apurado')?.innerText;
  if (pbtVal && pbtVal !== '0 kg') {
    txt += '\n⚖️ *PESOS E DIMENSÕES*\n';
    txt += `- PBT Apurado: ${pbtVal}\n`;
    const excesso = document.getElementById('res_pbt_excesso')?.innerText;
    if (excesso && excesso !== '0 kg') txt += `- EXCESSO: ${excesso} (Art. 231 V)\n`;
  }

  txt += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  txt += '_Documento gerado para fins de registro operacional PMRv-SC_';
  return txt;
}


function relFull_gerar() {
  const texto = relFull_gerarTexto();
  const resText = document.getElementById('rel-result-text');
  const resArea = document.getElementById('rel-result-area');
  
  if (resText) resText.textContent = texto;
  if (resArea) {
    resArea.style.display = 'block';
    resArea.scrollIntoView({ behavior: 'smooth' });
  }
}

function relFull_copiar(btn) {
  const text = document.getElementById('rel-result-text').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const old = btn.innerHTML;
    btn.innerHTML = '✅ Copiado!';
    setTimeout(() => btn.innerHTML = old, 2000);
  });
}

function relFull_whatsapp() {
  const texto = document.getElementById('rel-result-text').textContent || relFull_gerarTexto();
  window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank');
}

// Funções de fotos mantidas conforme original para compatibilidade
window.relFull_gerar = relFull_gerar;
window.relFull_copiar = relFull_copiar;
window.relFull_whatsapp = relFull_whatsapp;
window.relFull_gerarTexto = relFull_gerarTexto;
