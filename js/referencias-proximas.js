/**
 * Modulo: Referencias Proximas - Alta Precisão (EITTR)
 * Foco em Marco Único Oficial a cada 200 metros.
 */

(function() {
  function refProxPopulateRodovias() {
    const select = document.getElementById('ref_prox_rodovia');
    if (!select) return;

    // Obtém rodovias da base de 200m
    const data = window.GRANDE_FLORIANOPOLIS_REFERENCIAS;
    if (!data || !data.rows) {
      console.warn('[RefProx] Base de dados GRANDE_FLORIANOPOLIS_REFERENCIAS não carregada.');
      return;
    }

    const rows = data.rows;
    // Extrai rodovias únicas
    const rodovias = [...new Set(rows.map(row => row.rodovia).filter(Boolean))].sort((a, b) => {
      // Ordenação numérica se possível (ex: SC-401 antes de SC-405)
      const numA = parseInt(a.replace(/\D/g, ''));
      const numB = parseInt(b.replace(/\D/g, ''));
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
    
    const valorAtual = select.value;
    select.innerHTML = '<option value="">-- Selecione Rodovia --</option>';
    rodovias.forEach(rod => {
      const opt = document.createElement('option');
      opt.value = rod;
      opt.textContent = rod;
      select.appendChild(opt);
    });
    if (valorAtual) select.value = valorAtual;
    console.log('[RefProx] Rodovias carregadas:', rodovias);
  }

  window.ref_prox_init = function() {
    refProxPopulateRodovias();
    window.ref_prox_atualizarReferenciaPrincipal();
  };

  let REF_PROX_OFFROAD_ACTIVE = false;

  window.ref_prox_toggleOffroad = function(el) {
    REF_PROX_OFFROAD_ACTIVE = !!el.checked;
    console.log('[RefProx] Modo Off-Road:', REF_PROX_OFFROAD_ACTIVE);
  };

  /**
   * Busca o MARCO ÚNICO oficial mais próximo do KM solicitado.
   */
  window.ref_prox_buscar = async function() {
    const rodovia = document.getElementById('ref_prox_rodovia').value;
    const kmManualStr = document.getElementById('ref_prox_km').value;
    const container = document.getElementById('ref_prox_results');
    const statusEl = document.getElementById('ref_prox_status');
    const btnBusca = document.getElementById('btn-ref-prox-buscar');

    if (!rodovia) {
      alert('Selecione uma rodovia primeiro.');
      return;
    }

    const kmSolicitado = kmManualStr ? parseFloat(kmManualStr.replace(',', '.')) : -1;
    if (kmSolicitado < 0) {
      alert('Informe o KM para localizar o marco oficial.');
      return;
    }

    btnBusca.disabled = true;
    btnBusca.innerText = 'Localizando Referências...';
    
    // Simula processamento pericial
    await new Promise(r => setTimeout(r, 400));

    const allRefs = window.GRANDE_FLORIANOPOLIS_REFERENCIAS?.rows || [];
    const filtered = allRefs.filter(r => r.rodovia === rodovia);

    if (filtered.length === 0) {
      container.innerHTML = `<div class="card" style="text-align:center; padding:20px;">Rodovia ${rodovia} não encontrada na base de 200m.</div>`;
      btnBusca.disabled = false;
      btnBusca.innerText = '🔍 Buscar ao longo da rota';
      return;
    }

    // Encontra o marco mais próximo (Eixo da Via)
    let marcoUnico = filtered[0];
    let menorDiff = Math.abs(parseFloat(filtered[0].km) - kmSolicitado);

    filtered.forEach(r => {
      const diff = Math.abs(parseFloat(r.km) - kmSolicitado);
      if (diff < menorDiff) {
        menorDiff = diff;
        marcoUnico = r;
      }
    });

    const distMetros = Math.round(menorDiff * 1000);
    
    // Busca o POI ABSOLUTO mais próximo (limite de 50m para ser 'Principal')
    const poiPrincipal = buscarPoiMaisProximo(rodovia, kmSolicitado, 0.050); // 50 metros
    
    renderReferenciaPrincipal(marcoUnico, distMetros, poiPrincipal, kmSolicitado);
    
    statusEl.innerText = `Referência de precisão 50m identificada.`;
    btnBusca.disabled = false;
    btnBusca.innerText = '🔍 Buscar ao longo da rota';
  };

  function buscarPoiMaisProximo(rodovia, kmSolicitado, raioKm) {
    const base100m = window.GRANDE_FLORIANOPOLIS_REFERENCIAS_100M?.rows || [];
    const candidates = base100m.filter(p => p.rodovia === rodovia);
    
    if (candidates.length === 0) return null;

    let closest = null;
    let minDiff = Infinity;

    candidates.forEach(p => {
      const diff = Math.abs(parseFloat(p.km) - kmSolicitado);
      if (diff < minDiff && diff <= raioKm) {
        minDiff = diff;
        closest = p;
      }
    });

    return closest ? { ...closest, diffMetros: Math.round(minDiff * 1000) } : null;
  }

  function buscarTodasProximas(rodovia, kmSolicitado) {
    const base100m = window.GRANDE_FLORIANOPOLIS_REFERENCIAS_100M?.rows || [];
    const raioBusca = 0.300; // 300 metros para a lista expandida
    
    return base100m
      .filter(p => p.rodovia === rodovia && Math.abs(p.km - kmSolicitado) <= raioBusca)
      .map(p => ({ ...p, diffMetros: Math.round(Math.abs(p.km - kmSolicitado) * 1000) }))
      .sort((a, b) => a.diffMetros - b.diffMetros);
  }

  window.ref_prox_verOutras = function(rodovia, kmSolicitado) {
    const todos = buscarTodasProximas(rodovia, parseFloat(kmSolicitado));
    const container = document.getElementById('ref_prox_extra_list');
    if (!container) return;

    if (todos.length <= 1) {
      container.innerHTML = '<div style="font-size:12px; color:var(--muted); padding:10px;">Nenhuma outra referência encontrada num raio de 300m.</div>';
      return;
    }

    // Pula a primeira (que pode ser a principal)
    const listaHtml = todos.map(item => `
      <div class="card" style="margin-bottom:8px; padding:10px; background:rgba(255,255,255,0.02); border:1px solid var(--border);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:13px; font-weight:600;">${item.descricao}</div>
          <div style="font-size:10px; background:var(--surface); padding:2px 6px; border-radius:4px;">${item.diffMetros}m</div>
        </div>
        <div style="font-size:11px; color:var(--muted); margin-top:4px;">KM ${parseFloat(item.km).toFixed(3).replace('.', ',')}</div>
        <button class="btn btn-sm btn-link" style="padding:4px 0; color:var(--primary); font-size:11px; text-decoration:none; display:flex; align-items:center; gap:4px;" onclick="window.open('https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}', '_blank')">
          🌍 Abrir Localização
        </button>
      </div>
    `).join('');

    container.innerHTML = `
      <div style="margin-top:15px; border-top:1px solid var(--border); padding-top:15px;">
        <div style="font-size:11px; font-weight:bold; color:var(--muted); text-transform:uppercase; margin-bottom:10px;">Outras Referências Detectadas</div>
        ${listaHtml}
      </div>
    `;
    document.getElementById('btn-ref-ver-outras').style.display = 'none';
  };

  function renderReferenciaPrincipal(marco, distMarco, poi, kmSolicitado) {
    const container = document.getElementById('ref_prox_results');
    const kmSolicitadoLabel = kmSolicitado.toFixed(3).replace('.', ',');

    // Trecho Crítico
    const isCritical = checkIsCritical(marco.rodovia, kmSolicitado);
    let alertHtml = '';
    if (isCritical) {
      alertHtml = `
        <div style="background:#e74c3c; color:#fff; padding:12px; border-radius:10px; margin-bottom:15px; font-weight:bold; display:flex; align-items:center; gap:12px; border:2px solid #c0392b;">
          <span style="font-size:24px;">⚠️</span>
          <div>
            <div style="font-size:10px; text-transform:uppercase; opacity:0.9; letter-spacing:1px;">Alerta de Segurança PMRv</div>
            <div style="font-size:13px;">${isCritical.desc}</div>
          </div>
        </div>
      `;
    }

    // Se houver POI a menos de 50m, ele é a estrela. Caso contrário, usa o Marco de 200m como principal.
    const refPrincipal = (poi && poi.diffMetros <= 50) ? poi : marco;
    const distPrincipal = (poi && poi.diffMetros <= 50) ? poi.diffMetros : distMarco;
    const isPoi = (poi && poi.diffMetros <= 50);

    container.innerHTML = `
      ${alertHtml}
      
      <div style="text-align:center; margin-bottom:15px;">
        <div style="font-size:10px; color:var(--muted); font-weight:bold; text-transform:uppercase;">Local do Sinistro</div>
        <div style="font-size:20px; font-weight:900; color:var(--text);">KM ${kmSolicitadoLabel}</div>
      </div>

      <div class="card" style="border:2px solid ${isPoi ? '#2ecc71' : 'var(--primary)'}; background:rgba(${isPoi ? '46,204,113' : '245,130,32'}, 0.05);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <span style="font-size:11px; font-weight:900; color:${isPoi ? '#27ae60' : 'var(--primary)'}; text-transform:uppercase;">
            ${isPoi ? '📍 Referência Google (POI) Próxima' : '📍 Marco Oficial (200m)'}
          </span>
          <span style="font-size:10px; background:${isPoi ? '#2ecc71' : 'var(--primary)'}; color:#fff; padding:2px 8px; border-radius:99px; font-weight:bold;">
            A ${distPrincipal}m do local
          </span>
        </div>
        
        <div style="text-align:center; padding:10px 0; border-bottom:1px solid var(--border); margin-bottom:15px;">
          <div style="font-size:14px; color:var(--muted); font-weight:700;">${refPrincipal.rodovia}</div>
          <div style="font-size:38px; font-weight:900; color:var(--text); letter-spacing:-1px;">KM ${parseFloat(refPrincipal.km).toFixed(3).replace('.', ',')}</div>
        </div>

        <div style="background:var(--surface); padding:15px; border-radius:10px; border:1px solid var(--border);">
          <div style="font-size:11px; color:var(--muted); text-transform:uppercase; font-weight:bold; margin-bottom:4px;">Descrição</div>
          <div style="font-size:18px; color:var(--text); font-weight:700; line-height:1.3;">${refPrincipal.descricao}</div>
        </div>

        <div style="margin-top:15px; display:grid; grid-template-columns:1fr; gap:10px;">
          <button class="btn btn-primary" onclick="window.open('https://www.google.com/maps/search/?api=1&query=${refPrincipal.lat},${refPrincipal.lng}', '_blank')">
            🌍 Abrir no Google Maps
          </button>
        </div>
      </div>

      <div id="ref_prox_extra_list"></div>

      <button class="btn btn-full mt-12" id="btn-ref-ver-outras" onclick="ref_prox_verOutras('${marco.rodovia}', '${kmSolicitado}')">
        📋 Ver outras referências neste KM
      </button>
    `;
  }

  window.ref_prox_atualizarReferenciaPrincipal = function(roadName, startKm) {
    const rodovia = roadName !== undefined ? roadName : document.getElementById('ref_prox_rodovia')?.value;
    const kmRaw = startKm !== undefined ? startKm : document.getElementById('ref_prox_km')?.value;
    
    const container = document.getElementById('ref_prox_results');
    if (!container) return;

    if (!rodovia) {
      container.innerHTML = `
        <div class="card" style="border:1px dashed var(--border); text-align:center; padding:30px;">
          <div style="font-size:40px; margin-bottom:10px;">📍</div>
          <div style="font-size:14px; font-weight:700; color:var(--text);">Aguardando Localização GPS</div>
          <p style="font-size:12px; color:var(--muted); margin-top:5px;">O marco oficial de 200m será exibido aqui automaticamente.</p>
        </div>
      `;
    }
  };

})();
