const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const xlsx = require('xlsx');
const fs = require('fs');

const app = express();
const port = 3000;

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB em bytes
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// Armazenamento temporário para dados das planilhas
const sheetsData = new Map();

// Função para gerar relatório de RUTURAS
function generateRuturasReport(data) {
    // Filtrar itens em rutura (stock ≤ 0)
    const ruturasItems = data.filter(item => parseFloat(item['Stock']) <= 0)
        .sort((a, b) => {
            const diasA = parseFloat(a['Dias Desde a Última Venda']) || 0;
            const diasB = parseFloat(b['Dias Desde a Última Venda']) || 0;
            return diasB - diasA; // Ordem decrescente
        });
    
    // Top 15 referências com mais dias desde última venda
    const top15DiasSemVenda = [...ruturasItems]
        .sort((a, b) => {
            const diasA = parseFloat(a['Dias Desde a Última Venda']) || 0;
            const diasB = parseFloat(b['Dias Desde a Última Venda']) || 0;
            return diasB - diasA;
        })
        .slice(0, 15);

    // Agrupar por seção
    const secaoGroups = {};
    data.forEach(item => {
        const secao = item['Secção'];
        if (!secaoGroups[secao]) {
            secaoGroups[secao] = {
                total: 0,
                ruturas: 0,
                items: []
            };
        }
        secaoGroups[secao].total++;
        if (parseFloat(item['Stock']) <= 0) {
            secaoGroups[secao].ruturas++;
            secaoGroups[secao].items.push(item);
        }
    });

    // Calcular métricas gerais
    const totalRefs = data.length;
    const totalRuturas = ruturasItems.length;
    const taxaRuturas = (totalRuturas / totalRefs * 100).toFixed(2);

    // Preparar dados para gráficos
    const sortedSections = Object.entries(secaoGroups)
        .sort(([secaoA], [secaoB]) => secaoA.localeCompare(secaoB))
        .reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
        }, {});

    const chartData = {
        labels: Object.keys(sortedSections),
        totalData: Object.values(sortedSections).map(g => g.total),
        ruturasData: Object.values(sortedSections).map(g => g.ruturas)
    };

    return {
        totalRefs,
        totalRuturas,
        taxaRuturas,
        ruturasItems,
        secaoGroups,
        chartData,
        top15DiasSemVenda
    };
}

// Função para gerar relatório de BEST SELLERS
function generateBestSellersReport(data) {
    // Filtrar itens classificados como "best"
    const bestSellers = data.filter(item => 
        item['Classificação ADEO'] && 
        item['Classificação ADEO'].toLowerCase().includes('best')
    );

    // Top 10 referências com maior forecast
    const top10Forecast = [...bestSellers]
        .sort((a, b) => {
            const forecastA = parseFloat(a['Forecast Próximos 90 Dias']) || 0;
            const forecastB = parseFloat(b['Forecast Próximos 90 Dias']) || 0;
            return forecastB - forecastA;
        })
        .slice(0, 10);

    // Top 10 referências com maior venda média
    const top10VendaMedia = [...bestSellers]
        .sort((a, b) => {
            const vendaA = parseFloat(a['Venda Média (Diária - Últimos 90 dias)']) || 0;
            const vendaB = parseFloat(b['Venda Média (Diária - Últimos 90 dias)']) || 0;
            return vendaB - vendaA;
        })
        .slice(0, 10);

    // Agrupar por seção
    const secaoGroups = {};
    data.forEach(item => {
        const secao = item['Secção'];
        if (!secaoGroups[secao]) {
            secaoGroups[secao] = {
                total: 0,
                bestSellers: 0,
                items: []
            };
        }
        secaoGroups[secao].total++;
        if (item['Classificação ADEO'] && item['Classificação ADEO'].toLowerCase().includes('best')) {
            secaoGroups[secao].bestSellers++;
            secaoGroups[secao].items.push(item);
        }
    });

    // Calcular métricas gerais
    const totalRefs = data.length;
    const totalBestSellers = bestSellers.length;
    const taxaBestSellers = (totalBestSellers / totalRefs * 100).toFixed(2);

    // Preparar dados para gráficos
    const sortedSections = Object.entries(secaoGroups)
        .sort(([secaoA], [secaoB]) => secaoA.localeCompare(secaoB))
        .reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
        }, {});

    const chartData = {
        labels: Object.keys(sortedSections),
        totalData: Object.values(sortedSections).map(g => g.total),
        bestSellersData: Object.values(sortedSections).map(g => g.bestSellers)
    };

    return {
        totalRefs,
        totalBestSellers,
        taxaBestSellers,
        bestSellers,
        secaoGroups,
        chartData,
        top10Forecast,
        top10VendaMedia
    };
}

// Função para gerar relatório de STOCK
function generateStockReport(data) {
    // Agrupar dados por seção
    const stockBySection = {};
    let totalStockValue = 0;
    let totalReferences = 0;

    data.forEach(item => {
        const section = item['Secção'];
        const stockValue = parseFloat(item['Stock']) * parseFloat(item['Preço']) || 0;
        
        if (!stockBySection[section]) {
            stockBySection[section] = {
                totalValue: 0,
                references: 0
            };
        }
        
        stockBySection[section].totalValue += stockValue;
        stockBySection[section].references += 1;
        totalStockValue += stockValue;
        totalReferences += 1;
    });

    return {
        totalStockValue,
        avgStockValue: totalStockValue / totalReferences,
        stockBySection
    };
}

