/* ---------------------------------------------------------------
   NAMESPACE GLOBAL PMRV - CORE ENGINE
--------------------------------------------------------------- */
window.PMRV = window.PMRV || {};

function core_formatarKM(input) {
  let val = input.value.trim().replace(/[^\d.,]/g, '').replace('.', ',');
  if (!val) {
    input.value = '';
    return;
  }

  let partes = val.split(',');
  let inteiro = partes[0] || '0';
  let decimal = partes[1] || '';

  let numInteiro = parseInt(inteiro, 10);
  if (isNaN(numInteiro)) numInteiro = 0;
  if (numInteiro > 99) numInteiro = 99;
  inteiro = numInteiro.toString();

  // Sempre força 3 zeros se não houver decimal, ou trunca/completa se houver
  decimal = (decimal + '000').substring(0, 3);

  input.value = inteiro + ',' + decimal;
  input.dispatchEvent(new Event('input'));
}

/* ---------------------------------------------------------------
   MOTOR DE PERSISTÊNCIA PRO (IndexedDB) & TÁTICA (EITTR)
--------------------------------------------------------------- */
PMRV.db = (function() {
  let db = null;
  const DB_NAME = 'PMRV_OFFLINE_DB';
  const STORE_NAME = 'laudos_v1';

  async function init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => { db = e.target.result; resolve(db); };
      request.onerror = (e) => reject(e);
    });
  }

  async function salvarEstado(id, data) {
    if (!db) await init();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ id, data, timestamp: Date.now() });
      tx.oncomplete = () => resolve(true);
    });
  }

  async function recuperarEstado(id) {
    if (!db) await init();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result?.data || null);
    });
  }

  return { init, salvarEstado, recuperarEstado };
})();

PMRV.tactical = (function() {
  function toggle() {
    const isTactical = document.body.classList.toggle('theme-tactical');
    localStorage.setItem('pmrv_tactical_mode', isTactical ? '1' : '0');
    if (window.navigator.vibrate) window.navigator.vibrate(20);
  }

  function init() {
    if (localStorage.getItem('pmrv_tactical_mode') === '1') {
      document.body.classList.add('theme-tactical');
    }
  }

  return { toggle, init };
})();

