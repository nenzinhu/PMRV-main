/**
 * Módulo: Pesos e Dimensões (PBT + Dimensoes)
 * Desenvolvido para cálculos técnicos conforme Resoluções CONTRAN.
 */

const PES_LIMITES_EIXOS = {
    "simples_2": { nome: "Eixo Simples (2 pneus)", limite: 6000 },
    "simples_4": { nome: "Eixo Simples (4 pneus)", limite: 10000 },
    "tandem_duplo": { nome: "Tandem Duplo (8 pneus)", limite: 17000 },
    "tandem_triplo": { nome: "Tandem Triplo (12 pneus)", limite: 25500 },
    "direcional_duplo": { nome: "Direcional Duplo (4 pneus)", limite: 12000 },
    "vanderleia_duplo": { nome: "Vanderleia (2 eixos distanciados)", limite: 20000 },
    "vanderleia_triplo": { nome: "Vanderleia (3 eixos distanciados)", limite: 30000 },
    "extralarga_simples": { nome: "Eixo com Pneus Extra-Largos", limite: 9000 }
};

/**
 * Arredondamento Pericial (Resolução 882/21)
 * O valor medido na balança deve ser arredondado para a dezena mais próxima para baixo.
 * Ex: 10.057 kg -> 10.050 kg
 */
function pes_arredondar(valor) {
    return Math.floor(valor / 10) * 10;
}

