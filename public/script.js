// Variáveis globais
let currentFileId = null;
let currentHeaders = [];

// Elementos do DOM
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const rowCount = document.getElementById('rowCount');
const headersList = document.getElementById('headersList');
const reportButtons = document.getElementById('reportButtons');

// Event Listeners
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', handleDragOver);
dropZone.addEventListener('dragleave', handleDragLeave);
dropZone.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);

// Funções de manipulação de arquivos
function handleDragOver(e) {
    e.preventDefault();
    dropZone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFile(file) {
    // Verificar extensão do arquivo
    const validExtensions = ['.xlsx', '.xls'];
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(extension)) {
        showUploadStatus('Formato de arquivo inválido. Por favor, use .xlsx ou .xls', 'danger');
        return;
    }

    // Criar FormData e enviar arquivo
    const formData = new FormData();
    formData.append('file', file);

    showUploadStatus('Enviando arquivo...', 'info');

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            currentFileId = data.fileId;
            currentHeaders = data.headers;
            
            showUploadStatus('Arquivo processado com sucesso!', 'success');
            displayFileInfo(file.name, data.rowCount, data.headers);
            showReportButtons();
        } else {
            throw new Error(data.error || 'Erro ao processar arquivo');
        }
    })
    .catch(error => {
        showUploadStatus('Erro: ' + error.message, 'danger');
    });
}

// Funções de interface
function showUploadStatus(message, type) {
    uploadStatus.classList.remove('d-none');
    const alert = uploadStatus.querySelector('.alert');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
}

function displayFileInfo(name, rows, headers) {
    fileName.textContent = name;
    rowCount.textContent = rows;
    
    headersList.innerHTML = '';
    headers.forEach((header, index) => {
        const item = document.createElement('div');
        item.className = 'list-group-item';
        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <i class="fas fa-hashtag me-2 text-muted"></i>
                    <span class="header-name">${header}</span>
                </div>
                <span class="badge bg-primary rounded-pill">Coluna ${index + 1}</span>
            </div>
        `;
        headersList.appendChild(item);
    });

    fileInfo.classList.remove('d-none');
}

function showReportButtons() {
    reportButtons.classList.remove('d-none');
}

// Função para gerar relatórios
async function generateReport(reportNumber) {
    if (!currentFileId) {
        showUploadStatus('Nenhum arquivo carregado', 'warning');
        return;
    }

    try {
        showUploadStatus('Gerando relatório...', 'info');

        const response = await fetch(`/report/${reportNumber}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileId: currentFileId
            })
        });

        if (!response.ok) {
            throw new Error('Erro ao gerar relatório');
        }

        // Criar uma nova janela com o HTML do relatório
        const reportHtml = await response.text();
        const reportWindow = window.open('', '_blank');
        reportWindow.document.write(reportHtml);
        reportWindow.document.close();

        showUploadStatus('Relatório gerado com sucesso!', 'success');

    } catch (error) {
        showUploadStatus('Erro ao gerar relatório: ' + error.message, 'danger');
    }
} 