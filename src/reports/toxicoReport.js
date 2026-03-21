// Funções para o relatório de STOCK TÓXICO
const generateToxicoReport = (data, headers) => {
    // Encontrar os índices das colunas necessárias
    const indices = {
        referencia: headers.findIndex(h => h === 'Referência'),
        designacao: headers.findIndex(h => h === 'Designação'),
        secao: headers.findIndex(h => h === 'Nº Secção'),
        stockToxico: headers.findIndex(h => h === 'Stock Tóxico (Qnt)'),
        stockToxicoPVP: headers.findIndex(h => h === 'Stock Tóxico (PVP)')
    };

    // Verificar se todas as colunas necessárias foram encontradas
    const missingColumns = Object.entries(indices)
        .filter(([_, index]) => index === -1)
        .map(([col, _]) => col);
    
    if (missingColumns.length > 0) {
        throw new Error(`Colunas obrigatórias não encontradas: ${missingColumns.join(', ')}`);
    }

    // Filtrar apenas itens com Stock Tóxico > 0
    const toxicItems = data.filter(row => {
        const stockToxico = parseFloat(row[headers[indices.stockToxico]]) || 0;
        return stockToxico > 0;
    });

    // Ordenar itens por Stock Tóxico (PVP) em ordem decrescente
    toxicItems.sort((a, b) => {
        const pvpA = parseFloat(a[headers[indices.stockToxicoPVP]]) || 0;
        const pvpB = parseFloat(b[headers[indices.stockToxicoPVP]]) || 0;
        return pvpB - pvpA;
    });

    // Agrupar por seção
    const secaoGroups = {};
    toxicItems.forEach(row => {
        const secao = String(row[headers[indices.secao]]).padStart(3, '0');
        
        if (!secaoGroups[secao]) {
            secaoGroups[secao] = {
                items: [],
                totalRefs: 0,
                totalToxic: 0,
                totalToxicPVP: 0
            };
        }

        secaoGroups[secao].items.push({
            referencia: row[headers[indices.referencia]],
            designacao: row[headers[indices.designacao]],
            stockToxico: parseFloat(row[headers[indices.stockToxico]]) || 0,
            stockToxicoPVP: parseFloat(row[headers[indices.stockToxicoPVP]]) || 0
        });
    });

    // Calcular totais por seção
    Object.values(secaoGroups).forEach(grupo => {
        grupo.totalToxic = grupo.items.length;
        grupo.totalToxicPVP = grupo.items.reduce((sum, item) => sum + item.stockToxicoPVP, 0);
    });

    // Calcular métricas gerais
    const totalRefs = data.length;
    const totalToxic = toxicItems.length;
    const taxaToxic = ((totalToxic / totalRefs) * 100).toFixed(2);
    const totalToxicPVP = toxicItems.reduce((sum, row) => 
        sum + (parseFloat(row[headers[indices.stockToxicoPVP]]) || 0), 0);

    // Preparar dados para os gráficos
    const chartData = {
        labels: Object.keys(secaoGroups),
        totalRefs: [],
        totalToxic: [],
        totalToxicPVP: []
    };

    Object.entries(secaoGroups).forEach(([secao, data]) => {
        chartData.totalToxic.push(data.totalToxic);
        chartData.totalToxicPVP.push(data.totalToxicPVP);
    });

    return {
        mainReport: generateMainHTML(totalRefs, totalToxic, taxaToxic, totalToxicPVP, chartData, toxicItems, indices, headers),
        secaoGroups: secaoGroups
    };
};

