/**
 * Modulo: Referencias Proximas - Base Local 200m (amostrado da base 100m)
 */

(function() {
  const REF_PROX_CATEGORY_KEYWORDS = {
    '7311': ['posto', 'petrobras', 'ipiranga', 'shell', 'galo', 'combustivel', 'gasolina'],
    '7322': ['samu'],
    '7324': ['bombeiro', 'bombeiros'],
    '7323': ['policia', 'policial', 'pmrv', 'delegacia', 'posto policial'],
    '9113': ['borracharia'],
    '9361009': ['conveniencia', 'loja de conveniencia'],
    '7321': ['hospital', 'upa', 'posto de saude', 'unidade de saude', 'saude', 'ubs', 'pronto atendimento', 'clinica'],
    '7326': ['farmacia', 'drogaria'],
    '7315': ['restaurante', 'lanchonete', 'cafe', 'cafeteria'],
    '9361': ['loja', 'shopping', 'mercado', 'supermercado'],
    'bank': ['banco', 'caixa economica', 'bradesco', 'itau', 'santander', 'sicredi', 'sicoob', 'banco do brasil', 'caixa'],
    'icecream': ['sorveteria', 'sorvete', 'gelato', 'acai'],
    'restroom': ['banheiro', 'sanitario', 'toalete', 'wc']
  };

  function refProxNormalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function refProxGetSelectedCategories() {
    return Array.from(document.querySelectorAll('#ref_prox_categorias [data-cat-id].btn-primary'))
      .map(btn => btn.getAttribute('data-cat-id'))
      .filter(Boolean);
  }

  function refProxRefMatchesCategories(ref, selectedCats) {
    if (!selectedCats.length) return true;
    const text = refProxNormalize(ref?.descricao || '');

    return selectedCats.some((catId) => {
      const keywords = REF_PROX_CATEGORY_KEYWORDS[catId] || [];
      return keywords.some(keyword => text.includes(refProxNormalize(keyword)));
    });
  }

  function refProxBuildCategorySummary(selectedCats) {
    if (!selectedCats.length) return 'Sem filtro de categoria.';
    const labels = selectedCats
      .map(catId => document.querySelector(`#ref_prox_categorias [data-cat-id="${catId}"]`)?.textContent?.trim())
      .filter(Boolean);
    return `Filtros ativos: ${labels.join(' | ')}`;
  }

  function refProxIs200mMarker(ref) {
    const metros = Math.round(Number(ref?.km || 0) * 1000);
    return metros % 200 === 0;
  }

  function refProxPopulateRodovias() {
    const select = document.getElementById('ref_prox_rodovia');
    if (!select) return;

    const rows = window.GRANDE_FLORIANOPOLIS_REFERENCIAS_100M?.rows || [];
    const rodoviasBase = [...new Set(rows.map(row => row.rodovia).filter(Boolean))];
    const rodoviasExtras = ['SC-411'];
    const rodovias = [...new Set([...rodoviasBase, ...rodoviasExtras])].sort((a, b) => a.localeCompare(b));
    const valorAtual = select.value;

    select.innerHTML = '<option value="">-- Selecione --</option>';
    rodovias.forEach((rodovia) => {
      const option = document.createElement('option');
      option.value = rodovia;
      option.textContent = rodovia;
      select.appendChild(option);
    });

    if (valorAtual && rodovias.includes(valorAtual)) {
      select.value = valorAtual;
    }
  }

  window.ref_prox_init = function() {
    refProxPopulateRodovias();
    if (typeof gps_preencherSelects === 'function') {
      gps_preencherSelects();
    }
    refProxPopulateRodovias();
    window.ref_prox_atualizarReferenciaPrincipal();
  };

  window.ref_prox_toggleCat = function(btn, catId) {
    btn.classList.toggle('btn-primary');
    btn.classList.toggle('btn-outline');
    btn.setAttribute('aria-pressed', btn.classList.contains('btn-primary') ? 'true' : 'false');
  };

  window.ref_prox_buscar = async function() {
    const rodovia = document.getElementById('ref_prox_rodovia').value;
    const kmManualStr = document.getElementById('ref_prox_km').value;
    const resultsContainer = document.getElementById('ref_prox_results');
    const statusEl = document.getElementById('ref_prox_status');
    const btnBusca = document.getElementById('btn-ref-prox-buscar');
    const selectedCats = refProxGetSelectedCategories();

    if (!rodovia) {
      alert('Selecione uma rodovia primeiro.');
      return;
    }

    let kmManual = -1;
    if (kmManualStr) {
      kmManual = parseFloat(kmManualStr.replace(',', '.'));
      if (isNaN(kmManual)) kmManual = -1;
    }

    btnBusca.disabled = true;
    btnBusca.innerText = 'Buscando Local...';
    resultsContainer.innerHTML = '';
    statusEl.innerText = 'Consultando base local com amostragem de 200 metros...';

    await new Promise(r => setTimeout(r, 400));

    try {
      const results = getLocalReferences(rodovia, kmManual, selectedCats);
      renderLocalResults(results, rodovia, kmManual, selectedCats);
      statusEl.innerText = `Encontrados ${results.length} pontos de referência na base local. ${refProxBuildCategorySummary(selectedCats)}`;
    } catch (error) {
      console.error(error);
      statusEl.innerText = 'Erro na busca: ' + error.message;
      resultsContainer.innerHTML = `<p style="color:red; text-align:center;">${error.message}</p>`;
    } finally {
      btnBusca.disabled = false;
      btnBusca.innerText = 'Buscar ao longo da rota';
    }
  };

  function getLocalReferences(roadName, startKm = -1, selectedCats = []) {
    const allRefs = window.GRANDE_FLORIANOPOLIS_REFERENCIAS_100M?.rows || [];
    let filtered = allRefs.filter(r => r.rodovia === roadName);

    if (startKm >= 0) {
      filtered = filtered.filter(r => r.km >= (startKm - 2.0) && r.km <= (startKm + 3.0));
      filtered.sort((a, b) => Math.abs(a.km - startKm) - Math.abs(b.km - startKm));
    }

    filtered = filtered.filter(ref => refProxIs200mMarker(ref));
    filtered = filtered.filter(ref => refProxRefMatchesCategories(ref, selectedCats));
    return filtered;
  }

  function formatKmLabel(value) {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'string') return value.replace('.', ',');
    return Number(value).toFixed(3).replace('.', ',');
  }

  function buildSearchReferenceHeader(roadName, startKm, selectedCats = []) {
    if (!roadName) {
      return `
        <div class="card" style="border:1px dashed var(--border); background:rgba(255,255,255,0.02);">
          <div style="font-size:11px; font-weight:800; letter-spacing:.6px; text-transform:uppercase; color:var(--primary);">Referência Operacional Local</div>
          <div style="margin-top:6px; font-size:16px; font-weight:900; color:var(--text);">Aguardando seleção de rodovia</div>
          <div style="margin-top:4px; font-size:12px; color:var(--label);">A base local usa marcos aproximados exibidos a cada 200 metros na Grande Florianópolis.</div>
        </div>
      `;
    }

    const kmInfo = startKm >= 0
      ? `${roadName} km ${formatKmLabel(startKm)} (Próximos 5km)`
      : `${roadName} - Rodovia Completa`;

    return `
      <div class="card" style="border:1px solid rgba(249, 115, 22, 0.24); background:linear-gradient(180deg, rgba(249, 115, 22, 0.10), rgba(255,255,255,0.02));">
        <div style="font-size:11px; font-weight:800; letter-spacing:.6px; text-transform:uppercase; color:var(--primary);">Referência Operacional 200m</div>
        <div style="margin-top:6px; font-size:18px; font-weight:900; color:var(--text);">${kmInfo}</div>
        <div style="margin-top:4px; font-size:12px; color:var(--label);">${refProxBuildCategorySummary(selectedCats)}</div>
      </div>
    `;
  }

  window.ref_prox_atualizarReferenciaPrincipal = function(roadName, startKm) {
    const rodovia = roadName !== undefined ? roadName : document.getElementById('ref_prox_rodovia')?.value;
    const kmRaw = startKm !== undefined ? startKm : document.getElementById('ref_prox_km')?.value;
    let km = -1;

    if (typeof kmRaw === 'number') {
      km = kmRaw;
    } else if (kmRaw) {
      km = parseFloat(String(kmRaw).replace(',', '.'));
      if (isNaN(km)) km = -1;
    }

    const container = document.getElementById('ref_prox_results');
    if (!container) return;
    container.innerHTML = buildSearchReferenceHeader(rodovia || '', km, refProxGetSelectedCategories());
  };

  function renderLocalResults(results, roadName, startKm, selectedCats) {
    const container = document.getElementById('ref_prox_results');

    if (results.length === 0) {
      container.innerHTML = `<div class="card" style="text-align:center; padding:20px; color:var(--muted);">Nenhum ponto compatível encontrado para esta rodovia/km e filtros selecionados.</div>`;
      return;
    }

    container.innerHTML = buildSearchReferenceHeader(roadName, startKm, selectedCats);

    results.forEach(ref => {
      const card = document.createElement('div');
      card.className = 'poi-card';
      card.style = `
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 12px;
      `;

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <strong style="font-size:16px; color:var(--text);">${ref.rodovia} KM ${ref.km_label}</strong>
          <span style="font-size:10px; padding:2px 6px; border-radius:4px; background:rgba(249, 115, 22, 0.1); color:var(--primary); font-weight:700;">MARCO 200M</span>
        </div>
        
        <div style="font-size:13px; color:var(--muted); line-height:1.4;">
          ${ref.descricao}<br>
          <span style="font-size:11px; font-family:monospace; color:var(--label);">LAT: ${ref.latitude} | LON: ${ref.longitude}</span>
        </div>

        <div style="display:grid; grid-template-columns: 1fr; gap:8px; margin-top:8px;">
          <button class="btn btn-sm btn-primary" style="width:100%;" onclick="window.open('${ref.google_maps}', '_blank')">📍 Abrir no Google Maps</button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  const originalGo = window.go;
  window.go = function(screenId) {
    if (originalGo) originalGo(screenId);
    if (screenId === 'referencias-proximas') {
      ref_prox_init();
    }
  };
})();
