(function () {
  const state = {
    initialized: false,
    loading: false,
    records: [],
    categories: [],
    measures: [],
    elements: null
  };

  const SEARCH_SYNONYM_GROUPS = [
    ['licenciamento', 'licen', 'licenca', 'licença', 'crlv', 'crlv-e', 'crlv e', 'documento', 'documentos', 'doc', 'docu', 'regularização'],
    ['placa', 'placas', 'identificação', 'sinal identificador'],
    ['cnh', 'habilitação', 'carteira', 'motorista', 'condutor', 'permissão', 'ppd', 'acc'],
    ['documento', 'documentos', 'porte', 'obrigatório', 'apresentação'],
    ['veículo', 'carro', 'automóvel', 'moto', 'motocicleta', 'motoneta', 'ciclomotor'],
    ['capacete', 'viseira', 'óculos', 'proteção'],
    ['estacionar', 'estacionamento', 'parar', 'parada'],
    ['alcool', 'álcool', 'embriaguez', 'bebida', 'etilômetro', 'bafômetro'],
    ['celular', 'telefone', 'smartphone', 'aparelho'],
    ['farol', 'faróis', 'luz', 'lanterna', 'iluminação'],
    ['ultrapassagem', 'ultrapassar', 'passagem'],
    ['pedestre', 'faixa', 'travessia', 'passarela'],
    ['remoção', 'guincho', 'recolhimento'],
    ['retenção', 'reter']
  ];

  const SEARCH_INTENT_RULES = [
    {
      triggers: ['não pagou', 'licenciamento atrasado', 'licenciamento vencido', 'não licenciou'],
      expansions: ['licenciamento', 'crlv', 'documento']
    },
    {
      triggers: ['recusou', 'recusou bafometro', 'recusou teste', 'nao soprou'],
      expansions: ['recusa', 'etilometro', 'bafometro', 'teste']
    },
    {
      triggers: ['nao habilitado', 'sem habilitacao', 'sem cnh', 'sem acc'],
      expansions: ['habilitacao', 'cnh', 'acc', 'permissao']
    }
  ];

  const SEARCH_CODE_SHORTCUTS = [
    { code: '736-62', terms: ['7366-2', '736-62', 'celular', 'telefone', 'mao no volante'] },
    { code: '5185-1', terms: ['5185-1', '518-51', 'cinto', 'sem cinto', 'passageiro sem cinto'] },
    { code: '5010-1', terms: ['5010-0', '501-00', 'sem cnh', 'sem acc', 'nao habilitado'] },
    { code: '5169-1', terms: ['7579-0', '757-90', 'recusa', 'bafometro', 'etilometro', 'recusou bafometro'] },
    { code: '165', terms: ['alcool', 'bebida', 'bebeu', 'dirigir sob influencia', 'embriaguez'] },
    { code: '230 V', terms: ['licenciamento', 'atrasado', 'vencido', 'documento vencido', 'sem licenciamento'] },
    { code: '230 XVIII', terms: ['mau estado', 'pneu', 'pneu careca', 'iluminacao', 'lanterna'] },
    { code: '218', terms: ['velocidade', 'radar', 'excesso de velocidade', 'acima do limite'] }
  ];

  /**
   * Calculador de Velocidade Considerada (Resolução 798/20 CONTRAN)
   * Até 100 km/h: Medida - 7 km/h
   * Acima de 100 km/h: Medida - 7% (arredondado)
   */
  function calculateConsideredSpeed(measured) {
    if (measured <= 100) return measured - 7;
    return Math.round(measured * 0.93);
  }

  function getEnquadramentoVelocidade(limit, measured) {
    const considered = calculateConsideredSpeed(measured);
    if (considered <= limit) return null;
    
    const percent = ((considered - limit) / limit) * 100;
    
    if (percent <= 20) return { art: '218 I', desc: 'Até 20% acima do limite', cat: 'Média', pontos: 4 };
    if (percent <= 50) return { art: '218 II', desc: 'Entre 20% e 50% acima do limite', cat: 'Grave', pontos: 5 };
    return { art: '218 III', desc: 'Acima de 50% do limite (SUSPENSÃO)', cat: 'Gravíssima', pontos: 7, suspensao: true };
  }

  function renderVelocityTool() {
    const container = document.getElementById('infra_velocity_tool');
    if (container) return; // Já existe

    const listContainer = document.getElementById('infra_list_container');
    const tool = document.createElement('div');
    tool.id = 'infra_velocity_tool';
    tool.className = 'infra-card velocity-helper';
    tool.style.border = '2px solid var(--primary)';
    tool.style.background = 'rgba(52, 152, 219, 0.1)';
    tool.innerHTML = `
      <div class="infra-card-header" style="border-bottom: 1px solid var(--border); padding-bottom: 12px;">
        <div class="infra-card-main">
          <span class="infra-card-code">ASSISTENTE</span>
          <div class="infra-card-title">Cálculo de Velocidade (Res. 798/20)</div>
        </div>
      </div>
      <div class="infra-card-content" style="padding: 15px; display: block;">
        <div class="flex gap-12" style="margin-bottom: 15px;">
          <div style="flex:1;">
            <label style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:4px;">Limite da Via (km/h)</label>
            <input type="number" id="v_limit" class="input" placeholder="80" style="width:100%;">
          </div>
          <div style="flex:1;">
            <label style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:4px;">Veloc. Medida (km/h)</label>
            <input type="number" id="v_measured" class="input" placeholder="110" style="width:100%;">
          </div>
        </div>
        <div id="v_result" style="padding: 10px; border-radius: 8px; background: rgba(0,0,0,0.2); min-height: 40px; font-size: 13px;">
          Insira os valores para enquadramento automático...
        </div>
      </div>
    `;

    listContainer.prepend(tool);

    const inputs = tool.querySelectorAll('input');
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        const limit = parseFloat(document.getElementById('v_limit').value);
        const measured = parseFloat(document.getElementById('v_measured').value);
        const resDiv = document.getElementById('v_result');

        if (!limit || !measured) {
          resDiv.innerHTML = 'Aguardando valores...';
          return;
        }

        const considered = calculateConsideredSpeed(measured);
        const enq = getEnquadramentoVelocidade(limit, measured);

        if (!enq) {
          resDiv.innerHTML = `<span style="color:#2ecc71;">✅ Velocidade Considerada: <b>${considered} km/h</b>. Dentro do limite.</span>`;
        } else {
          resDiv.innerHTML = `
            <div style="color:var(--text);">Velocidade Considerada: <b style="color:var(--primary); font-size:16px;">${considered} km/h</b></div>
            <div style="margin-top:8px; font-weight:bold; color:${enq.suspensao ? '#e74c3c' : 'var(--text)'};">
              Enquadramento: Art. ${enq.art} (${enq.desc})
            </div>
            <div style="font-size:11px; margin-top:4px;">
              Categoria: <span class="infra-badge ${categoryClass(enq.cat)}">${enq.cat}</span> | Pontos: ${enq.pontos}
              ${enq.suspensao ? ' | <b style="color:#e74c3c;">GERA SUSPENSÃO DA CNH</b>' : ''}
            </div>
          `;
        }
      });
    });
  }

  function applyFilters() {
    const elements = getElements();
    const term = normalizeSearchText(elements.search.value);
    
    // Se buscar por velocidade, mostra o assistente
    if (term.includes('velocidade') || term.includes('radar') || term.includes('km/h')) {
      renderVelocityTool();
    } else {
      const tool = document.getElementById('infra_velocity_tool');
      if (tool) tool.remove();
    }

    const shortcutCode = resolveCodeShortcut(term);
    const normalizedShortcutCode = normalizeSearchText(shortcutCode);
    const category = elements.category.value;
    const measure = elements.measure.value;
    
    const filtered = state.records.filter(r => {
      if (term && r.search.indexOf(term) === -1) {
        if (normalizedShortcutCode && (normalizeSearchText(r.codigo).indexOf(normalizedShortcutCode) >= 0 || normalizeSearchText(r.artigo).indexOf(normalizedShortcutCode) >= 0)) {
          return (!category || r.categoria === category) && (!measure || r.medida === measure);
        }
        const termParts = expandSearchIntent(term);
        if (!termParts.every(p => r.search.indexOf(p) >= 0)) return false;
      }
      if (category && r.categoria !== category) return false;
      if (measure && r.medida !== measure) return false;
      return true;
    });
    render(filtered);
  }


  function decodeEmbeddedBase64(base64) {
    try {
      const binaryString = atob(base64.trim());
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new TextDecoder('utf-8').decode(bytes);
    } catch (e) { 
      console.error('[Infra] Erro na decodificação Base64:', e);
      return ''; 
    }
  }

  async function infra_init() {
    const elements = getElements();
    if (!elements.search) return;
    
    // Evita reinicialização múltipla de listeners
    if (state.initialized) {
        // Se já inicializado, apenas garante que a tabela esteja renderizada
        if (state.records.length > 0) render(state.records);
        return;
    }
    
    elements.search.addEventListener('input', applyFilters);
    elements.category.addEventListener('change', applyFilters);
    elements.measure.addEventListener('change', applyFilters);
    
    if (elements.clear) {
        elements.clear.addEventListener('click', () => {
            elements.search.value = ''; 
            elements.category.value = ''; 
            elements.measure.value = '';
            render(state.records);
        });
    }

    try {
        if (elements.status) elements.status.innerText = 'Carregando base...';
        
        // Carrega via dataManager
        const data = await PMRV.dataManager.loadResource('infracoes', 'data/infracoes.json');
        
        if (data && data.b64) {
            const csvText = decodeEmbeddedBase64(data.b64);
            const rows = parseCsv(csvText);
            
            state.records = mapRecords(rows);
            state.categories = Array.from(new Set(state.records.map(r => r.categoria).filter(Boolean))).sort();
            state.measures = Array.from(new Set(state.records.map(r => r.medida).filter(Boolean))).sort();
            
            fillSelect(elements.category, state.categories, 'Todas');
            fillSelect(elements.measure, state.measures, 'Todas');
            
            state.initialized = true;
            if (elements.status) elements.status.innerText = 'Base carregada';
            render(state.records);
        } else {
            throw new Error("Base de dados vazia ou inválida.");
        }
    } catch (err) {
      console.error('Erro ao carregar base de infrações:', err);
      if (elements.status) elements.status.innerText = 'Erro ao carregar base de dados.';
    }
  }

  window.infra_init = infra_init;
  window.infra_applyShortcut = (term) => {
    const elements = getElements();
    if (elements.search) {
      elements.search.value = resolveCodeShortcut(term) || term;
      applyFilters();
    }
    window.infra_showTab('consulta');
  };
  window.infra_showTab = (tab) => {
    const isConsulta = tab !== 'frequentes';
    document.getElementById('infra_tab_consulta').classList.toggle('active', isConsulta);
    document.getElementById('infra_tab_frequentes').classList.toggle('active', !isConsulta);
    document.getElementById('infra_panel_consulta').hidden = !isConsulta;
    document.getElementById('infra_panel_frequentes').hidden = isConsulta;
  };
})();

