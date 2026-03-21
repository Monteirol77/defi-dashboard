// Funções para o relatório de RUTURAS
const generateRuturasReport = (data, headers) => {
    // Identificar o tipo de arquivo baseado nos cabeçalhos
    const isNewFormat = headers.includes('Nº Dias em Rutura (Últimos 30 Dias)');
    
    // Encontrar os índices das colunas necessárias baseado no formato
    const indices = {};
    
    if (isNewFormat) {
        // Novo formato
        indices.secao = headers.findIndex(h => h === 'Secção');
        indices.descSecao = headers.findIndex(h => h === 'Desc. Secção');
        indices.referencia = headers.findIndex(h => h === 'LM');
        indices.designacao = headers.findIndex(h => h === 'Descrição LM');
        indices.diasUltimaVenda = headers.findIndex(h => h === 'Dias Desde a Última Venda');
        indices.stock = headers.findIndex(h => h === 'Stock');
        indices.diasRutura = headers.findIndex(h => h === 'Nº Dias em Rutura (Últimos 30 Dias)');
    } else {
        // Formato antigo
        indices.secao = headers.findIndex(h => h === 'Nº Secção');
        indices.descSecao = headers.findIndex(h => h === 'Secção');
        indices.referencia = headers.findIndex(h => h === 'Referência');
        indices.designacao = headers.findIndex(h => h === 'Designação');
        indices.diasUltimaVenda = headers.findIndex(h => h === 'Dias Desde a Última Venda');
        indices.stock = headers.findIndex(h => h === 'Stock');
    }

    // Verificar se encontrou todas as colunas necessárias
    const requiredIndices = ['secao', 'referencia', 'designacao', 'stock'];
    const missingColumns = requiredIndices.filter(col => indices[col] === -1);
    
    if (missingColumns.length > 0) {
        throw new Error(`Colunas obrigatórias não encontradas: ${missingColumns.join(', ')}`);
    }

    // Agrupar dados por seção
    const secaoGroups = {};
    
    data.forEach(row => {
        const secao = row[headers[indices.secao]];
        if (!secao) return; // Ignorar itens sem seção

        // Inicializar grupo da seção se não existir
        if (!secaoGroups[secao]) {
            secaoGroups[secao] = {
                descricao: row[headers[indices.descSecao]] || secao,
                items: [],
                totalRefs: 0,
                totalRuturas: 0
            };
        }

        // Criar objeto do item com os dados relevantes
        const item = {
            referencia: row[headers[indices.referencia]],
            designacao: row[headers[indices.designacao]],
            diasUltimaVenda: row[headers[indices.diasUltimaVenda]],
            stock: row[headers[indices.stock]],
            diasRutura: isNewFormat ? row[headers[indices.diasRutura]] : null
        };

        // Incrementar contadores
        secaoGroups[secao].totalRefs++;
        
        // Verificar se é uma rutura
        const stock = parseFloat(item.stock) || 0;
        if (stock === 0) {
            secaoGroups[secao].totalRuturas++;
        }

        // Adicionar item à lista da seção
        secaoGroups[secao].items.push(item);
    });

    // Ordenar items de cada seção por dias desde última venda
    Object.values(secaoGroups).forEach(grupo => {
        grupo.items.sort((a, b) => {
            const diasA = parseFloat(a.diasUltimaVenda) || 0;
            const diasB = parseFloat(b.diasUltimaVenda) || 0;
            return diasB - diasA; // Ordem decrescente
        });
    });

    return {
        mainReport: generateMainHTML(secaoGroups),
        secaoGroups: secaoGroups
    };
};

