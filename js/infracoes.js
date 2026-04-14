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

  function getElements() {
    return {
      search: document.getElementById('infra_search'),
      category: document.getElementById('infra_category'),
      measure: document.getElementById('infra_measure'),
      clear: document.getElementById('infra_clear'),
      total: document.getElementById('infra_totalCount'),
      filtered: document.getElementById('infra_filteredCount'),
      catCount: document.getElementById('infra_categoryCount'),
      status: document.getElementById('infra_status'),
      container: document.getElementById('infra_list_container'),
      empty: document.getElementById('infra_emptyState')
    };
  }

  function normalizeSearchText(text) {
    if (!text) return '';
    return text.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .trim();
  }

  function resolveCodeShortcut(term) {
    const s = SEARCH_CODE_SHORTCUTS.find(x => x.terms.includes(term));
    return s ? s.code : null;
  }

  function expandSearchIntent(term) {
    const rules = SEARCH_INTENT_RULES.filter(r => r.triggers.some(t => term.includes(t)));
    if (rules.length === 0) return [term];
    return [...new Set([term, ...rules.flatMap(r => r.expansions)])];
  }

  function parseCsv(text) {
    const lines = text.split('\n');
    const headers = lines[0].split(';');
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const values = line.split(';');
      return headers.reduce((obj, h, i) => {
        obj[h.trim()] = values[i]?.trim();
        return obj;
      }, {});
    });
  }

  function mapRecords(rows) {
    return rows.map(r => {
      const art = r.Artigo || '';
      const desc = r.Descricao || '';
      const cod = r.Codigo || '';
      const cat = r.Categoria || '';
      const med = r.Medida || 'Não se aplica';
      
      return {
        codigo: cod,
        descricao: desc,
        artigo: art,
        categoria: cat,
        medida: med,
        search: normalizeSearchText(`${cod} ${desc} ${art} ${cat} ${med} ${r.Infrator || ''}`)
      };
    });
  }

  function fillSelect(el, items, placeholder) {
    if (!el) return;
    el.innerHTML = `<option value="">${placeholder}</option>` +
      items.map(i => `<option value="${i}">${i}</option>`).join('');
  }

  function categoryClass(cat) {
    const c = cat.toLowerCase();
    if (c.includes('gravissima')) return 'infra-badge--gravissima';
    if (c.includes('grave')) return 'infra-badge--grave';
    if (c.includes('media')) return 'infra-badge--media';
    return 'infra-badge--leve';
  }

  function render(records) {
    const els = getElements();
    if (!els.container) return;

    els.container.innerHTML = '';
    const limited = records.slice(0, 100); // Limite de performance

    limited.forEach(r => {
      const card = document.createElement('article');
      card.className = 'infra-card';
      card.innerHTML = `
        <div class="infra-card-header">
          <div class="infra-card-main">
            <span class="infra-card-code">${r.codigo}</span>
            <div class="infra-card-title">${r.descricao}</div>
          </div>
          <span class="infra-badge ${categoryClass(r.categoria)}">${r.categoria}</span>
        </div>
        <div class="infra-card-content">
          <div class="infra-card-row"><strong>Artigo:</strong> ${r.artigo}</div>
          <div class="infra-card-row"><strong>Medida:</strong> ${r.medida}</div>
        </div>
      `;
      els.container.appendChild(card);
    });

    if (els.total) els.total.innerText = state.records.length;
    if (els.filtered) els.filtered.innerText = records.length;
    if (els.catCount) els.catCount.innerText = state.categories.length;
    if (els.empty) els.empty.hidden = records.length > 0;
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

