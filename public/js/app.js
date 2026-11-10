/**
 * CONVERSORG - FRONTEND CONTROLLER (COMPATIBLE CON GITHUB PAGES Y LOCAL)
 * Desarrollador: Estiven Garces (estivenabreo@gmail.com)
 * GitHub: https://github.com/EstivenG1
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
  const wifiQrCodeContainer = document.getElementById('wifiQrCodeContainer') || document.querySelector('.qr-frame');
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
  let currentFiles = []; // Array de { file, buffer, name, size, type }
  let lastResult = null; // { blob, blobUrl, fileName, originalSize, resultSize, text }
  const activeBlobUrls = new Map();

  // Registrar Service Worker para PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
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

  // ==================== ABRIR HERRAMIENTA ====================
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
    lastResult = null;

    modalTitle.querySelector('span').textContent = title;
    fileInput.accept = accept;
    fileInput.multiple = multiple;
    dropzoneHelpText.textContent = multiple 
      ? 'Puedes seleccionar uno o varios archivos simultáneamente' 
      : `Formatos permitidos: ${accept}`;

    resetActionModalState();

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
    selectedFilesList.style.display = 'flex';
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

  // ==================== DRAG & DROP ====================
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
    handleFilesSelected(e.dataTransfer.files);
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
      const buffer = await f.arrayBuffer();
      currentFiles.push({
        file: f,
        name: f.name,
        size: f.size,
        type: f.type,
        buffer: buffer
      });
    }

    renderSelectedFiles();
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
          <i data-lucide="file" style="color: var(--rolex-green);"></i>
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

    selectedFilesList.querySelectorAll('.file-item-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        currentFiles.splice(idx, 1);
        renderSelectedFiles();
      });
    });
  }

  // ==================== EJECUTAR CONVERSIÓN EN NAVEGADOR ====================
  btnStartConvert.addEventListener('click', async () => {
    if (!currentTool || currentFiles.length === 0) return;

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

    dropzoneArea.style.display = 'none';
    selectedFilesList.style.display = 'none';
    optionsBox.style.display = 'none';
    modalFooter.style.display = 'none';
    progressContainer.classList.add('active');

    updateProgress(20, 'Cargando documento en el navegador...');
    await delay(180);

    try {
      let resultBlob;
      let outputFileName = '';
      const firstFile = currentFiles[0];
      const baseName = (firstFile.name || 'archivo').replace(/\.[^/.]+$/, '');
      const originalTotalSize = currentFiles.reduce((acc, f) => acc + f.size, 0);
      let textContent = '';

      updateProgress(45, 'Procesando conversión 100% en tu navegador...');
      await delay(150);

      switch (currentTool) {
        case 'pdf-to-word': {
          resultBlob = await ClientConverter.pdfToWord(firstFile.buffer, options);
          outputFileName = `${baseName}_ConversorG.docx`;
          break;
        }
        case 'word-to-pdf': {
          resultBlob = await ClientConverter.wordToPdf(firstFile.buffer, options);
          outputFileName = `${baseName}_ConversorG.pdf`;
          break;
        }
        case 'merge-pdf': {
          const buffers = currentFiles.map(f => f.buffer);
          resultBlob = await ClientConverter.mergePdfs(buffers, options);
          outputFileName = `unidos_ConversorG_${Date.now()}.pdf`;
          break;
        }
        case 'split-pdf': {
          const splitRes = await ClientConverter.splitPdf(firstFile.buffer, options);
          resultBlob = splitRes.blob;
          outputFileName = splitRes.filename;
          break;
        }
        case 'pdf-to-excel': {
          resultBlob = await ClientConverter.pdfToExcel(firstFile.buffer, options);
          outputFileName = `${baseName}_ConversorG.xlsx`;
          break;
        }
        case 'excel-to-pdf': {
          resultBlob = await ClientConverter.excelToPdf(firstFile.buffer, options);
          outputFileName = `${baseName}_ConversorG.pdf`;
          break;
        }
        case 'pdf-to-pptx': {
          resultBlob = await ClientConverter.pdfToPptx(firstFile.buffer, options);
          outputFileName = `${baseName}_ConversorG.pptx`;
          break;
        }
        case 'pptx-to-pdf': {
          resultBlob = await ClientConverter.pptxToPdf(firstFile.buffer, options);
          outputFileName = `${baseName}_ConversorG.pdf`;
          break;
        }
        case 'images-to-pdf': {
          resultBlob = await ClientConverter.imagesToPdf(currentFiles, options);
          outputFileName = `fotos_ConversorG_${Date.now()}.pdf`;
          break;
        }
        case 'pdf-to-jpg': {
          const jpgRes = await ClientConverter.pdfToJpg(firstFile.buffer, options);
          resultBlob = jpgRes.blob;
          outputFileName = jpgRes.filename;
          break;
        }
        case 'watermark-pdf': {
          resultBlob = await ClientConverter.watermarkPdf(firstFile.buffer, options.watermarkText, options);
          outputFileName = `${baseName}_marca_ConversorG.pdf`;
          break;
        }
        case 'rotate-pdf': {
          resultBlob = await ClientConverter.rotatePdf(firstFile.buffer, options.degrees);
          outputFileName = `${baseName}_rotado_ConversorG.pdf`;
          break;
        }
        case 'compress-pdf': {
          resultBlob = await ClientConverter.compressPdf(firstFile.buffer, options);
          outputFileName = `${baseName}_optimizado_ConversorG.pdf`;
          break;
        }
        case 'extract-text': {
          const resTxt = await ClientConverter.extractText(firstFile.buffer);
          resultBlob = resTxt.blob;
          textContent = resTxt.text;
          outputFileName = `${baseName}_texto_ConversorG.txt`;
          break;
        }
        default:
          throw new Error('Operación no soportada.');
      }

      updateProgress(100, '¡Conversión completada con éxito!');
      await delay(250);

      const blobUrl = URL.createObjectURL(resultBlob);
      const resultSize = resultBlob.size;
      const savings = originalTotalSize > resultSize ? Math.round((1 - resultSize / originalTotalSize) * 100) : 0;

      lastResult = {
        blob: resultBlob,
        blobUrl: blobUrl,
        fileName: outputFileName,
        originalSize: originalTotalSize,
        resultSize: resultSize,
        savings: savings,
        text: textContent
      };

      // Guardar en historial local
      addHistoryRecord({
        name: firstFile.name,
        operation: currentTool,
        originalSize: originalTotalSize,
        resultSize: resultSize,
        fileName: outputFileName,
        blobUrl: blobUrl,
        blob: resultBlob
      });

      showSuccessScreen(lastResult);
      showToast('Documento procesado con éxito', 'success');

    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error durante la conversión', 'error');
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

  function showSuccessScreen(result) {
    progressContainer.classList.remove('active');
    successScreen.classList.add('active');

    successFileName.textContent = result.fileName;
    statOriginalSize.textContent = `Original: ${formatBytes(result.originalSize)}`;
    statResultSize.textContent = `Resultado: ${formatBytes(result.resultSize)} ${result.savings > 0 ? '(-' + result.savings + '%)' : ''}`;

    btnDownloadResult.href = result.blobUrl;
    btnDownloadResult.setAttribute('download', result.fileName);

    if (window.lucide) lucide.createIcons();
  }

  btnPreviewResult.addEventListener('click', () => {
    if (lastResult) {
      openFilePreview(lastResult.fileName, lastResult.blobUrl, lastResult.text);
    }
  });

  btnConvertAnother.addEventListener('click', () => {
    resetActionModalState();
    currentFiles = [];
  });

  // ==================== VISUALIZADOR DE ARCHIVOS ====================
  function openFilePreview(fileName, blobUrl, rawText = '') {
    previewTitle.querySelector('span').textContent = fileName;
    previewDownloadDirect.href = blobUrl;
    previewDownloadDirect.setAttribute('download', fileName);

    previewIframe.style.display = 'none';
    previewTextBox.style.display = 'none';
    previewImg.style.display = 'none';

    const ext = fileName.split('.').pop().toLowerCase();

    if (ext === 'pdf') {
      previewIframe.src = blobUrl;
      previewIframe.style.display = 'block';
    } else if (['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(ext)) {
      previewImg.src = blobUrl;
      previewImg.style.display = 'block';
    } else if (['txt', 'csv', 'json', 'xml'].includes(ext)) {
      if (rawText) {
        previewTextBox.textContent = rawText;
        previewTextBox.style.display = 'block';
      } else {
        fetch(blobUrl).then(r => r.text()).then(t => {
          previewTextBox.textContent = t;
          previewTextBox.style.display = 'block';
        });
      }
    } else {
      // Para DOCX / XLSX / PPTX, se muestra visor o descarga directa
      previewIframe.src = blobUrl;
      previewIframe.style.display = 'block';
    }

    previewModal.classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  btnClosePreview.addEventListener('click', () => {
    previewModal.classList.remove('active');
    previewIframe.src = '';
  });

  // ==================== CELULAR / WIFI & GITHUB PAGES ====================
  btnWifiModal.addEventListener('click', async () => {
    const isOnlineGitHubPages = window.location.hostname.includes('github.io');
    const targetUrl = isOnlineGitHubPages ? window.location.href : (window.location.origin || 'http://localhost:3000');

    // Intentar consultar al servidor local si estamos en localhost
    let qrUrl = targetUrl;
    if (!isOnlineGitHubPages) {
      try {
        const res = await fetch('/api/network-info');
        if (res.ok) {
          const data = await res.json();
          qrUrl = data.networkUrl;
        }
      } catch (_) {}
    }

    wifiUrlText.textContent = qrUrl;

    // Renderizar QR Code dinámico
    const qrTarget = document.querySelector('.qr-frame');
    qrTarget.innerHTML = '';
    new QRCode(qrTarget, {
      text: qrUrl,
      width: 220,
      height: 220,
      colorDark: '#004D2E',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.M
    });

    wifiModal.classList.add('active');
    if (window.lucide) lucide.createIcons();
  });

  btnCloseWifi.addEventListener('click', () => {
    wifiModal.classList.remove('active');
  });

  btnCopyWifiUrl.addEventListener('click', () => {
    const text = wifiUrlText.textContent;
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Enlace copiado al portapapeles', 'info');
      });
    }
  });

  // ==================== HISTORIAL DE ACTIVIDAD (LOCALSTORAGE) ====================
  btnHistoryModal.addEventListener('click', loadAndShowHistory);
  btnCloseHistory.addEventListener('click', () => historyModal.classList.remove('active'));

  function getLocalHistory() {
    try {
      const raw = localStorage.getItem('conversorg_history');
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function addHistoryRecord(record) {
    const list = getLocalHistory();
    const id = 'hist_' + Date.now();
    const item = {
      id: id,
      timestamp: new Date().toISOString(),
      name: record.name || 'Archivo',
      operation: record.operation,
      originalSize: record.originalSize,
      resultSize: record.resultSize,
      fileName: record.fileName
    };
    list.unshift(item);
    if (list.length > 50) list.pop();
    localStorage.setItem('conversorg_history', JSON.stringify(list));

    if (record.blobUrl) {
      activeBlobUrls.set(id, { url: record.blobUrl, name: record.fileName, blob: record.blob });
    }
  }

  function loadAndShowHistory() {
    const list = getLocalHistory();
    historyTableBody.innerHTML = '';

    if (!list || list.length === 0) {
      historyEmptyMessage.style.display = 'block';
      historyModal.classList.add('active');
      return;
    }
    historyEmptyMessage.style.display = 'none';

    list.forEach(item => {
      const tr = document.createElement('tr');
      const dt = new Date(item.timestamp).toLocaleString();
      const activeObj = activeBlobUrls.get(item.id);

      tr.innerHTML = `
        <td style="color: var(--text-muted); font-size: 0.8rem;">${dt}</td>
        <td><strong>${item.name}</strong></td>
        <td><span class="stat-pill">${item.operation}</span></td>
        <td>${formatBytes(item.resultSize || 0)}</td>
        <td style="text-align: right; white-space: nowrap;">
          ${activeObj ? `
            <button class="btn btn-icon btn-hist-preview" data-id="${item.id}" title="Previsualizar" style="width: 32px; height: 32px;">
              <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
            </button>
            <a href="${activeObj.url}" class="btn btn-icon" download="${item.fileName}" title="Descargar" style="width: 32px; height: 32px; display: inline-flex;">
              <i data-lucide="download" style="width: 16px; height: 16px;"></i>
            </a>
          ` : `
            <span style="font-size: 0.72rem; color: var(--text-muted);">Completado</span>
          `}
          <button class="btn btn-icon btn-hist-delete" data-id="${item.id}" title="Eliminar registro" style="width: 32px; height: 32px; color: #DC2626;">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          </button>
        </td>
      `;
      historyTableBody.appendChild(tr);
    });

    if (window.lucide) lucide.createIcons();

    historyTableBody.querySelectorAll('.btn-hist-preview').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const obj = activeBlobUrls.get(id);
        if (obj) openFilePreview(obj.name, obj.url);
      });
    });

    historyTableBody.querySelectorAll('.btn-hist-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        let current = getLocalHistory();
        current = current.filter(x => x.id !== id);
        localStorage.setItem('conversorg_history', JSON.stringify(current));
        activeBlobUrls.delete(id);
        loadAndShowHistory();
      });
    });

    historyModal.classList.add('active');
  }

  btnClearHistory.addEventListener('click', () => {
    if (confirm('¿Deseas vaciar todo el historial de conversiones?')) {
      localStorage.removeItem('conversorg_history');
      activeBlobUrls.clear();
      loadAndShowHistory();
      showToast('Historial vaciado', 'info');
    }
  });

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
