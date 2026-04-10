/**
 * Modulo: Referencias de Rodovias
 * Base operacional da Grande Florianopolis gerada a cada 200 m.
 */

const REF_BASE_URL = 'data/referencias_grande_florianopolis_200m.json';

let RODOVIAS_REF_DATA = {};
let REF_ROADS_META = {};
let REF_DATA_PROMISE = null;

function ref_formatarKm(km) {
    return Number(km || 0).toFixed(3).replace('.', ',');
}

function ref_formatarRodoviaKm(rodovia, km) {
    return `Rodovia ${rodovia} km ${ref_formatarKm(km)}`;
}

function ref_obterTituloRodovia(roadMeta, rodovia) {
    return roadMeta?.trecho || `Rodovia ${rodovia}`;
}

function ref_obterDescricaoPonto(ref) {
    if (!ref) return '';
    return ref.nome_local || ref.descricao || `Marco ${ref.marco || ref_formatarKm(ref.km)}`;
}

function ref_normalizarBase(data) {
    const grouped = {};
    const roads = Array.isArray(data?.roads) ? data.roads : [];
    const rows = Array.isArray(data?.rows) ? data.rows : [];

    roads.forEach(road => {
        grouped[road.rodovia] = {
            nome: ref_obterTituloRodovia(road, road.rodovia),
            kmInicial: Number(road.km_inicial || 0),
            kmFinal: Number(road.km_final || 0),
            observacoes: road.observacoes || '',
            refs: []
        };
        REF_ROADS_META[road.rodovia] = road;
    });

    rows.forEach(row => {
        if (!grouped[row.rodovia]) {
            grouped[row.rodovia] = {
                nome: `Rodovia ${row.rodovia}`,
                kmInicial: 0,
                kmFinal: Number(row.km || 0),
                observacoes: row.observacoes || '',
                refs: []
            };
        }

        grouped[row.rodovia].refs.push({
            km: Number(row.km || 0),
            desc: ref_obterDescricaoPonto(row),
            tipo: row.tipo || 'referencia',
            marco: row.marco || '',
            observacoes: row.observacoes || ''
        });
    });

    Object.values(grouped).forEach(road => {
        road.refs.sort((a, b) => a.km - b.km);
    });

    return grouped;
}

async function ref_carregarBase() {
    if (Object.keys(RODOVIAS_REF_DATA).length > 0) {
        return RODOVIAS_REF_DATA;
    }

    if (!REF_DATA_PROMISE) {
        REF_DATA_PROMISE = (async () => {
            const data = PMRV.dataManager?.loadResource
                ? await PMRV.dataManager.loadResource('referencias_grande_florianopolis_200m', REF_BASE_URL)
                : await fetch(REF_BASE_URL, { cache: 'no-cache' }).then(resp => resp.json());

            RODOVIAS_REF_DATA = ref_normalizarBase(data);
            window.RODOVIAS_REF_DATA = RODOVIAS_REF_DATA;
            window.REF_ROADS_META = REF_ROADS_META;
            return RODOVIAS_REF_DATA;
        })();
    }

    return REF_DATA_PROMISE;
}

async function ref_localizar() {
    await ref_carregarBase();

    const rodKey = document.getElementById('ref_rodovia').value;
    const rawVal = document.getElementById('ref_km').value.replace(',', '.');
    const kmVal = parseFloat(rawVal);

    if (isNaN(kmVal)) {
        PMRV.modal.alert('Por favor, digite um KM valido.');
        return;
    }

    const rodData = RODOVIAS_REF_DATA[rodKey];
    if (!rodData) {
        PMRV.modal.alert('Dados desta rodovia ainda nao cadastrados.');
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

    const diffAnt = anterior ? (kmVal - anterior.km) : Number.POSITIVE_INFINITY;

    if (anterior && Math.abs(diffAnt) < 0.010) {
        descRef = ref_obterDescricaoPonto(anterior);
        msgDist = 'Voce esta aproximadamente neste marco operacional da rodovia.';
    } else if (anterior && proximo) {
        const metrosAnt = Math.round(diffAnt * 1000);
        const metrosProx = Math.round((proximo.km - kmVal) * 1000);
        descRef = `${ref_obterDescricaoPonto(anterior)} <-> ${ref_obterDescricaoPonto(proximo)}`;
        msgDist = `KM aproximado pelo eixo da rodovia: ${metrosAnt} m apos ${ref_obterDescricaoPonto(anterior)} e ${metrosProx} m antes de ${ref_obterDescricaoPonto(proximo)}.`;
    } else if (anterior) {
        const metros = Math.round(diffAnt * 1000);
        descRef = ref_obterDescricaoPonto(anterior);
        msgDist = `KM aproximado pelo eixo da rodovia: ${metros} m apos a ultima referencia cadastrada.`;
    } else if (proximo) {
        const metros = Math.round((proximo.km - kmVal) * 1000);
        descRef = ref_obterDescricaoPonto(proximo);
        msgDist = `KM aproximado pelo eixo da rodovia: ${metros} m antes da primeira referencia cadastrada.`;
    }

    document.getElementById('ref_res_desc').innerHTML = descRef;
    document.getElementById('ref_res_dist').innerHTML = msgDist;

    const fotoWrap = document.getElementById('ref_res_foto_wrap');
    if (fotoWrap) {
        fotoWrap.classList.add('hidden');
    }

    const roadMeta = REF_ROADS_META[rodKey];
    const observacoes = [
        `Trecho operacional: km ${ref_formatarKm(rodData.kmInicial)} ao km ${ref_formatarKm(rodData.kmFinal)}.`,
        roadMeta?.observacoes || rodData.observacoes || ''
    ].filter(Boolean).join(' ');

    document.getElementById('ref_res_obs').innerText = observacoes;

    resBox.classList.remove('hidden');
    resBox.scrollIntoView({ behavior: 'smooth' });
}

window.RODOVIAS_REF_DATA = RODOVIAS_REF_DATA;
window.ref_carregarBase = ref_carregarBase;
window.ref_localizar = ref_localizar;

document.addEventListener('DOMContentLoaded', () => {
    ref_carregarBase().catch(err => {
        console.error('Falha ao carregar base de referencias de rodovias:', err);
    });
});
