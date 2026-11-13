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
  const successResultNote = document.getElementById('successResultNote');
  const btnDownloadResult = document.getElementById('btnDownloadResult');
  const btnConvertAnother = document.getElementById('btnConvertAnother');
  const conversionErrorPanel = document.getElementById('conversionErrorPanel');
  const conversionErrorSummary = document.getElementById('conversionErrorSummary');
  const conversionErrorAdvice = document.getElementById('conversionErrorAdvice');
  const conversionErrorDetails = document.getElementById('conversionErrorDetails');
  const btnCopyConversionError = document.getElementById('btnCopyConversionError');
  const modalFooter = document.getElementById('modalFooter');
  const btnCancelAction = document.getElementById('btnCancelAction');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnStartConvert = document.getElementById('btnStartConvert');

  // Opciones específicas
  const optSplitGroup = document.getElementById('optSplitGroup');
  const optWatermarkGroup = document.getElementById('optWatermarkGroup');
  const optRotateGroup = document.getElementById('optRotateGroup');
  const optImagesGroup = document.getElementById('optImagesGroup');

  // Modal WiFi
  const wifiModal = document.getElementById('wifiModal');
  const btnWifiModal = document.getElementById('btnWifiModal');
  const btnCloseWifi = document.getElementById('btnCloseWifi');
  const wifiUrlText = document.getElementById('wifiUrlText');
  const btnCopyWifiUrl = document.getElementById('btnCopyWifiUrl');
  const btnWifiUseOnline = document.getElementById('btnWifiUseOnline');
  const btnWifiUseLocal = document.getElementById('btnWifiUseLocal');
  const wifiConnectionHelp = document.getElementById('wifiConnectionHelp');
  const wifiErrorPanel = document.getElementById('wifiErrorPanel');
  const wifiErrorSummary = document.getElementById('wifiErrorSummary');
  const wifiErrorDetails = document.getElementById('wifiErrorDetails');
  const btnCopyWifiError = document.getElementById('btnCopyWifiError');

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
  const activeBlobUrls = new Map();

  // Registrar Service Worker para PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(error => {
      console.error('No se pudo registrar el service worker de ConversorG.', error);
    });
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
    conversionErrorPanel.hidden = true;
    conversionErrorSummary.textContent = '';
    conversionErrorAdvice.textContent = '';
    conversionErrorDetails.textContent = '';
    successScreen.classList.remove('active');
    successResultNote.hidden = true;
    successResultNote.textContent = '';
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
      try {
        const buffer = await f.arrayBuffer();
        currentFiles.push({
          file: f,
          name: f.name,
          size: f.size,
          type: f.type,
          buffer: buffer
        });
      } catch (error) {
        showConversionError(error, `lectura del archivo "${f.name}"`, f);
      }
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

  function validateConversionInputs(tool, files) {
    if (files.length === 0) {
      throw new Error('Selecciona al menos un archivo para iniciar la conversión.');
    }
    if (files.some(item => item.size === 0)) {
      const emptyFile = files.find(item => item.size === 0);
      throw new Error(`El archivo "${emptyFile.name}" está vacío. Elige un archivo con contenido.`);
    }
    if (tool === 'merge-pdf' && files.length < 2) {
      throw new Error('Para unir PDF debes seleccionar al menos dos archivos PDF.');
    }

    const acceptedExtensions = fileInput.accept
      .split(',')
      .filter(value => value.startsWith('.'))
      .map(value => value.toLowerCase());
    for (const item of files) {
      const extension = item.name.includes('.') ? `.${item.name.split('.').pop().toLowerCase()}` : '';
      if (acceptedExtensions.length > 0 && !acceptedExtensions.includes(extension)) {
        throw new Error(`"${item.name}" no tiene un formato permitido para esta función. Formatos aceptados: ${acceptedExtensions.join(', ')}.`);
      }

      const requiresPdf = [
        'pdf-to-word', 'merge-pdf', 'split-pdf', 'pdf-to-excel',
        'pdf-to-pptx', 'pdf-to-jpg', 'watermark-pdf', 'rotate-pdf',
        'compress-pdf', 'extract-text'
      ].includes(tool);
      if (requiresPdf) {
        const header = new TextDecoder('ascii').decode(item.buffer.slice(0, Math.min(item.buffer.byteLength, 1024)));
        if (!header.includes('%PDF-')) {
          throw new Error(`"${item.name}" tiene extensión PDF, pero su contenido no parece ser un PDF válido. Comprueba que sea el archivo correcto y que no esté dañado.`);
        }
      }
    }
  }

  function getConversionAdvice(error) {
    const message = (error.message || '').toLowerCase();
    if (/librerías requeridas|librerías no cargadas|library.*not loaded|failed to load library/.test(message)) {
      return 'No están disponibles las librerías necesarias. Comprueba que la página y sus archivos JavaScript hayan cargado; recarga la página y vuelve a intentarlo con internet.';
    }
    if (/encrypted|encrypt|password|contraseña|clave/.test(message)) {
      return 'El documento parece estar protegido con contraseña o cifrado. Guarda una copia sin protección e inténtalo de nuevo.';
    }
    if (/pdf header|parse.*pdf|invalid pdf|malformed|unexpected end|no parece ser un pdf/.test(message)) {
      return 'Verifica que el archivo seleccionado sea un PDF válido, que no esté incompleto y que su extensión corresponda al contenido.';
    }
    if (/jpeg|jpg|png|webp|image|imagen|canvas|decodificar/.test(message)) {
      return 'Verifica que cada archivo sea una imagen JPG, PNG o WebP válida. Si fue renombrada manualmente o no abre en el dispositivo, expórtala de nuevo como JPG o PNG.';
    }
    if (/memory|memoria|allocation|quota|rangeerror/.test(message)) {
      return 'El archivo es demasiado grande para la memoria disponible en el navegador. Cierra otras pestañas o prueba con un archivo más pequeño.';
    }
    if (/failed to fetch|network|fetch|service worker|load failed/.test(message)) {
      return 'No se pudo acceder a un recurso de la página. Comprueba internet, recarga la página y verifica que estés usando la versión actual.';
    }
    if (/arraybuffer|detached/.test(message)) {
      return 'El contenido del archivo dejó de estar disponible durante el proceso. Vuelve a seleccionar los archivos e inténtalo otra vez.';
    }
    return 'Comprueba que los archivos sean del formato indicado, que se puedan abrir y que haya suficiente memoria disponible. Si continúa, copia el diagnóstico técnico para soporte.';
  }

  function getFriendlyConversionMessage(error) {
    const message = (error.message || '').toLowerCase();
    if (/^(selecciona al menos|para unir pdf|el archivo|".+?" (no tiene|tiene extensión|está vacío|no contiene)|no se pudo leer)/i.test(error.message || '')) {
      return error.message;
    }
    if (/librerías requeridas|librerías no cargadas|library.*not loaded|failed to load library/.test(message)) {
      return 'Falta una librería necesaria para procesar este archivo.';
    }
    if (/encrypted|encrypt|password|contraseña|clave/.test(message)) {
      return 'El documento está protegido o cifrado y no se pudo abrir.';
    }
    if (/pdf header|parse.*pdf|invalid pdf|malformed|unexpected end/.test(message)) {
      return 'El contenido no se pudo leer como un PDF válido.';
    }
    if (/jpeg|jpg|png|webp|image|imagen|canvas|decodificar/.test(message)) {
      return 'Una de las imágenes no se pudo leer o convertir.';
    }
    if (/memory|memoria|allocation|quota|rangeerror/.test(message)) {
      return 'El navegador no tiene memoria suficiente para procesar estos archivos.';
    }
    if (/failed to fetch|network|fetch|service worker|load failed/.test(message)) {
      return 'No se pudo acceder a un recurso necesario de la página.';
    }
    return 'Ocurrió un error inesperado al procesar los archivos.';
  }

  function buildConversionDiagnostic(error, stage, additionalFile) {
    const files = currentFiles.map(item =>
      `${item.name} | ${formatBytes(item.size)} | ${item.type || 'sin tipo MIME'}`
    );
    if (additionalFile) {
      files.push(`${additionalFile.name} | ${formatBytes(additionalFile.size)} | ${additionalFile.type || 'sin tipo MIME'}`);
    }
    const details = [
      'ConversorG - diagnóstico de conversión',
      `Fecha: ${new Date().toISOString()}`,
      `Etapa: ${stage}`,
      `Operación: ${currentTool || 'no identificada'}`,
      `Página: ${location.origin}${location.pathname}`,
      `Modo: ${location.hostname.includes('github.io') ? 'GitHub Pages' : 'servidor local'}`,
      `Conexión a internet: ${navigator.onLine ? 'disponible' : 'sin conexión'}`,
      `Contexto seguro: ${window.isSecureContext ? 'sí' : 'no'}`,
      `Archivos:\n${files.length ? files.join('\n') : 'No se seleccionaron archivos.'}`,
      `Librerías: PDFLib=${typeof PDFLib}, pdfjsLib=${typeof pdfjsLib}, JSZip=${typeof JSZip}, XLSX=${typeof XLSX}, PptxGenJS=${typeof PptxGenJS}`,
      `Error técnico: ${error.name || 'Error'}: ${error.message || 'Error desconocido'}`,
      `Pila técnica:\n${error.stack || 'No disponible'}`
    ];
    return details.join('\n');
  }

  function showConversionError(error, stage, additionalFile) {
    const report = buildConversionDiagnostic(error, stage, additionalFile);
    const operation = modalTitle.querySelector('span').textContent;
    conversionErrorSummary.textContent = `No se pudo completar "${operation}" durante la etapa "${stage}". ${getFriendlyConversionMessage(error)}`;
    conversionErrorAdvice.textContent = getConversionAdvice(error);
    conversionErrorDetails.textContent = report;
    conversionErrorPanel.hidden = false;
    console.error('ConversorG: falló una operación.', { report, error });
  }

  async function copyDiagnostic(text) {
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
        throw new Error('El navegador no permite copiar desde una conexión HTTP local.');
      }
      await navigator.clipboard.writeText(text);
      showToast('Diagnóstico copiado. Puedes enviarlo al desarrollador.', 'success');
    } catch (error) {
      console.error('No se pudo copiar el diagnóstico al portapapeles.', error);
      showToast('No se pudo copiar. Abre los detalles y cópialos manualmente.', 'error');
    }
  }

  btnCopyConversionError.addEventListener('click', () => {
    copyDiagnostic(conversionErrorDetails.textContent);
  });

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
    conversionErrorPanel.hidden = true;

    updateProgress(20, 'Cargando documento en el navegador...');
    await delay(180);

    let conversionStage = 'validación de los archivos';
    try {
      validateConversionInputs(currentTool, currentFiles);
      let resultBlob;
      let outputFileName = '';
      const firstFile = currentFiles[0];
      const baseName = (firstFile.name || 'archivo').replace(/\.[^/.]+$/, '');
      const originalTotalSize = currentFiles.reduce((acc, f) => acc + f.size, 0);

      updateProgress(45, 'Procesando conversión 100% en tu navegador...');
      await delay(150);

      conversionStage = 'conversión';
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
          outputFileName = `${baseName}_texto_ConversorG.txt`;
          break;
        }
        default:
          throw new Error('Operación no soportada.');
      }

        if (!(resultBlob instanceof Blob) || resultBlob.size === 0) {
          conversionStage = 'validación del archivo generado';
          throw new Error(`La operación "${currentTool}" no produjo un archivo descargable. Comprueba los archivos de entrada y vuelve a intentarlo.`);
        }

        conversionStage = 'preparación de la descarga';
        updateProgress(100, '¡Conversión completada con éxito!');
      await delay(250);

      const blobUrl = URL.createObjectURL(resultBlob);
      const resultSize = resultBlob.size;
      const savings = originalTotalSize > resultSize ? Math.round((1 - resultSize / originalTotalSize) * 100) : 0;

      // Guardar en historial local
      addHistoryRecord({
        name: firstFile.name,
        operation: currentTool,
        originalSize: originalTotalSize,
        resultSize: resultSize,
        fileName: outputFileName,
        blobUrl: blobUrl
      });

      showSuccessScreen({
        blobUrl,
        fileName: outputFileName,
        originalSize: originalTotalSize,
        resultSize,
        savings
      });
      showToast('Documento procesado con éxito', 'success');

    } catch (err) {
      showConversionError(err, conversionStage);
      showToast('La conversión falló. Revisa el diagnóstico en pantalla.', 'error');
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
    const compressionDidNotShrink = currentTool === 'compress-pdf' && result.resultSize >= result.originalSize;
    successResultNote.hidden = !compressionDidNotShrink;
    if (compressionDidNotShrink) {
      successResultNote.textContent = 'El PDF es válido, pero esta optimización no redujo su tamaño. Puede que ya esté optimizado o que sus imágenes ya estén comprimidas; para reducirlo más habría que bajar la calidad o resolución de las imágenes.';
    }

    btnDownloadResult.href = result.blobUrl;
    btnDownloadResult.setAttribute('download', result.fileName);

    if (window.lucide) lucide.createIcons();
  }

  btnConvertAnother.addEventListener('click', () => {
    resetActionModalState();
    currentFiles = [];
  });

  // ==================== CELULAR / WIFI & GITHUB PAGES ====================
  const githubPagesUrl = 'https://estiveng1.github.io/ConversorPdf/';
  const isOnlineGitHubPages = window.location.hostname.includes('github.io');

  function renderWifiQr(qrUrl, isOnline) {
    wifiUrlText.textContent = qrUrl;

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

    btnWifiUseOnline.classList.toggle('btn-primary', isOnline);
    btnWifiUseOnline.classList.toggle('btn-surface', !isOnline);
    btnWifiUseLocal.classList.toggle('btn-primary', !isOnline);
    btnWifiUseLocal.classList.toggle('btn-surface', isOnline);
    btnWifiUseOnline.setAttribute('aria-pressed', String(isOnline));
    btnWifiUseLocal.setAttribute('aria-pressed', String(!isOnline));
    wifiConnectionHelp.textContent = isOnline
      ? 'La versión online procesa los archivos en el navegador del celular. Requiere internet y no necesita que el PC esté encendido.'
      : 'Abre esta copia desde el PC; las conversiones se ejecutan en el navegador del celular. Requiere la misma WiFi y que el firewall permita Node.js.';
  }

  btnWifiModal.addEventListener('click', () => {
    const useOnline = () => {
      wifiErrorPanel.hidden = true;
      renderWifiQr(isOnlineGitHubPages ? window.location.href : githubPagesUrl, true);
    };

    btnWifiUseOnline.onclick = useOnline;
    btnWifiUseLocal.style.display = isOnlineGitHubPages ? 'none' : '';
    btnWifiUseLocal.onclick = async () => {
      let responseStatus = 'Sin respuesta del servidor local';
      try {
        const res = await fetch('/api/network-info', { cache: 'no-store' });
        responseStatus = `HTTP ${res.status} ${res.statusText}`.trim();
        let data;
        try {
          data = await res.json();
        } catch (error) {
          throw new Error(`El servicio local respondió ${responseStatus}, pero no devolvió información JSON. Comprueba que ConversorG esté actualizado.`);
        }
        if (!res.ok) {
          throw new Error(data.error || 'No se pudo detectar la dirección de red.');
        }

        const networkUrl = new URL(data.networkUrl);
        const hostname = networkUrl.hostname.toLowerCase();
        if (
          !['http:', 'https:'].includes(networkUrl.protocol) ||
          hostname === 'localhost' ||
          hostname === '[::1]' ||
          hostname === '0.0.0.0' ||
          hostname.startsWith('127.') ||
          hostname.startsWith('169.254.')
        ) {
          throw new Error('El servidor devolvió una dirección que no es accesible desde el celular.');
        }

        wifiErrorPanel.hidden = true;
        renderWifiQr(networkUrl.href, false);
      } catch (error) {
        const report = [
          'ConversorG - diagnóstico de conexión local',
          `Fecha: ${new Date().toISOString()}`,
          `Página abierta en el PC: ${location.origin}${location.pathname}`,
          `Endpoint consultado: ${location.origin}/api/network-info`,
          `Respuesta del servidor: ${responseStatus}`,
          `Conexión de red del navegador: ${navigator.onLine ? 'disponible' : 'sin conexión'}`,
          `Error técnico: ${error.name || 'Error'}: ${error.message || 'Error desconocido'}`,
          'No se incluyó el contenido de ningún archivo.'
        ].join('\n');
        wifiErrorSummary.textContent = 'No se pudo obtener el enlace local. Comprueba que ConversorG esté ejecutándose, que hayas abierto la copia servida por Node.js (no un archivo HTML directo) y que Windows Firewall permita Node.js en redes privadas.';
        wifiErrorDetails.textContent = report;
        wifiErrorPanel.hidden = false;
        console.error('No se pudo generar un enlace de red para el celular.', { report, error });
        showToast('No se pudo generar el enlace local. Revisa el diagnóstico.', 'error');
      }
    };

    useOnline();
    wifiErrorPanel.hidden = true;
    wifiModal.classList.add('active');
    if (window.lucide) lucide.createIcons();
  });

  btnCloseWifi.addEventListener('click', () => {
    wifiModal.classList.remove('active');
  });

  btnCopyWifiUrl.addEventListener('click', async () => {
    const text = wifiUrlText.textContent;
    if (text) {
      try {
        if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
          throw new Error('El navegador no permite copiar desde una conexión HTTP local.');
        }
        await navigator.clipboard.writeText(text);
        showToast('Enlace copiado al portapapeles', 'info');
      } catch (error) {
        console.error('No se pudo copiar el enlace al portapapeles.', error);
        showToast('No se pudo copiar el enlace. Selecciónalo y cópialo manualmente.', 'error');
      }
    }
  });

  btnCopyWifiError.addEventListener('click', () => {
    copyDiagnostic(wifiErrorDetails.textContent);
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
      activeBlobUrls.set(id, { url: record.blobUrl, name: record.fileName });
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
            <a href="${activeObj.url}" class="btn btn-icon" download="${item.fileName}" title="Descargar" style="width: 32px; height: 32px; display: inline-flex;">
              <i data-lucide="download" style="width: 16px; height: 16px;"></i>
            </a>
          ` : ''}
          <button class="btn btn-icon btn-hist-delete" data-id="${item.id}" title="Eliminar registro" style="width: 32px; height: 32px; color: #DC2626;">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          </button>
        </td>
      `;
      historyTableBody.appendChild(tr);
    });

    if (window.lucide) lucide.createIcons();

    historyTableBody.querySelectorAll('.btn-hist-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        let current = getLocalHistory();
        current = current.filter(x => x.id !== id);
        localStorage.setItem('conversorg_history', JSON.stringify(current));
        const activeResult = activeBlobUrls.get(id);
        if (activeResult) URL.revokeObjectURL(activeResult.url);
        activeBlobUrls.delete(id);
        loadAndShowHistory();
      });
    });

    historyModal.classList.add('active');
  }

  btnClearHistory.addEventListener('click', () => {
    if (confirm('¿Deseas vaciar todo el historial de conversiones?')) {
      localStorage.removeItem('conversorg_history');
      activeBlobUrls.forEach(result => URL.revokeObjectURL(result.url));
      activeBlobUrls.clear();
      loadAndShowHistory();
      showToast('Historial vaciado', 'info');
    }
  });

  [actionModal, wifiModal, historyModal].forEach(modal => {
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