const generateMainHTML = (totalRefs, totalToxic, taxaToxic, totalToxicPVP, chartData, toxicItems, indices, headers) => {
    let html = `
        <div class="toxico-container">
            <h2 class="mb-4">Relatório de Stock Tóxico</h2>
            
            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="metric-card">
                        <div class="metric-value">${totalRefs.toLocaleString()}</div>
                        <div class="metric-label">Total de Referências</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="metric-card">
                        <div class="metric-value">${totalToxic.toLocaleString()}</div>
                        <div class="metric-label">Referências Tóxicas</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="metric-card">
                        <div class="metric-value">${taxaToxic}%</div>
                        <div class="metric-label">Taxa de Toxicidade</div>
                    </div>
                </div>
            </div>

            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="chart-container" style="height: 400px;">
                        <canvas id="barChart"></canvas>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="chart-container" style="height: 400px;">
                        <canvas id="pieChart"></canvas>
                    </div>
                </div>
            </div>

            <div class="table-container mt-4">
                <h4 class="mb-3">Lista de Referências Tóxicas</h4>
                <table class="table table-striped table-hover">
                    <thead>
                        <tr>
                            <th>Referência</th>
                            <th>Designação</th>
                            <th>Nº Secção</th>
                            <th>Stock Tóxico (Qnt)</th>
                            <th>Stock Tóxico (PVP)</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    // Preencher a tabela com items ordenados por Stock Tóxico (PVP)
    toxicItems.forEach(item => {
        html += `
            <tr>
                <td>${item[headers[indices.referencia]]}</td>
                <td>${item[headers[indices.designacao]]}</td>
                <td>${item[headers[indices.secao]]}</td>
                <td>${parseFloat(item[headers[indices.stockToxico]]).toLocaleString()}</td>
                <td>${parseFloat(item[headers[indices.stockToxicoPVP]]).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'EUR'
                })}</td>
            </tr>
        `;
    });

    html += `
                    </tbody>
                </table>
            </div>
        </div>

        <script>
            // Gráfico de Barras
            const barCtx = document.getElementById('barChart').getContext('2d');
            new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: ${JSON.stringify(chartData.labels)},
                    datasets: [{
                        label: 'Referências Tóxicas',
                        data: ${JSON.stringify(chartData.totalToxic)},
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1,
                        barPercentage: 0.8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Referências Tóxicas por Seção'
                        }
                    },
                    onClick: (event, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            const secao = ${JSON.stringify(chartData.labels)}[index];
                            window.open('/report/toxico-secao/' + secao, '_blank');
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Quantidade'
                            }
                        }
                    }
                }
            });

            // Gráfico de Pizza
            const pieCtx = document.getElementById('pieChart').getContext('2d');
            new Chart(pieCtx, {
                type: 'pie',
                data: {
                    labels: ['Stock Normal', 'Stock Tóxico'],
                    datasets: [{
                        data: [${totalRefs - totalToxic}, ${totalToxic}],
                        backgroundColor: [
                            'rgba(54, 162, 235, 0.5)',
                            'rgba(255, 99, 132, 0.5)'
                        ],
                        borderColor: [
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 99, 132, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Distribuição de Stock Tóxico'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const percentage = ((context.raw / ${totalRefs}) * 100).toFixed(2);
                                    return \`\${context.label}: \${percentage}%\`;
                                }
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
    const totalRefs = data.items.length;
    const totalToxicPVP = data.items.reduce((sum, item) => sum + item.stockToxicoPVP, 0);

    let html = `
        <div class="section-details">
            <h3 class="mb-4">Relatório de Stock Tóxico - Seção ${secao}</h3>
            
            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="metric-card">
                        <div class="metric-value">${totalRefs}</div>
                        <div class="metric-label">Referências Tóxicas</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="metric-card">
                        <div class="metric-value">${totalToxicPVP.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'EUR'
                        })}</div>
                        <div class="metric-label">Valor Total em Stock Tóxico</div>
                    </div>
                </div>
            </div>

            <div class="table-container mt-4">
                <h4 class="mb-3">Lista de Referências Tóxicas da Seção</h4>
                <table class="table table-striped table-hover">
                    <thead>
                        <tr>
                            <th>Referência</th>
                            <th>Designação</th>
                            <th>Stock Tóxico (Qnt)</th>
                            <th>Stock Tóxico (PVP)</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    // Ordenar itens por Stock Tóxico (PVP) em ordem decrescente
    const sortedItems = [...data.items].sort((a, b) => b.stockToxicoPVP - a.stockToxicoPVP);

    sortedItems.forEach(item => {
        html += `
            <tr>
                <td>${item.referencia}</td>
                <td>${item.designacao}</td>
                <td>${item.stockToxico.toLocaleString()}</td>
                <td>${item.stockToxicoPVP.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'EUR'
                })}</td>
            </tr>
        `;
    });

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    return html;
};

module.exports = {
    generateToxicoReport,
    generateSectionHTML
};