function pes_calcular() {
    const metodo = document.getElementById('pes_metodo').value;
    const configSelect = document.getElementById('pes_config');
    const manualInput = document.getElementById('pes_limite_manual');
    
    let limiteLegalPBT = configSelect.value === 'MANUAL' ? 
                         parseFloat(manualInput.value || 0) : 
                         parseFloat(configSelect.value);

    let pbtApuradoOriginal = 0;
    if (metodo === 'nf') {
        const tara = parseFloat(document.getElementById('pes_tara').value || 0);
        const cargaNF = parseFloat(document.getElementById('pes_carga').value || 0);
        pbtApuradoOriginal = tara + cargaNF;
    } else {
        pbtApuradoOriginal = parseFloat(document.getElementById('pes_medido').value || 0);
    }

    // Aplica arredondamento legal se for balança
    const pbtApurado = metodo === 'balanca' ? pes_arredondar(pbtApuradoOriginal) : pbtApuradoOriginal;

    // Tolerância PBT: 5% (Res. 882/21)
    const tolPBT = Math.floor(limiteLegalPBT * 0.05);
    const limiteMaxPBT = limiteLegalPBT + tolPBT;
    const excessoPBT = pbtApurado - limiteLegalPBT;

    document.getElementById('res_pbt_apurado').innerHTML = `${pbtApurado.toLocaleString('pt-BR')} kg ${metodo === 'balanca' ? '<small style="font-size:10px; opacity:0.7;">(Arredondado)</small>' : ''}`;
    document.getElementById('res_pbt_limite').innerText = limiteLegalPBT.toLocaleString('pt-BR') + " kg";
    document.getElementById('res_pbt_tolerancia').innerText = limiteMaxPBT.toLocaleString('pt-BR') + " kg";

    let eixosExcedentes = [];
    let maiorExcessoEixo = 0;

    // Cálculo de Eixos
    if (metodo === 'balanca') {
        const eixosDOM = document.querySelectorAll('#pes_eixos_lista .sub-box');
        eixosDOM.forEach(el => {
            const tipoKey = el.querySelector('.pes-eixo-tipo').value;
            const pesoOriginal = parseFloat(el.querySelector('.pes-eixo-peso').value || 0);
            const resEl = el.querySelector('.pes-eixo-res');
            
            if (pesoOriginal > 0) {
                const pesoInp = pes_arredondar(pesoOriginal);
                const limitLegalEixo = PES_LIMITES_EIXOS[tipoKey].limite;
                const tolEixo = Math.floor(limitLegalEixo * 0.125); // Tolerância 12,5% (Lei 14.229/21)
                const maxEixo = limitLegalEixo + tolEixo;
                
                if (pesoInp > maxEixo) {
                    const excEixo = pesoInp - limitLegalEixo;
                    if (excEixo > maiorExcessoEixo) maiorExcessoEixo = excEixo;
                    resEl.innerHTML = `<span style="color:#D82A2E">⚠️ EXCESSO: ${excEixo.toLocaleString('pt-BR')}kg (Máx: ${maxEixo.toLocaleString('pt-BR')}kg)</span>`;
                    eixosExcedentes.push(`${PES_LIMITES_EIXOS[tipoKey].nome}: ${pesoInp}kg (Exc: ${excEixo}kg)`);
                } else {
                    resEl.innerHTML = `<span style="color:#10b981">✅ LEGAL (Máx c/ tol: ${maxEixo.toLocaleString('pt-BR')}kg)</span>`;
                }
            } else {
                resEl.innerText = "";
            }
        });
    }

    const alerta = document.getElementById('pes_alerta');
    if (pbtApurado <= 0 && eixosExcedentes.length === 0) { 
        alerta.classList.add('hidden'); 
        document.getElementById('pes_infracao_box').classList.add('hidden');
        return; 
    }
    
    alerta.classList.remove('hidden');

    const excessoPBTOcorre = pbtApurado > limiteMaxPBT;
    const excessoEixoOcorre = eixosExcedentes.length > 0;

    if (!excessoPBTOcorre && !excessoEixoOcorre) {
        pes_setAlerta(alerta, 'legal', "DENTRO DO LIMITE", `Pesagem em conformidade.<br><small>Arredondamento e tolerâncias aplicadas (Res. 882/21).</small>`);
        document.getElementById('pes_infracao_box').classList.add('hidden');
    } else {
        let tit = "IRREGULARIDADE DETECTADA!";
        let desc = "";
        let detalhesInfra = "";
        let transbordo = 0;

        // Multa baseada no maior excesso
        const excessoParaMulta = Math.max(excessoPBT, maiorExcessoEixo);
        const valorMulta = pes_getValorMulta(excessoParaMulta);

        // Art. 10 da Res. 882/21 (Remanejamento)
        const somenteEixo = !excessoPBTOcorre && excessoEixoOcorre;

        if (excessoPBTOcorre) {
            transbordo = pbtApurado - limiteLegalPBT;
            desc += `<strong>PBT:</strong> +${excessoPBT.toLocaleString('pt-BR')} kg (Acima da tolerância)<br>`;
            desc += `<div style="color:#e74c3c; font-weight:bold; margin:5px 0;">🚚 TRANSBORDO: Retirar ${transbordo.toLocaleString('pt-BR')} kg</div>`;
            detalhesInfra += `EXCESSO PBT (Art. 231, V)\nLimite: ${limiteLegalPBT.toLocaleString('pt-BR')}kg | Apurado: ${pbtApurado.toLocaleString('pt-BR')}kg\nExcesso: ${excessoPBT.toLocaleString('pt-BR')}kg\nTransbordo: ${transbordo.toLocaleString('pt-BR')}kg\n`;
        }
        
        if (excessoEixoOcorre) {
            const remanejamentoTotal = eixosExcedentes.reduce((acc, curr) => {
                const match = curr.match(/Exc: (\d+)kg/);
                return acc + (match ? parseInt(match[1]) : 0);
            }, 0);

            if (somenteEixo) {
                tit = "REMANEJAMENTO OBRIGATÓRIO (Art. 10)";
                desc += `<div style="background:rgba(245,158,11,0.1);padding:8px;border-radius:8px;margin-bottom:8px; border:1px solid #f59e0b;">⚖️ <strong>PBT REGULAR:</strong> Conforme Art. 10 da Res. 882/21, proceda ao remanejamento. Se impossível, aplique a multa.</div>`;
            }
            desc += `<strong>EIXOS:</strong> ${eixosExcedentes.length} conjuntos excedentes.<br>`;
            detalhesInfra += `\nEXCESSO NOS EIXOS (Art. 231, V):\n${eixosExcedentes.join('\n')}`;
        }

        desc += `<div style="margin-top:10px; border-top:1px solid rgba(0,0,0,0.1); padding-top:10px;">💰 <strong>MULTA ESTIMADA: R$ ${valorMulta.toFixed(2).replace('.', ',')}</strong></div>`;

        pes_setAlerta(alerta, 'excesso', tit, desc);
        const metodoTxt = metodo === 'balanca' ? 'BALANÇA' : 'NOTA FISCAL';
        
        let resumoInfra = `*LAUDO TÉCNICO DE PESAGEM (RES. 882/21)*\n`;
        resumoInfra += `Enquadramento: Art. 231, V do CTB\n`;
        resumoInfra += `Método: ${metodoTxt}\n`;
        resumoInfra += `----------------------------\n`;
        resumoInfra += `${detalhesInfra}\n`;
        resumoInfra += `----------------------------\n`;
        resumoInfra += `Medida Adm: Retenção para transbordo/remanejamento.\n`;
        resumoInfra += `Valor Estimado: R$ ${valorMulta.toFixed(2).replace('.', ',')}`;

        pes_montarInfracao('PESO (RES. 882/21)', resumoInfra);
    }
}


/**
 * LÓGICA DE DIMENSÕES
 */