// Função para gerar relatório de AVS
function generateAVSReport(data) {
    // Agrupar dados por seção
    const avsBySection = {};
    let totalAVSValue = 0;
    let totalReferences = 0;

    data.forEach(item => {
        const section = item['Secção'];
        const avsValue = parseFloat(item['AVS']) * parseFloat(item['Preço']) || 0;
        
        if (!avsBySection[section]) {
            avsBySection[section] = {
                totalValue: 0,
                references: 0
            };
        }
        
        avsBySection[section].totalValue += avsValue;
        avsBySection[section].references += 1;
        totalAVSValue += avsValue;
        totalReferences += 1;
    });

    return {
        totalAVSValue,
        avgAVSValue: totalAVSValue / totalReferences,
        avsBySection
    };
}

// Função para gerar relatório de Tóxico
function generateToxicoReport(data) {
    // Agrupar dados por seção
    const toxicoBySection = {};
    let totalToxicoValue = 0;
    let totalReferences = 0;

    data.forEach(item => {
        const section = item['Secção'];
        const toxicoValue = parseFloat(item['Tóxico']) * parseFloat(item['Preço']) || 0;
        
        if (!toxicoBySection[section]) {
            toxicoBySection[section] = {
                totalValue: 0,
                references: 0
            };
        }
        
        toxicoBySection[section].totalValue += toxicoValue;
        toxicoBySection[section].references += 1;
        totalToxicoValue += toxicoValue;
        totalReferences += 1;
    });

    return {
        totalToxicoValue,
        avgToxicoValue: totalToxicoValue / totalReferences,
        toxicoBySection
    };
}

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Rota para upload de arquivos
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        // Gerar ID único para esta planilha
        const fileId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        
        // Armazenar dados para uso posterior
        sheetsData.set(fileId, {
            data: data,
            originalName: req.file.originalname,
            timestamp: Date.now()
        });

        // Gerar relatórios
        const ruturasReport = generateRuturasReport(data);
        const bestSellersReport = generateBestSellersReport(data);
        const stockReport = generateStockReport(data);
        const avsReport = generateAVSReport(data);
        const toxicoReport = generateToxicoReport(data);

        res.json({
            success: true,
            message: 'Arquivo processado com sucesso',
            fileId: fileId,
            data: data,
            ruturasReport: ruturasReport,
            bestSellersReport: bestSellersReport,
            stockReport: stockReport,
            avsReport: avsReport,
            toxicoReport: toxicoReport
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao processar o arquivo' });
    }
});

// Nova rota para upload de outro tipo de Excel
app.post('/upload2', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao processar o arquivo' });
    }
});

// Rota para gerar relatório RUTURAS TOP1
app.post('/report/1', (req, res) => {
    try {
        const { fileId } = req.body;
        const fileData = sheetsData.get(fileId);
        
        if (!fileData) {
            throw new Error('Arquivo não encontrado');
        }

        const report = generateRuturasReport(fileData.data);
        res.send(report.mainReport);

    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        res.status(500).json({
            error: 'Erro ao gerar relatório',
            details: error.message
        });
    }
});

// Rota para relatório por seção
app.get('/report/ruturas-secao/:secao', (req, res) => {
    try {
        const secao = req.params.secao;
        const fileData = Array.from(sheetsData.values())[0]; // Pega o arquivo mais recente
        
        if (!fileData) {
            throw new Error('Nenhum arquivo carregado');
        }

        const report = generateRuturasReport(fileData.data);
        const secaoData = report.secaoGroups[secao];

        if (!secaoData) {
            throw new Error('Seção não encontrada');
        }

        // Ordenar itens por dias desde última venda
        secaoData.items.sort((a, b) => {
            const diasA = parseFloat(a['Dias Desde a Última Venda']) || 0;
            const diasB = parseFloat(b['Dias Desde a Última Venda']) || 0;
            return diasB - diasA; // Ordem decrescente
        });

        const secaoReportHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Relatório de Ruturas - ${secao}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                .metric-card {
                    background: #fff;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    padding: 20px;
                    margin-bottom: 20px;
                }
                .metric-value {
                    font-size: 24px;
                    font-weight: bold;
                    color: #0d6efd;
                }
                .metric-label {
                    color: #6c757d;
                    font-size: 14px;
                }
                .table-container {
                    margin-top: 20px;
                    overflow-x: auto;
                }
            </style>
        </head>
        <body>
            <div class="container mt-4">
                <h1 class="mb-4">Relatório de Ruturas - ${secao}</h1>
                
                <div class="row">
                    <div class="col-md-4">
                        <div class="metric-card">
                            <div class="metric-value">${secaoData.total}</div>
                            <div class="metric-label">Total de Referências</div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="metric-card">
                            <div class="metric-value">${secaoData.ruturas}</div>
                            <div class="metric-label">Referências em Rutura</div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="metric-card">
                            <div class="metric-value">${((secaoData.ruturas / secaoData.total) * 100).toFixed(2)}%</div>
                            <div class="metric-label">Taxa de Ruturas</div>
                        </div>
                    </div>
                </div>

                <div class="table-container">
                    <h3>Lista de Referências em Rutura</h3>
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>LM</th>
                                <th>Descrição LM</th>
                                <th>Stock</th>
                                <th>Dias Desde Última Venda</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${secaoData.items.map(item => `
                                <tr>
                                    <td>${item['LM']}</td>
                                    <td>${item['Descrição LM']}</td>
                                    <td>${item['Stock']}</td>
                                    <td>${item['Dias Desde a Última Venda']}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </body>
        </html>`;

        res.send(secaoReportHtml);

    } catch (error) {
        console.error('Erro ao gerar relatório por seção:', error);
        res.status(500).json({
            error: 'Erro ao gerar relatório por seção',
            details: error.message
        });
    }
});

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
}); 