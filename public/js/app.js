/**
 * CONVERSORG - FRONTEND CONTROLLER
 * Desarrollado por Estiven Garces (estivenabreo@gmail.com)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar iconos de Lucide
  if (window.lucide) {
    lucide.createIcons();
  }

  // Elementos DOM Principales
  const toolsGrid = document.getElementById('toolsGrid');
  const catButtons = document.querySelectorAll('.cat-btn');
  const themeToggle = document.getElementById('btnThemeToggle');
  const themeIcon = document.getElementById('themeIcon');
  
  // Modal de Acción
  const actionModal = document.getElementById('actionModal');
  const modalTitle = document.getElementById('modalTitle');
  const dropzoneArea = document.getElementById('dropzoneArea');
  const dropzoneHelpText = document.getElementById('dropzoneHelpText');
  const fileInput = document.getElementById('fileInput');
  const selectedFilesList = document.getElementById('selectedFilesList');
  const optionsBox = document.getElementById('optionsBox');
  const progressContainer = document.getElementById('progressContainer');
  const progressBarFill = document.getElementById('progressBarFill');
  const progressStatusText = document.getElementById('progressStatusText');
  const progressPercentText = document.getElementById('progressPercentText');
  const successScreen = document.getElementById('successScreen');
  const successFileName = document.getElementById('successFileName');
  const statOriginalSize = document.getElementById('statOriginalSize');
  const statResultSize = document.getElementById('statResultSize');
  const btnDownloadResult = document.getElementById('btnDownloadResult');
  const btnPreviewResult = document.getElementById('btnPreviewResult');
  const btnConvertAnother = document.getElementById('btnConvertAnother');
  const modalFooter = document.getElementById('modalFooter');
  const btnCancelAction = document.getElementById('btnCancelAction');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnStartConvert = document.getElementById('btnStartConvert');

  // Opciones específicas
  const optSplitGroup = document.getElementById('optSplitGroup');
  const optWatermarkGroup = document.getElementById('optWatermarkGroup');
  const optRotateGroup = document.getElementById('optRotateGroup');
  const optImagesGroup = document.getElementById('optImagesGroup');

  // Modal de Previsualización
  const previewModal = document.getElementById('previewModal');
  const previewTitle = document.getElementById('previewTitle');
  const previewIframe = document.getElementById('previewIframe');
  const previewTextBox = document.getElementById('previewTextBox');
  const previewImg = document.getElementById('previewImg');
  const previewDownloadDirect = document.getElementById('previewDownloadDirect');
  const btnClosePreview = document.getElementById('btnClosePreview');

  // Modal WiFi
  const wifiModal = document.getElementById('wifiModal');
  const btnWifiModal = document.getElementById('btnWifiModal');
  const btnCloseWifi = document.getElementById('btnCloseWifi');
  const wifiQrCodeImg = document.getElementById('wifiQrCodeImg');
  const wifiUrlText = document.getElementById('wifiUrlText');
  const btnCopyWifiUrl = document.getElementById('btnCopyWifiUrl');

  // Modal Historial
  const historyModal = document.getElementById('historyModal');
  const btnHistoryModal = document.getElementById('btnHistoryModal');
  const btnCloseHistory = document.getElementById('btnCloseHistory');
  const historyTableBody = document.getElementById('historyTableBody');
  const historyEmptyMessage = document.getElementById('historyEmptyMessage');
  const btnClearHistory = document.getElementById('btnClearHistory');

  // Estado Actual
  let currentTool = null;
  let currentFiles = []; // Array de { file, base64, name, size, type }
  let lastConversionResult = null;

  // Registrar Service Worker para PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // ==================== TEMA OSCURO / CLARO ====================
  const savedTheme = localStorage.getItem('conversorg_theme') || 'light';
  applyTheme(savedTheme);

  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
  });

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('conversorg_theme', theme);
    if (themeIcon) {
      themeIcon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
      if (window.lucide) lucide.createIcons();
    }
  }

  // ==================== FILTRO POR CATEGORÍAS ====================
  catButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      catButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.getAttribute('data-category');

      const cards = toolsGrid.querySelectorAll('.tool-card');
      cards.forEach(card => {
        if (cat === 'all' || card.getAttribute('data-category') === cat) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // ==================== ABRIR HERRAMIENTA DE CONVERSIÓN ====================
  toolsGrid.addEventListener('click', e => {
    const card = e.target.closest('.tool-card');
    if (!card) return;

    const tool = card.getAttribute('data-tool');
    const title = card.getAttribute('data-title');
    const accept = card.getAttribute('data-accept') || '*';
    const multiple = card.getAttribute('data-multiple') === 'true';

    openActionModal({ tool, title, accept, multiple });
  });

  function openActionModal({ tool, title, accept, multiple }) {
    currentTool = tool;
    currentFiles = [];
    lastConversionResult = null;

    modalTitle.querySelector('span').textContent = title;
    fileInput.accept = accept;
    fileInput.multiple = multiple;
    dropzoneHelpText.textContent = multiple 
      ? 'Puedes seleccionar uno o varios archivos simultáneamente' 
      : `Formatos permitidos: ${accept}`;

    // Resetear vistas internas
    resetActionModalState();

    // Mostrar/ocultar paneles de opciones según herramienta
    optionsBox.style.display = 'none';
    optSplitGroup.style.display = 'none';
    optWatermarkGroup.style.display = 'none';
    optRotateGroup.style.display = 'none';
    optImagesGroup.style.display = 'none';

    if (tool === 'split-pdf') {
      optionsBox.style.display = 'block';
      optSplitGroup.style.display = 'block';
    } else if (tool === 'watermark-pdf') {
      optionsBox.style.display = 'block';
      optWatermarkGroup.style.display = 'block';
    } else if (tool === 'rotate-pdf') {
      optionsBox.style.display = 'block';
      optRotateGroup.style.display = 'block';
    } else if (tool === 'images-to-pdf') {
      optionsBox.style.display = 'block';
      optImagesGroup.style.display = 'block';
    }

    actionModal.classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  function resetActionModalState() {
    dropzoneArea.style.display = 'block';
    selectedFilesList.innerHTML = '';
    progressContainer.classList.remove('active');
    successScreen.classList.remove('active');
    modalFooter.style.display = 'flex';
    btnStartConvert.disabled = true;
    progressBarFill.style.width = '0%';
  }

  function closeActionModal() {
    actionModal.classList.remove('active');
    currentFiles = [];
    currentTool = null;
  }

  btnCloseModal.addEventListener('click', closeActionModal);
  btnCancelAction.addEventListener('click', closeActionModal);

  // ==================== DRAG & DROP Y SELECCIÓN DE ARCHIVOS ====================
  dropzoneArea.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzoneArea.addEventListener(eventName, e => {
      e.preventDefault();
      dropzoneArea.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzoneArea.addEventListener(eventName, e => {
      e.preventDefault();
      dropzoneArea.classList.remove('dragover');
    });
  });

  dropzoneArea.addEventListener('drop', e => {
    const files = e.dataTransfer.files;
    handleFilesSelected(files);
  });

  fileInput.addEventListener('change', e => {
    handleFilesSelected(e.target.files);
  });

  async function handleFilesSelected(fileList) {
    if (!fileList || fileList.length === 0) return;

    const filesArr = Array.from(fileList);

    for (const f of filesArr) {
      if (!fileInput.multiple && currentFiles.length >= 1) {
        currentFiles = [];
      }
      const b64 = await readFileAsBase64(f);
      currentFiles.push({
        file: f,
        name: f.name,
        size: f.size,
        type: f.type,
        base64: b64
      });
    }

    renderSelectedFiles();
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        // Quitar metadata 'data:...;base64,'
        const b64 = result.split(',')[1];
        resolve(b64);
      };
      reader.onerror = err => reject(err);
      reader.readAsDataURL(file);
    });
  }

  function renderSelectedFiles() {
    selectedFilesList.innerHTML = '';

    if (currentFiles.length === 0) {
      btnStartConvert.disabled = true;
      return;
    }

    btnStartConvert.disabled = false;

    currentFiles.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'file-item-card';
      card.innerHTML = `
        <div class="file-item-info">
          <i data-lucide="file" style="color: var(--primary-light);"></i>
          <div>
            <div class="file-item-name" title="${item.name}">${item.name}</div>
            <div class="file-item-size">${formatBytes(item.size)}</div>
          </div>
        </div>
        <button class="file-item-remove" data-index="${index}" title="Quitar archivo">
          <i data-lucide="trash"></i>
        </button>
      `;
      selectedFilesList.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();

    // Eventos para quitar
    selectedFilesList.querySelectorAll('.file-item-remove').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        currentFiles.splice(idx, 1);
        renderSelectedFiles();
      });
    });
  }

  // ==================== INICIAR CONVERSIÓN ====================
  btnStartConvert.addEventListener('click', async () => {
    if (!currentTool || currentFiles.length === 0) return;

    // Preparar opciones
    const options = {};
    if (currentTool === 'split-pdf') {
      options.pageRanges = document.getElementById('splitRangeInput').value.trim() || 'all';
    } else if (currentTool === 'watermark-pdf') {
      options.watermarkText = document.getElementById('watermarkTextInput').value.trim() || 'ConversorG';
      options.opacity = document.getElementById('watermarkOpacityInput').value;
      options.rotation = document.getElementById('watermarkAngleInput').value;
    } else if (currentTool === 'rotate-pdf') {
      options.degrees = Number(document.getElementById('rotateAngleSelect').value);
    } else if (currentTool === 'images-to-pdf') {
      options.pageSize = document.getElementById('imgPageSizeSelect').value;
    }

    // Ocultar dropzone y footer, activar barra de progreso
    dropzoneArea.style.display = 'none';
    selectedFilesList.style.display = 'none';
    optionsBox.style.display = 'none';
    modalFooter.style.display = 'none';
    progressContainer.classList.add('active');

    // Animación de progreso
    updateProgress(15, 'Analizando archivos...');
    await delay(250);
    updateProgress(45, 'Convirtiendo formato y procesando...');

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: currentTool,
          files: currentFiles.map(f => ({ name: f.name, base64: f.base64, type: f.type })),
          options
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Fallo durante el procesamiento del archivo.');
      }

      updateProgress(100, '¡Conversión finalizada!');
      await delay(350);

      lastConversionResult = data;
      showSuccessScreen(data);
      showToast('Archivo convertido con éxito', 'success');

    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error al procesar el archivo', 'error');
      // Restaurar interfaz
      progressContainer.classList.remove('active');
      dropzoneArea.style.display = 'block';
      selectedFilesList.style.display = 'flex';
      modalFooter.style.display = 'flex';
    }
  });

  function updateProgress(percent, text) {
    progressBarFill.style.width = `${percent}%`;
    progressPercentText.textContent = `${percent}%`;
    if (text) progressStatusText.textContent = text;
  }

  function showSuccessScreen(data) {
    progressContainer.classList.remove('active');
    successScreen.classList.add('active');

    successFileName.textContent = data.fileName;
    statOriginalSize.textContent = `Original: ${formatBytes(data.originalSize)}`;
    statResultSize.textContent = `Resultado: ${formatBytes(data.resultSize)} ${data.savings > 0 ? '(-' + data.savings + '%)' : ''}`;

    btnDownloadResult.href = data.downloadUrl;
    btnDownloadResult.setAttribute('download', data.fileName);

    if (window.lucide) lucide.createIcons();
  }

  // Previsualizar desde resultado exitoso
  btnPreviewResult.addEventListener('click', () => {
    if (lastConversionResult && lastConversionResult.previewUrl) {
      openFilePreview(lastConversionResult.fileName, lastConversionResult.previewUrl);
    }
  });

  btnConvertAnother.addEventListener('click', () => {
    resetActionModalState();
    currentFiles = [];
  });

  // ==================== VISUALIZADOR DE ARCHIVOS ====================
  function openFilePreview(fileName, previewUrl) {
    previewTitle.querySelector('span').textContent = fileName;
    previewDownloadDirect.href = previewUrl;
    previewDownloadDirect.setAttribute('download', fileName);

    previewIframe.style.display = 'none';
    previewTextBox.style.display = 'none';
    previewImg.style.display = 'none';

    const ext = fileName.split('.').pop().toLowerCase();

    if (ext === 'pdf') {
      previewIframe.src = previewUrl;
      previewIframe.style.display = 'block';
    } else if (['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(ext)) {
      previewImg.src = previewUrl;
      previewImg.style.display = 'block';
    } else if (['txt', 'csv', 'json', 'xml'].includes(ext)) {
      fetch(previewUrl)
        .then(r => r.text())
        .then(t => {
          previewTextBox.textContent = t;
          previewTextBox.style.display = 'block';
        });
    } else {
      // Para docx, xlsx, pptx o zip, el iframe intenta mostrar o se ofrece descarga
      previewIframe.src = previewUrl;
      previewIframe.style.display = 'block';
    }

    previewModal.classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  btnClosePreview.addEventListener('click', () => {
    previewModal.classList.remove('active');
    previewIframe.src = '';
  });

  // ==================== CONEXIÓN CELULAR / ANDROID WIFI ====================
  btnWifiModal.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/network-info');
      const data = await res.json();

      wifiQrCodeImg.src = data.qrCode;
      wifiUrlText.textContent = data.networkUrl;
      wifiModal.classList.add('active');
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      showToast('No se pudo obtener información de la red WiFi', 'error');
    }
  });

  btnCloseWifi.addEventListener('click', () => {
    wifiModal.classList.remove('active');
  });

  btnCopyWifiUrl.addEventListener('click', () => {
    const text = wifiUrlText.textContent;
    if (text && text.startsWith('http')) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Enlace WiFi copiado al portapapeles', 'info');
      });
    }
  });

  // ==================== HISTORIAL DE ACTIVIDAD ====================
  btnHistoryModal.addEventListener('click', loadAndShowHistory);
  btnCloseHistory.addEventListener('click', () => historyModal.classList.remove('active'));

  async function loadAndShowHistory() {
    try {
      const res = await fetch('/api/history');
      const list = await res.json();
      renderHistoryTable(list);
      historyModal.classList.add('active');
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      showToast('Error al cargar historial', 'error');
    }
  }

  function renderHistoryTable(list) {
    historyTableBody.innerHTML = '';
    if (!list || list.length === 0) {
      historyEmptyMessage.style.display = 'block';
      return;
    }
    historyEmptyMessage.style.display = 'none';

    list.forEach(item => {
      const tr = document.createElement('tr');
      const dt = new Date(item.timestamp).toLocaleString();
      tr.innerHTML = `
        <td style="color: var(--text-muted); font-size: 0.8rem;">${dt}</td>
        <td><strong>${item.name}</strong></td>
        <td><span class="stat-pill">${item.operation}</span></td>
        <td>${formatBytes(item.resultSize || 0)}</td>
        <td style="text-align: right; white-space: nowrap;">
          ${item.previewUrl ? `
            <button class="btn btn-icon btn-hist-preview" data-name="${item.resultFileName}" data-url="${item.previewUrl}" title="Previsualizar" style="width: 32px; height: 32px;">
              <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
            </button>
          ` : ''}
          ${item.downloadUrl ? `
            <a href="${item.downloadUrl}" class="btn btn-icon" download="${item.resultFileName}" title="Descargar" style="width: 32px; height: 32px; display: inline-flex;">
              <i data-lucide="download" style="width: 16px; height: 16px;"></i>
            </a>
          ` : ''}
          <button class="btn btn-icon btn-hist-delete" data-id="${item.id}" title="Eliminar" style="width: 32px; height: 32px; color: #EF4444;">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          </button>
        </td>
      `;
      historyTableBody.appendChild(tr);
    });

    if (window.lucide) lucide.createIcons();

    // Eventos dentro de historial
    historyTableBody.querySelectorAll('.btn-hist-preview').forEach(btn => {
      btn.addEventListener('click', () => {
        openFilePreview(btn.getAttribute('data-name'), btn.getAttribute('data-url'));
      });
    });

    historyTableBody.querySelectorAll('.btn-hist-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await fetch(`/api/history/${id}`, { method: 'DELETE' });
        loadAndShowHistory();
      });
    });
  }

  btnClearHistory.addEventListener('click', async () => {
    if (confirm('¿Deseas vaciar todo el historial de conversiones?')) {
      await fetch('/api/history', { method: 'DELETE' });
      loadAndShowHistory();
      showToast('Historial vaciado', 'info');
    }
  });

  // Cerrar modales al hacer clic fuera
  [actionModal, previewModal, wifiModal, historyModal].forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });

  // ==================== TOASTS ====================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span>${message}</span>
    `;
    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ==================== UTILIDADES ====================
  function formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
});