PMRV.geofence = (function() {
  let trechosCriticos = [];

  async function init() {
    try {
      trechosCriticos = await PMRV.dataManager.loadResource('trechos_criticos', 'data/trechos_criticos.json');
      console.log('[Geofence] Trechos críticos carregados:', trechosCriticos.length);
    } catch (err) {
      console.error('[Geofence] Erro ao carregar trechos críticos:', err);
      // Fallback básico em caso de falha no carregamento
      trechosCriticos = [
        { rod: 'SC-401', kmIni: 10, kmFim: 14, desc: 'Trecho de Alto Índice de Sinistralidade (Curvas do Jardim da Paz)' }
      ];
    }
  }

  function verificar(rodovia, km) {
    if (!trechosCriticos.length) return;
    const trecho = trechosCriticos.find(t =>
      t.rod === rodovia && km >= t.kmIni && km <= t.kmFim
    );
    if (trecho) {
      core_notificarOperacional('⚠️ ALERTA DE TRECHO CRÍTICO', trecho.desc);
    }
  }

  function obterTrecho(rodovia, km) {
    if (!trechosCriticos.length) return null;
    return trechosCriticos.find(t =>
      t.rod === rodovia && km >= t.kmIni && km <= t.kmFim
    ) || null;
  }

  return { init, verificar, obterTrecho };
})();
function core_notificarOperacional(titulo, msg) {
  const toast = document.createElement('div');
  toast.className = 'toast-operacional';
  toast.style = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); z-index:10002; background:#ff4d4d; color:#fff; padding:12px 20px; border-radius:12px; font-weight:bold; box-shadow:0 10px 30px rgba(0,0,0,0.5);';
  toast.innerHTML = `<div style="font-size:10px; opacity:0.8;">${titulo}</div><div>${msg}</div>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

/* ---------------------------------------------------------------
   PMRV CORE - NAVEGAÇÃO E HANDLERS
--------------------------------------------------------------- */
PMRV.core = (function() {
  const SCREENS = [
    'home', 'assumir', 'patrulhamento', 'infracoes', 'envolvidos', 'pmrv', 'danos',
    'relatorio', 'pesos', 'tacografo', 'croqui', 'rodovias-ref', 'referencias-proximas', 'docs',
    'prazos-transito', 'help', 'ended', 'module-missing'
  ];
  
  const APP_WIDE_SCREENS = new Set(['infracoes', 'croqui']);

  function getExistingScreen(name) {
    return document.getElementById('screen-' + name) ? name : null;
  }

  function go(name) {
    const requestedTarget = getExistingScreen(name);
    const fallbackTarget = getExistingScreen('module-missing') || 'home';
    const target = requestedTarget || (name === 'home' ? 'home' : fallbackTarget);

    if (!requestedTarget && name !== 'home') {
      const missingModuleName = document.getElementById('missing-module-name');
      if (missingModuleName) missingModuleName.innerText = name;
    }

    SCREENS.forEach(id => {
      const el = document.getElementById('screen-' + id);
      if (!el) return;
      const isActive = id === target;
      el.classList.toggle('active', isActive);
      if (isActive) el.scrollTop = 0;
    });

    document.querySelectorAll('.nav-item').forEach(btn => {
      const btnId = btn.id.replace('nav-', '');
      btn.classList.toggle('active', btnId === target || (target === 'home' && btnId === 'home'));
    });

    const container = document.getElementById('main-container');
    if (container) container.scrollTop = 0;

    // Inicializadores de Módulos
    if (target === 'pesos' && typeof window.pes_init === 'function') window.pes_init();
    if (target === 'tacografo' && typeof window.tac_init === 'function') window.tac_init();
    if (target === 'patrulhamento' && typeof window.pat_init === 'function') window.pat_init();
    if (target === 'infracoes' && typeof window.infra_init === 'function') window.infra_init();
    if (target === 'danos' && typeof window.danPrepararTela === 'function') window.danPrepararTela();
    if (target === 'referencias-proximas' && typeof window.ref_prox_init === 'function') window.ref_prox_init();
    if (typeof window.gps_onScreenChange === 'function') window.gps_onScreenChange(target);
    if (target === 'docs') docs_switchTab('bases');
  }

  function docs_switchTab(tab) {
    const tabs = ['bases', 'ciclomotores', 'estrangeiros', 'aet', 'pops'];
    tabs.forEach(id => {
      const el = document.getElementById('docs-content-' + id);
      const btn = document.getElementById('tab-docs-' + id);
      if (el) el.classList.toggle('hidden', id !== tab);
      if (btn) btn.classList.toggle('btn-primary', id === tab);
    });
    if (tab === 'ciclomotores') docs_ciclomotoresSwitchTab('');
  }

  function docs_ciclomotoresSwitchTab(tab) {
    const subtabs = ['lei', 'fiscalizar', 'como-fazer', 'autuar', 'nao-autuar', 'equipamentos', 'documentos'];
    subtabs.forEach(id => {
      const el = document.getElementById('docs-ciclomotores-' + id);
      const btn = document.getElementById('tab-docs-ciclomotores-' + id);
      if (el) el.classList.toggle('hidden', !tab || id !== tab);
      if (btn) btn.classList.toggle('btn-primary', id === tab);
    });
    const placeholder = document.getElementById('docs-ciclomotores-placeholder');
    if (placeholder) placeholder.classList.toggle('hidden', !!tab);
  }

  function core_zoomImage(src) {
    const modal = document.getElementById('core-zoom-modal');
    const img = document.getElementById('core-zoom-img');
    if (modal && img && src) {
      img.src = src;
      modal.classList.add('show');
    }
  }

  function core_fecharZoom() {
    document.getElementById('core-zoom-modal')?.classList.remove('show');
  }

  async function limparCache() {
    Object.keys(window.localStorage || {}).filter(k => k.startsWith('pmrv_')).forEach(k => localStorage.removeItem(k));
    if (PMRV.dataManager?.clearCache) await PMRV.dataManager.clearCache();
    window.location.reload();
  }

  function bindDeclarativeHandlers() {
    const execute = (attr, target, event) => {
      const code = target.getAttribute(attr)?.trim();
      if (!code) return;

      // Suporta: "funcao", "funcao()", "funcao('arg1', 2, this)"
      const match = code.match(/^([A-Za-z_$][\w$]*)(?:\s*\((.*)\))?$/);
      if (!match) {
        // Fallback: se for complexo, tenta rodar como script
        try { new Function(code).call(target); } catch(e) {}
        return;
      }

      const fnName = match[1];
      const fn = window[fnName];
      if (typeof fn !== 'function') {
        console.warn(`[Core] Função não encontrada: ${fnName}`);
        return;
      }

      const argsRaw = match[2] ? match[2].trim() : "";
      const args = argsRaw ? argsRaw.split(',').map(a => {
        a = a.trim();
        if (a === 'this') return target;
        if (a === 'event') return event;
        if ((a.startsWith("'") && a.endsWith("'")) || (a.startsWith('"') && a.endsWith('"'))) {
          return a.slice(1, -1);
        }
        if (!isNaN(a) && a !== "") return Number(a);
        return a;
      }) : [];

      try {
        fn.apply(window, args);
      } catch (err) {
        console.error(`[Core] Erro ao executar ${fnName}:`, err);
      }
    };

    document.addEventListener('click', e => {
      const t = e.target.closest('[data-click]');
      if (t) execute('data-click', t, e);
    });
    document.addEventListener('input', e => {
      const t = e.target.closest('[data-input]');
      if (t) execute('data-input', t, e);
    });
    document.addEventListener('change', e => {
      const t = e.target.closest('[data-change]');
      if (t) execute('data-change', t, e);
    });
  }

  return {
    go, docs_switchTab, docs_ciclomotoresSwitchTab,
    core_zoomImage, core_fecharZoom, limparCache, bindDeclarativeHandlers
  };
})();

// UTILITÁRIOS GLOBAIS
window.copiar = function(elementId, btn) {
  const text = document.getElementById(elementId)?.innerText || document.getElementById(elementId)?.value;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const old = btn.innerHTML;
    btn.innerHTML = '✅ Copiado!';
    setTimeout(() => btn.innerHTML = old, 2000);
  });
};

window.whatsapp = function(elementId) {
  const text = document.getElementById(elementId)?.innerText || document.getElementById(elementId)?.value;
  if (!text) return;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
};

// MAPEAMENTO GLOBAL
window.go = PMRV.core.go;
window.docs_switchTab = PMRV.core.docs_switchTab;
window.docs_ciclomotoresSwitchTab = PMRV.core.docs_ciclomotoresSwitchTab;
window.core_zoomImage = PMRV.core.core_zoomImage;
window.core_fecharZoom = PMRV.core.core_fecharZoom;
window.core_confirmarLimpezaCompleta = PMRV.core.limparCache;
window.core_toggleTactical = PMRV.tactical.toggle;
window.core_formatarKM = core_formatarKM;

document.addEventListener('DOMContentLoaded', () => {
  PMRV.tactical.init();
  PMRV.db.init();
  PMRV.geofence.init();
  PMRV.core.bindDeclarativeHandlers();
});