const generateMainHTML = (secaoGroups) => {
    let html = `
        <div class="ruturas-container">
            <h2>Relatório de Ruturas</h2>
            
            <div class="row">
                <div class="col-md-4">
                    <div class="metric-card">
                        <div class="metric-value">${Object.values(secaoGroups).reduce((sum, grupo) => sum + grupo.totalRefs, 0)}</div>
                        <div class="metric-label">Total de Referências</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="metric-card">
                        <div class="metric-value">${Object.values(secaoGroups).reduce((sum, grupo) => sum + grupo.totalRuturas, 0)}</div>
                        <div class="metric-label">Total em Rutura</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="metric-card">
                        <div class="metric-value">${((Object.values(secaoGroups).reduce((sum, grupo) => sum + grupo.totalRuturas, 0) / 
                                                    Object.values(secaoGroups).reduce((sum, grupo) => sum + grupo.totalRefs, 0)) * 100).toFixed(2)}%</div>
                        <div class="metric-label">Taxa de Rutura</div>
                    </div>
                </div>
            </div>

            <div class="chart-container">
                <canvas id="ruturasChart"></canvas>
            </div>

            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Seção</th>
                            <th>Descrição</th>
                            <th>Total Referências</th>
                            <th>Total Ruturas</th>
                            <th>Taxa de Rutura</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    // Dados para o gráfico
    const chartData = {
        labels: [],
        totalRefs: [],
        totalRuturas: []
    };

    // Preencher a tabela e dados do gráfico
    Object.entries(secaoGroups).forEach(([secao, data]) => {
        const taxaRutura = ((data.totalRuturas / data.totalRefs) * 100).toFixed(2);
        
        chartData.labels.push(secao);
        chartData.totalRefs.push(data.totalRefs);
        chartData.totalRuturas.push(data.totalRuturas);

        html += `
            <tr>
                <td>${secao}</td>
                <td>${data.descricao}</td>
                <td>${data.totalRefs}</td>
                <td>${data.totalRuturas}</td>
                <td>${taxaRutura}%</td>
                <td>
                    <button onclick="verDetalhesRuturas('${secao}')" class="btn btn-primary btn-sm">
                        Ver Detalhes
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
                    </tbody>
                </table>
            </div>
        </div>
        <script>
            // Configuração do gráfico
            const ctx = document.getElementById('ruturasChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ${JSON.stringify(chartData.labels)},
                    datasets: [{
                        label: 'Total Referências',
                        data: ${JSON.stringify(chartData.totalRefs)},
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }, {
                        label: 'Total Ruturas',
                        data: ${JSON.stringify(chartData.totalRuturas)},
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    },
                    onClick: (event, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            const secao = ${JSON.stringify(chartData.labels)}[index];
                            const dataset = elements[0].datasetIndex;
                            // Só abre o relatório por seção se clicar na barra de ruturas (dataset 1)
                            if (dataset === 1) {
                                window.open(\`/report/ruturas-secao/\${secao}\`, '_blank');
                            }
                        }
                    }
                }
            });
        </script>
    `;

    return html;
};

const generateSectionHTML = (secao, data) => {
    let html = `
        <div class="section-details">
            <h3>Detalhes da Seção: ${secao} - ${data.descricao}</h3>
            
            <div class="row">
                <div class="col-md-4">
                    <div class="metric-card">
                        <div class="metric-value">${data.totalRefs}</div>
                        <div class="metric-label">Total de Referências</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="metric-card">
                        <div class="metric-value">${data.totalRuturas}</div>
                        <div class="metric-label">Total em Rutura</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="metric-card">
                        <div class="metric-value">${((data.totalRuturas / data.totalRefs) * 100).toFixed(2)}%</div>
                        <div class="metric-label">Taxa de Rutura</div>
                    </div>
                </div>
            </div>

            <table class="table">
                <thead>
                    <tr>
                        <th>Referência</th>
                        <th>Designação</th>
                        <th>Dias Desde Última Venda</th>
                        <th>Stock</th>
                        ${data.items[0].diasRutura !== null ? '<th>Dias em Rutura (30D)</th>' : ''}
                    </tr>
                </thead>
                <tbody>
    `;

    data.items.forEach(item => {
        const stock = parseFloat(item.stock) || 0;
        html += `
            <tr class="${stock === 0 ? 'table-danger' : ''}">
                <td>${item.referencia}</td>
                <td>${item.designacao}</td>
                <td>${item.diasUltimaVenda || 'N/A'}</td>
                <td>${stock}</td>
                ${item.diasRutura !== null ? `<td>${item.diasRutura}</td>` : ''}
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    return html;
};

module.exports = {
    generateRuturasReport,
    generateSectionHTML
}; 