function pes_calcDimensoes() {
    const tipo = document.getElementById('dim_tipo');
    const larg = parseFloat(document.getElementById('dim_largura').value || 0);
    const alt = parseFloat(document.getElementById('dim_altura').value || 0);
    const comp = parseFloat(document.getElementById('dim_comprimento').value || 0);
    const eixos = parseFloat(document.getElementById('dim_entre_eixos').value || 0);
    const balMed = parseFloat(document.getElementById('dim_balanco_medido').value || 0);

    const limComp = parseFloat(tipo.value);
    const limLarg = 2.60;
    const limAlt = 4.40;
    
    // Balanço: 60% do entre-eixos, máximo 3.50m
    const limBal = Math.min(eixos * 0.6, 3.50);
    if (eixos > 0) {
        document.getElementById('dim_balanco_res').innerHTML = `Limite Balanço: <strong>${limBal.toFixed(2)}m</strong> (60% de ${eixos}m)`;
    }

    const alerta = document.getElementById('dim_alerta');
    if (larg === 0 && alt === 0 && comp === 0) { 
        alerta.classList.add('hidden'); 
        document.getElementById('pes_infracao_box').classList.add('hidden');
        return; 
    }
    alerta.classList.remove('hidden');

    let erros = [];
    let detalhes = "";
    if (larg > limLarg) {
        erros.push(`Largura excedente (${larg}m > ${limLarg}m)`);
        detalhes += `- Largura: ${larg}m (Limite: ${limLarg}m)\n`;
    }
    if (alt > limAlt) {
        erros.push(`Altura excedente (${alt}m > ${limAlt}m)`);
        detalhes += `- Altura: ${alt}m (Limite: ${limAlt}m)\n`;
    }
    if (comp > limComp) {
        erros.push(`Comprimento excedente (${comp}m > ${limComp}m)`);
        detalhes += `- Comprimento: ${comp}m (Limite: ${limComp}m)\n`;
    }
    if (balMed > limBal && eixos > 0) {
        erros.push(`Balanço excedente (${balMed}m > ${limBal.toFixed(2)}m)`);
        detalhes += `- Balanço: ${balMed}m (Limite: ${limBal.toFixed(2)}m)\n`;
    }

    if (erros.length === 0) {
        pes_setAlerta(alerta, 'legal', "DIMENSÕES LEGAIS", "Veículo dentro dos limites da Res. 210/06.");
        document.getElementById('pes_infracao_box').classList.add('hidden');
    } else {
        pes_setAlerta(alerta, 'excesso', "DIMENSÃO EXCEDENTE!", erros.join('<br>'));
        
        let resumoInfra = `*INFRAÇÃO: DIMENSÕES EXCEDENTES*\n`;
        resumoInfra += `Enquadramento: Art. 231, IV do CTB\n`;
        resumoInfra += `Código da Infração: 682-32\n`;
        resumoInfra += `----------------------------\n`;
        resumoInfra += `Irregularidades:\n${detalhes}`;
        resumoInfra += `----------------------------\n`;
        resumoInfra += `Medida Adm: Retenção para regularização (AET se couber).`;

        pes_montarInfracao('DIMENSÕES (RES. 210/06)', resumoInfra);
    }
}

/**
 * Auxiliares de UI
 */
function pes_setAlerta(el, status, titulo, desc) {
    el.style.background = status === 'legal' ? "rgba(16, 185, 129, 0.15)" : "rgba(216, 42, 46, 0.15)";
    el.style.border = status === 'legal' ? "1px solid #10b981" : "1px solid #D82A2E";
    el.style.color = status === 'legal' ? "#10b981" : "#D82A2E";
    el.querySelector('[id$="_alerta_icon"]').innerText = status === 'legal' ? "✅" : "⚠️";
    el.querySelector('[id$="_alerta_titulo"]').innerText = titulo;
    el.querySelector('[id$="_alerta_desc"]').innerHTML = desc;
}

function pes_montarInfracao(tipo, detalhes) {
    const box = document.getElementById('pes_infracao_box');
    const text = document.getElementById('pes_infracao_text');
    if (box && text) {
        text.innerText = detalhes;
        box.classList.remove('hidden');
        box.style.display = 'block';
    }
}

function pes_copiarInfracao() {
    const text = document.getElementById('pes_infracao_text').innerText;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.querySelector('[data-click="pes_copiarInfracao()"]');
        const original = btn.innerText;
        btn.innerText = "✅ Copiado!";
        setTimeout(() => btn.innerText = original, 2000);
    });
}

// Global
window.pes_switchTab = pes_switchTab;
window.pes_onMetodoChange = pes_onMetodoChange;
window.pes_onConfigChange = pes_onConfigChange;
window.pes_adicionarEixo = pes_adicionarEixo;
window.pes_removerEixo = pes_removerEixo;
window.pes_calcular = pes_calcular;
window.pes_calcDimensoes = pes_calcDimensoes;
window.pes_copiarInfracao = pes_copiarInfracao;

document.addEventListener('DOMContentLoaded', () => { pes_init(); pes_switchTab('pbt'); });
