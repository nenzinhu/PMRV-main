/**
 * Modulo: Referencias de Rodovias - Base Local 100m
 */

let RODOVIAS_REF_DATA = {};

function ref_formatarKm(km) {
    return Number(km || 0).toFixed(3).replace('.', ',');
}

function ref_formatarRodoviaKm(rodovia, km) {
    return `Rodovia ${rodovia} km ${ref_formatarKm(km)}`;
}

function ref_normalizarBase() {
    const data = window.GRANDE_FLORIANOPOLIS_REFERENCIAS_100M;
    if (!data || !data.rows) return {};

    const grouped = {};
    data.rows.forEach(row => {
        if (!grouped[row.rodovia]) {
            grouped[row.rodovia] = {
                nome: `Rodovia ${row.rodovia}`,
                refs: []
            };
        }
        grouped[row.rodovia].refs.push(row);
    });

    Object.values(grouped).forEach(road => {
        road.refs.sort((a, b) => a.km - b.km);
    });

    return grouped;
}

function ref_localizar() {
    if (Object.keys(RODOVIAS_REF_DATA).length === 0) {
        RODOVIAS_REF_DATA = ref_normalizarBase();
    }

    const rodKey = document.getElementById('ref_rodovia').value;
    const rawVal = document.getElementById('ref_km').value.replace(',', '.');
    const kmVal = parseFloat(rawVal);

    if (isNaN(kmVal)) {
        alert('Por favor, digite um KM válido.');
        return;
    }

    const rodData = RODOVIAS_REF_DATA[rodKey];
    if (!rodData) {
        alert('Dados desta rodovia ainda não cadastrados na base de 100m.');
        return;
    }

    let anterior = null;
    let proximo = null;

    for (let i = 0; i < rodData.refs.length; i++) {
        const ref = rodData.refs[i];
        if (ref.km <= kmVal) {
            anterior = ref;
        }
        if (ref.km > kmVal) {
            proximo = ref;
            break;
        }
    }

    const resBox = document.getElementById('ref_result_box');
    document.getElementById('ref_res_rod').innerText = rodData.nome;
    document.getElementById('ref_res_km').innerText = ` • ${ref_formatarRodoviaKm(rodKey, kmVal)}`;

    let msgDist = '';
    let descRef = '';
    let gmapsLink = '';

    const diffAnt = anterior ? (kmVal - anterior.km) : Infinity;

    if (anterior && Math.abs(diffAnt) < 0.005) {
        descRef = anterior.descricao;
        msgDist = 'Você está exatamente neste marco operacional (100m).';
        gmapsLink = anterior.google_maps;
    } else if (anterior && proximo) {
        const metrosAnt = Math.round(diffAnt * 1000);
        const metrosProx = Math.round((proximo.km - kmVal) * 1000);
        descRef = `${anterior.descricao} <-> ${proximo.descricao}`;
        msgDist = `KM estimado: ${metrosAnt} m após o marco anterior e ${metrosProx} m antes do próximo marco.`;
        gmapsLink = anterior.google_maps; // Usa o marco anterior como referência de mapa
    } else if (anterior) {
        const metros = Math.round(diffAnt * 1000);
        descRef = anterior.descricao;
        msgDist = `KM estimado: ${metros} m após o último marco cadastrado.`;
        gmapsLink = anterior.google_maps;
    } else if (proximo) {
        const metros = Math.round((proximo.km - kmVal) * 1000);
        descRef = proximo.descricao;
        msgDist = `KM estimado: ${metros} m antes do primeiro marco cadastrado.`;
        gmapsLink = proximo.google_maps;
    }

    document.getElementById('ref_res_desc').innerHTML = `<div style="font-weight:700; color:var(--text);">${descRef}</div>`;
    
    let distHtml = `<div style="margin-top:8px;">${msgDist}</div>`;
    if (gmapsLink) {
        distHtml += `<button class="btn btn-sm btn-primary" style="margin-top:12px; width:100%;" onclick="window.open('${gmapsLink}', '_blank')">📍 Ver Localização (Google Maps)</button>`;
    }
    document.getElementById('ref_res_dist').innerHTML = distHtml;

    document.getElementById('ref_res_obs').innerText = 'Base georreferenciada a cada 100 metros (Grande Florianópolis).';

    resBox.classList.remove('hidden');
    resBox.scrollIntoView({ behavior: 'smooth' });
}

window.RODOVIAS_REF_DATA = RODOVIAS_REF_DATA;
window.ref_localizar = ref_localizar;

document.addEventListener('DOMContentLoaded', () => {
    // A base agora é carregada via script no index.html (window.GRANDE_FLORIANOPOLIS_REFERENCIAS_100M)
});
