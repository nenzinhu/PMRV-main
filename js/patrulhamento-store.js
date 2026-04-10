window.PMRV = window.PMRV || {};

PMRV.patrulhamentoStore = (function() {
  const STORAGE_KEY = 'pmrv_pat_lote';
  let veiculos = [];

  function sanitizeList(value) {
    return Array.isArray(value) ? value : [];
  }

  function isValidEntry(entry) {
    return entry !== null
      && typeof entry === 'object'
      && typeof entry.placa === 'string'
      && entry.infracao !== null
      && typeof entry.infracao === 'object'
      && typeof entry.infracao.nome === 'string'
      && typeof entry.hora === 'string';
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(veiculos));
  }

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      veiculos = [];
      return veiculos;
    }

    try {
      const parsed = JSON.parse(raw);
      veiculos = sanitizeList(parsed).filter(isValidEntry);
      const total = sanitizeList(parsed).length;
      if (veiculos.length < total) {
        console.warn(`[PatStore] ${total - veiculos.length} entradas inválidas descartadas do cache.`);
      }
    } catch (error) {
      console.error('Erro ao carregar cache de patrulhamento', error);
      veiculos = [];
    }

    return veiculos;
  }

  function getAll() {
    return veiculos;
  }

  function add(entry) {
    veiculos.unshift(entry);
    persist();
    return veiculos;
  }

  function removeAt(index) {
    if (index < 0 || index >= veiculos.length) return veiculos;
    veiculos.splice(index, 1);
    persist();
    return veiculos;
  }

  function clear() {
    veiculos = [];
    persist();
    return veiculos;
  }

  return {
    add,
    clear,
    getAll,
    load,
    removeAt
  };
})();
