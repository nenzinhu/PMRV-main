/**
 * Modulo: Referencias Proximas via TomTom Along Route Search + Marcos 150m
 */

(function() {
  const TOMTOM_KEY = '3g2ZOIEsJUN2VTkHi6dYW8PuV4kiBTUu';
  const MAX_DETOUR_TIME = 900; // 15 minutos

  let selectedCategories = ['7311', '7322', '7324', '7323', '9113', '9361009', '7321', '7326', '7315', '9361'];

  window.ref_prox_init = function() {
    if (typeof gps_preencherSelects === 'function') {
      gps_preencherSelects();
    }
    window.ref_prox_atualizarReferenciaPrincipal();
  };

  window.ref_prox_toggleCat = function(btn, catId) {
    if (selectedCategories.includes(catId)) {
      selectedCategories = selectedCategories.filter(c => c !== catId);
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-outline');
      return;
    }

    selectedCategories.push(catId);
    btn.classList.add('btn-primary');
    btn.classList.remove('btn-outline');
  };

  window.ref_prox_buscar = async function() {
    const rodovia = document.getElementById('ref_prox_rodovia').value;
    const kmManualStr = document.getElementById('ref_prox_km').value;
    const resultsContainer = document.getElementById('ref_prox_results');
    const statusEl = document.getElementById('ref_prox_status');
    const btnBusca = document.getElementById('btn-ref-prox-buscar');

    if (!rodovia) {
      alert('Selecione uma rodovia primeiro.');
      return;
    }

    if (selectedCategories.length === 0) {
      alert('Selecione pelo menos uma categoria.');
      return;
    }

    let kmManual = 0;
    if (kmManualStr) {
      kmManual = parseFloat(kmManualStr.replace(',', '.'));
      if (isNaN(kmManual)) kmManual = 0;
    }

    btnBusca.disabled = true;
    btnBusca.innerText = 'Buscando...';
    resultsContainer.innerHTML = '';
    statusEl.innerText = 'Construindo rota e consultando TomTom...';

    try {
      const routePoints = buildRoutePoints(rodovia, kmManual);
      if (!routePoints || routePoints.length < 2) {
        throw new Error('Geometria da rodovia não encontrada ou insuficiente a partir do KM informado.');
      }

      const results = await fetchTomTomAlongRoute(routePoints, selectedCategories);
      renderResults(results, rodovia, kmManual);
      statusEl.innerText = `Encontradas ${results.length} referências próximas.`;
    } catch (error) {
      console.error(error);
      statusEl.innerText = 'Erro na busca: ' + error.message;
      resultsContainer.innerHTML = `<p style="color:red; text-align:center;">${error.message}</p>`;
    } finally {
      btnBusca.disabled = false;
      btnBusca.innerText = 'Buscar ao longo da rota';
    }
  };

  function buildRoutePoints(roadName, startKm = 0) {
    const allData = window.GPS_RODOVIAS_SC || {};
    let points = allData[roadName];
    if (!points) return null;

    if (startKm > 0) {
      points = points.filter(p => p.km >= startKm);
      if (points.length < 2) {
        const fullPoints = allData[roadName];
        points = fullPoints.filter(p => p.km >= (startKm - 1));
      }
    }

    if (points.length < 2) return null;

    const step = Math.max(1, Math.floor(points.length / 1000));
    const sampled = [];
    for (let i = 0; i < points.length; i += step) {
      sampled.push({ lat: points[i].lat, lon: points[i].lng });
    }

    const last = points[points.length - 1];
    if (sampled[sampled.length - 1].lat !== last.lat) {
      sampled.push({ lat: last.lat, lon: last.lng });
    }

    return sampled;
  }

  async function fetchTomTomAlongRoute(points, categories) {
    const url = `https://api.tomtom.com/search/2/alongRoute/search.json?key=${TOMTOM_KEY}&maxDetourTime=${MAX_DETOUR_TIME}&limit=20&categorySet=${categories.join(',')}`;
    const body = { route: { points } };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Erro API TomTom: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  function findNearest150mReference(lat, lon, roadName) {
    const refsData = window.GRANDE_FLORIANOPOLIS_REFERENCIAS?.rows;
    if (!refsData) return null;

    let nearest = null;
    let minDist = Infinity;
    const filteredRefs = refsData.filter(r => r.rodovia === roadName);
    const source = filteredRefs.length > 0 ? filteredRefs : refsData;

    source.forEach(ref => {
      const d = haversineDistance(lat, lon, ref.latitude, ref.longitude);
      if (d < minDist) {
        minDist = d;
        nearest = ref;
      }
    });

    return { ref: nearest, distance: minDist };
  }

  function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function formatKmLabel(value) {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'string') return value.replace('.', ',');
    return Number(value).toFixed(3).replace('.', ',');
  }

  function buildOperationalReferenceHtml(nearest, roadName) {
    if (!nearest || !nearest.ref) {
      return `
        <div style="margin-top:8px; padding:10px; border:1px dashed var(--border); border-radius:10px; background:rgba(59,130,246,0.06);">
          <div style="font-size:11px; font-weight:800; letter-spacing:.5px; text-transform:uppercase; color:var(--primary);">KM operacional</div>
          <div style="margin-top:4px; font-size:13px; font-weight:700; color:var(--text);">${roadName}</div>
          <div style="margin-top:2px; font-size:11px; color:var(--muted);">Sem marco operacional próximo encontrado na base da Grande Florianópolis.</div>
        </div>
      `;
    }

    const kmLabel = formatKmLabel(nearest.ref.km_label || nearest.ref.km);
    const nomeLocal = nearest.ref.nome_local || nearest.ref.descricao || 'Marco operacional';
    const distancia = Math.round(nearest.distance);

    return `
      <div style="margin-top:8px; padding:10px; border:1px dashed var(--border); border-radius:10px; background:rgba(59,130,246,0.06);">
        <div style="font-size:11px; font-weight:800; letter-spacing:.5px; text-transform:uppercase; color:var(--primary);">KM operacional</div>
        <div style="margin-top:4px; font-size:14px; font-weight:800; color:var(--text);">${nearest.ref.rodovia} km ${kmLabel}</div>
        <div style="margin-top:2px; font-size:12px; color:var(--text);">${nomeLocal}</div>
        <div style="margin-top:2px; font-size:11px; color:var(--muted);">POI a aproximadamente ${distancia} m do marco operacional mais próximo.</div>
      </div>
    `;
  }

  function buildSearchReferenceHeader(roadName, startKm) {
    if (!roadName) {
      return `
        <div class="card" style="border:1px dashed var(--border); background:rgba(255,255,255,0.02);">
          <div style="font-size:11px; font-weight:800; letter-spacing:.6px; text-transform:uppercase; color:var(--primary);">Referência principal da busca</div>
          <div style="margin-top:6px; font-size:16px; font-weight:900; color:var(--text);">Aguardando rodovia ou GPS</div>
          <div style="margin-top:4px; font-size:12px; color:var(--label);">Selecione a rodovia, informe um km ou use o GPS para preencher a referência operacional.</div>
        </div>
      `;
    }

    const kmInfo = startKm > 0
      ? `${roadName} km ${formatKmLabel(startKm)}`
      : `${roadName} - toda a rodovia na base da Grande Florianópolis`;

    return `
      <div class="card" style="border:1px solid rgba(59,130,246,0.24); background:linear-gradient(180deg, rgba(59,130,246,0.10), rgba(255,255,255,0.02));">
        <div style="font-size:11px; font-weight:800; letter-spacing:.6px; text-transform:uppercase; color:var(--primary);">Referência principal da busca</div>
        <div style="margin-top:6px; font-size:18px; font-weight:900; color:var(--text);">${kmInfo}</div>
        <div style="margin-top:4px; font-size:12px; color:var(--label);">Resultados priorizados com base em km operacional nas rodovias da Grande Florianópolis.</div>
      </div>
    `;
  }

  window.ref_prox_atualizarReferenciaPrincipal = function(roadName, startKm) {
    const rodovia = roadName !== undefined ? roadName : document.getElementById('ref_prox_rodovia')?.value;
    const kmRaw = startKm !== undefined ? startKm : document.getElementById('ref_prox_km')?.value;
    let km = 0;

    if (typeof kmRaw === 'number') {
      km = kmRaw;
    } else if (kmRaw) {
      km = parseFloat(String(kmRaw).replace(',', '.'));
      if (isNaN(km)) km = 0;
    }

    const container = document.getElementById('ref_prox_results');
    if (!container) return;
    container.innerHTML = buildSearchReferenceHeader(rodovia || '', km);
  };

  function renderResults(results, roadName, startKm) {
    const container = document.getElementById('ref_prox_results');

    if (results.length === 0) {
      container.innerHTML = `<div class="card" style="text-align:center; padding:20px; color:var(--muted);">Nenhuma referência encontrada para as categorias selecionadas nesta rodovia via TomTom.</div>`;
      return;
    }

    results.sort((a, b) => a.dist - b.dist);
    container.innerHTML = buildSearchReferenceHeader(roadName, startKm);

    results.forEach(poi => {
      const name = poi.poi?.name || 'POI';
      const address = poi.address?.freeformAddress || 'Endereço não informado';
      const distRoute = Number(poi.dist || 0);
      const detour = Number(poi.detourTime || 0);
      const category = poi.poi?.categories?.[0] || 'POI';
      const nearest = findNearest150mReference(poi.position.lat, poi.position.lon, roadName);
      const refHtml = buildOperationalReferenceHtml(nearest, roadName);

      const card = document.createElement('div');
      card.className = 'poi-card';
      card.style = `
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      `;

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <strong style="font-size:15px; color:var(--text);">${name}</strong>
          <span style="font-size:10px; padding:2px 6px; border-radius:4px; background:rgba(59,130,246,0.1); color:var(--primary); font-weight:700;">${category}</span>
        </div>
        ${refHtml}
        <div style="margin-top:6px; font-size:11px; color:var(--label);">Endereço de apoio: ${address}</div>
        <div style="margin-top:6px; display:flex; gap:12px; flex-wrap:wrap; font-size:11px; font-weight:600;">
          <span style="color:var(--success);">Na rota: ${(distRoute / 1000).toFixed(1)} km</span>
          <span style="color:var(--amber);">Desvio: ${Math.round(detour / 60)} min</span>
        </div>
        <button class="btn btn-sm" style="margin-top:10px; width:100%;" onclick="window.open('https://www.google.com/maps/search/?api=1&query=${poi.position.lat},${poi.position.lon}', '_blank')">Abrir no Google Maps</button>
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
