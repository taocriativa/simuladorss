document.addEventListener('DOMContentLoaded', function() {
    const IAS_2024 = 509.26; // Indexante dos Apoios Sociais 2024
    
    // Adicionar event listeners para verificar dinamicamente os dias de contrato
    document.getElementById('tipoContrato').addEventListener('change', verificarTipoContrato);
    document.getElementById('dataInicio').addEventListener('change', verificarDiasContrato);
    document.getElementById('dataFim').addEventListener('change', verificarDiasContrato);
    
    document.getElementById('subsidioForm').addEventListener('submit', function(e) {
        e.preventDefault();
        calcularSubsidio();
    });
    
    function verificarDiasContrato() {
        const dataInicio = new Date(document.getElementById('dataInicio').value);
        const dataFim = new Date(document.getElementById('dataFim').value);
        
        if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) {
            return;
        }
        
        const diasContrato = Math.floor((dataFim - dataInicio) / (1000 * 60 * 60 * 24)) + 1;
        const tipoContrato = document.getElementById('tipoContrato').value;
        
        // Mostrar painel de condição de recursos se for contrato a termo com duração entre 120-359 dias
        if (diasContrato >= 120 && diasContrato < 360 && 
            (tipoContrato === 'termo' || tipoContrato === 'termoIncerto')) {
            document.getElementById('condicaoRecursosCard').style.display = 'block';
        } else {
            document.getElementById('condicaoRecursosCard').style.display = 'none';
        }
    }
    
    function verificarTipoContrato() {
        verificarDiasContrato();
    }
    
    function calcularSubsidio() {
        // Obter valores do formulário
        const idade = parseInt(document.getElementById('idade').value);
        const dataInicio = new Date(document.getElementById('dataInicio').value);
        const dataFim = new Date(document.getElementById('dataFim').value);
        const tipoContrato = document.getElementById('tipoContrato').value;
        const motivoCessacao = document.getElementById('motivoCessacao').value;
        const remuneracaoBase = parseFloat(document.getElementById('remuneracaoBase').value);
        const bonus = parseFloat(document.getElementById('bonus').value) || 0;
        const duodecimoFerias = parseFloat(document.getElementById('duodecimoFerias').value) || 0;
        const duodecimoNatal = parseFloat(document.getElementById('duodecimoNatal').value) || 0;
        const anosDescontos = parseInt(document.getElementById('anosDescontos').value) || 0;
        const temAtividadeIndependente = document.getElementById('temAtividadeIndependente').value === 'sim';
        const rendimentoIndependente = parseFloat(document.getElementById('rendimentoIndependente').value) || 0;
        
        // Verificar se tem direito (verificação básica)
        const diasContrato = Math.floor((dataFim - dataInicio) / (1000 * 60 * 60 * 24)) + 1;
        const temDireito = verificarDireito(diasContrato, motivoCessacao, tipoContrato);
        
        // Se não tiver direito, exibir mensagem
        if (!temDireito.elegivel) {
            exibirResultado(false, temDireito.motivo);
            return;
        }
        
        // Se for potencialmente elegível para subsídio social
        if (temDireito.tipoSubsidio === "social") {
            // Verificar condição de recursos
            const pessoasAgregado = parseInt(document.getElementById('pessoasAgregado').value) || 1;
            const rendimentoAgregado = parseFloat(document.getElementById('rendimentoAgregado').value) || 0;
            
            // Rendimento per capita
            const rendimentoPerCapita = rendimentoAgregado / pessoasAgregado;
            
            // Limite: 80% do IAS por pessoa
            if (rendimentoPerCapita > IAS_2024 * 0.8) {
                exibirResultado(false, "O rendimento per capita do agregado familiar ultrapassa o limite de 80% do IAS, não tendo direito ao Subsídio Social de Desemprego.");
                return;
            }
            
            // Calcular valor do subsídio social (100% do IAS para agregados, 80% para pessoa isolada)
            const valorSubsidioSocial = pessoasAgregado > 1 ? IAS_2024 : IAS_2024 * 0.8;
            
            // Calcular duração (mesmas regras mas com possível redução)
            const duracaoSubsidio = calcularDuracaoSubsidio(idade, diasContrato, anosDescontos, true);
            
            // Exibir resultado para subsídio social
            exibirResultadoSubsidioSocial(valorSubsidioSocial, duracaoSubsidio, temDireito.aviso);
            return;
        }
        
        // Para subsídio regular, continuar com o cálculo normal
        // Calcular remuneração de referência
        const remuneracaoReferencia = remuneracaoBase + bonus + duodecimoFerias + duodecimoNatal;
        
        // Calcular valor do subsídio
        const valorSubsidio = calcularValorSubsidio(remuneracaoReferencia);
        
        // Calcular duração do subsídio
        const duracaoSubsidio = calcularDuracaoSubsidio(idade, diasContrato, anosDescontos);
        
        // Calcular ajuste por atividade independente
        const subsidioAjustado = calcularAjusteAtividadeIndependente(valorSubsidio, temAtividadeIndependente, rendimentoIndependente);
        
        // Exibir resultado
        exibirResultado(true, null, {
            remuneracaoReferencia,
            valorSubsidio,
            valorSubsidioApos180Dias: valorSubsidio * 0.9,
            duracaoSubsidio,
            subsidioAjustado,
            temAtividadeIndependente,
            rendimentoIndependente
        });
    }
    function verificarDireito(diasContrato, motivoCessacao, tipoContrato) {
        // Para subsídio de desemprego regular (360+ dias)
        if (diasContrato >= 360) {
            // Verificar se o motivo da cessação dá direito ao subsídio
            const motivosInelegiveis = ['mutuamente_acordado'];
            if (motivosInelegiveis.includes(motivoCessacao)) {
                return {
                    elegivel: false,
                    motivo: "O motivo de cessação do contrato não confere direito ao subsídio de desemprego."
                };
            }
            
            return { 
                elegivel: true,
                tipoSubsidio: "regular" 
            };
        }
        
        // Para subsídio social de desemprego (120-359 dias em contratos a termo)
        if (diasContrato >= 120 && diasContrato < 360 && 
            (tipoContrato === 'termo' || tipoContrato === 'termoIncerto')) {
            // Verificar se o motivo da cessação dá direito ao subsídio
            const motivosInelegiveis = ['mutuamente_acordado'];
            if (motivosInelegiveis.includes(motivoCessacao)) {
                return {
                    elegivel: false,
                    motivo: "O motivo de cessação do contrato não confere direito ao subsídio de desemprego."
                };
            }
            
            return { 
                elegivel: true,
                tipoSubsidio: "social",
                aviso: "Com base nos dias trabalhados, você pode ter direito ao Subsídio Social de Desemprego, sujeito à condição de recursos."
            };
        }
        
        // Caso não se enquadre em nenhuma das regras acima
        return {
            elegivel: false,
            motivo: "Não cumpre o período mínimo de contribuições: necessita de 360 dias para o subsídio regular ou 120 dias para o subsídio social (em contratos a termo)."
        };
    }
    
    function calcularValorSubsidio(remuneracaoReferencia) {
        // 65% da remuneração de referência
        let valorSubsidio = remuneracaoReferencia * 0.65;
        
        // Valor mínimo (1 IAS)
        valorSubsidio = Math.max(valorSubsidio, IAS_2024);
        
        // Valor máximo (2.5 IAS)
        valorSubsidio = Math.min(valorSubsidio, IAS_2024 * 2.5);
        
        return valorSubsidio;
    }
    
    function calcularDuracaoSubsidio(idade, diasContrato, anosDescontos, isSubsidioSocial = false) {
        let duracaoBase;
        
        // Definir duração base conforme idade
        if (idade < 30) {
            duracaoBase = 150;
        } else if (idade < 40) {
            duracaoBase = 180;
        } else if (idade < 50) {
            duracaoBase = 210;
        } else {
            duracaoBase = 270;
        }
        
        // Para subsídio social com menos de 360 dias, a duração pode ser reduzida
        if (isSubsidioSocial && diasContrato < 360) {
            // Ajuste proporcional para contratos entre 120-359 dias
            duracaoBase = Math.floor(duracaoBase * diasContrato / 360);
        }
        
        // Acréscimo por tempo de contribuição
        const acrescimoDias = Math.floor(anosDescontos / 5) * 30;
        
        // Acréscimo pela duração do último contrato
        let acrescimoContrato = 0;
        if (diasContrato >= 450) { // 15 meses ou mais
            acrescimoContrato = 60;
        } else if (diasContrato >= 180) { // 6 meses ou mais
            acrescimoContrato = 30;
        }
        
        // Duração total (limitada a máximos por faixa etária)
        let duracaoTotal = duracaoBase + acrescimoDias + acrescimoContrato;
        
        // Aplicar limites máximos por faixa etária
        if (idade < 30) {
            duracaoTotal = Math.min(duracaoTotal, 330);
        } else if (idade < 40) {
            duracaoTotal = Math.min(duracaoTotal, 420);
        } else if (idade < 50) {
            duracaoTotal = Math.min(duracaoTotal, 540);
        } else {
            duracaoTotal = Math.min(duracaoTotal, 540);
        }
        
        return duracaoTotal;
    }
    function calcularAjusteAtividadeIndependente(valorSubsidio, temAtividadeIndependente, rendimentoIndependente) {
        // Se não tem atividade independente, retorna o valor original
        if (!temAtividadeIndependente || rendimentoIndependente === 0) {
            return valorSubsidio;
        }
        
        // Valor de tolerância - 35% do IAS
        const valorTolerancia = IAS_2024 * 0.35;
        
        // Se o rendimento for menor que o valor de tolerância, não há redução
        if (rendimentoIndependente <= valorTolerancia) {
            return valorSubsidio;
        }
        
        // Calcula o excedente sobre o valor de tolerância
        const excedente = rendimentoIndependente - valorTolerancia;
        
        // Reduz o subsídio pelo valor excedente (não pode resultar em valor negativo)
        return Math.max(0, valorSubsidio - excedente);
    }
    
    function exibirResultadoSubsidioSocial(valorSubsidio, duracaoSubsidio, aviso) {
        const resultadoCard = document.getElementById('resultadoCard');
        const resultadoDiv = document.getElementById('resultado');
        
        resultadoCard.style.display = 'block';
        resultadoCard.querySelector('.card-header').className = 'card-header bg-warning text-white';
        resultadoCard.querySelector('.card-header h3').textContent = 'Resultado da Simulação - Subsídio Social de Desemprego';
        
        // Formatar valores para exibição
        const formatarEuro = valor => valor.toFixed(2).replace('.', ',') + ' €';
        
        let html = `
            <div class="alert alert-warning mb-4">
                <h4>Tem potencial direito ao Subsídio Social de Desemprego</h4>
                <p>${aviso}</p>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <h5>Valor do Subsídio Social:</h5>
                    <ul class="list-group mb-3">
                        <li class="list-group-item d-flex justify-content-between">
                            <span>Valor mensal:</span>
                            <strong>${formatarEuro(valorSubsidio)}</strong>
                        </li>
                    </ul>
                </div>
                
                <div class="col-md-6">
                    <h5>Duração do Subsídio:</h5>
                    <div class="alert alert-info">
                        <strong>${duracaoSubsidio} dias</strong> (aproximadamente ${Math.round(duracaoSubsidio/30)} meses)
                    </div>
                </div>
            </div>
            
            <div class="alert alert-info mt-3">
                <h5>Observações Importantes:</h5>
                <ul>
                    <li>O Subsídio Social de Desemprego está sujeito à condição de recursos (rendimento do agregado familiar).</li>
                    <li>É necessário que o rendimento per capita do agregado familiar não ultrapasse 80% do IAS (${formatarEuro(IAS_2024 * 0.8)}).</li>
                    <li>A condição de recursos será verificada a cada 180 dias.</li>
                    <li>Confirme sua elegibilidade junto à Segurança Social.</li>
                </ul>
            </div>
        `;
        
        resultadoDiv.innerHTML = html;
    }
    
    function exibirResultado(temDireito, motivo, dados) {
        const resultadoCard = document.getElementById('resultadoCard');
        const resultadoDiv = document.getElementById('resultado');
        
        resultadoCard.style.display = 'block';
        
        if (!temDireito) {
            resultadoCard.querySelector('.card-header').className = 'card-header bg-danger text-white';
            resultadoDiv.innerHTML = `
                <div class="alert alert-danger">
                    <h4>Não tem direito ao subsídio de desemprego</h4>
                    <p>${motivo}</p>
                </div>
            `;
            return;
        }
        
        resultadoCard.querySelector('.card-header').className = 'card-header bg-success text-white';
        resultadoCard.querySelector('.card-header h3').textContent = 'Resultado da Simulação - Subsídio de Desemprego';
        
        // Formatar valores para exibição
        const formatarEuro = valor => valor.toFixed(2).replace('.', ',') + ' €';
        const valorTolerancia = IAS_2024 * 0.35;
        
        let html = `
            <div class="alert alert-success mb-4">
                <h4>Tem direito ao subsídio de desemprego!</h4>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <h5>Valor do Subsídio:</h5>
                    <ul class="list-group mb-3">
                        <li class="list-group-item d-flex justify-content-between">
                            <span>Remuneração de referência:</span>
                            <strong>${formatarEuro(dados.remuneracaoReferencia)}</strong>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                            <span>Valor mensal (primeiros 180 dias):</span>
                            <strong>${formatarEuro(dados.valorSubsidio)}</strong>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                            <span>Valor mensal (após 180 dias):</span>
                            <strong>${formatarEuro(dados.valorSubsidioApos180Dias)}</strong>
                        </li>
                    </ul>
                </div>
                
                <div class="col-md-6">
                    <h5>Duração do Subsídio:</h5>
                    <div class="alert alert-info">
                        <strong>${dados.duracaoSubsidio} dias</strong> (aproximadamente ${Math.round(dados.duracaoSubsidio/30)} meses)
                    </div>
                </div>
            </div>
        `;
        
        if (dados.temAtividadeIndependente) {
            html += `
                <div class="alert alert-warning mt-3">
                    <h5>Atenção - Atividade Independente:</h5>
                    <p>Como possui rendimentos de atividade independente (${formatarEuro(dados.rendimentoIndependente)}/mês):</p>
                    <ul>
                        <li>Valor de tolerância (35% do IAS): ${formatarEuro(valorTolerancia)}</li>
                        ${dados.rendimentoIndependente <= valorTolerancia ? 
                            `<li>Seus rendimentos estão abaixo do valor de tolerância, portanto não há redução no subsídio.</li>` :
                            `<li>Valor excedente ao limite de tolerância: ${formatarEuro(dados.rendimentoIndependente - valorTolerancia)}</li>
                             <li>Valor do subsídio após redução: <strong>${formatarEuro(dados.subsidioAjustado)}</strong></li>`
                        }
                    </ul>
                    <p>Terá que declarar mensalmente os rendimentos à Segurança Social.</p>
                </div>
            `;
        }
        
        resultadoDiv.innerHTML = html;
    }
});
