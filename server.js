const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const url = require('url');
const qrcode = require('qrcode');
const converter = require('./services/converter');
const history = require('./services/history');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const CONVERTED_DIR = path.join(__dirname, 'converted');

// Asegurar directorios
[UPLOADS_DIR, CONVERTED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Obtener la dirección IP local de la red WiFi/LAN
 */
function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      // Priorizar IPv4 y que no sea bucle local (127.0.0.1)
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

/**
 * Mapeo de tipos MIME estáticos
 */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip',
  '.txt': 'text/plain; charset=utf-8'
};

/**
 * Servidor HTTP Principal
 */
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Habilitar CORS para permitir conexión desde celulares o cualquier cliente local
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- RUTAS DE API ---

  // 1. Información de Red y Código QR
  if (pathname === '/api/network-info' && req.method === 'GET') {
    const ip = getLocalNetworkIp();
    const networkUrl = `http://${ip}:${PORT}`;
    try {
      const qrCodeDataUrl = await qrcode.toDataURL(networkUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF'
        }
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ip,
        port: PORT,
        localUrl: `http://localhost:${PORT}`,
        networkUrl,
        qrCode: qrCodeDataUrl,
        author: {
          name: 'Estiven Garces',
          email: 'estivenabreo@gmail.com',
          brand: 'ConversorG'
        }
      }));
    } catch (qrErr) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: qrErr.message }));
    }
    return;
  }

  // 2. Historial de conversiones
  if (pathname === '/api/history' && req.method === 'GET') {
    const list = history.loadHistory();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(list));
    return;
  }

  // 3. Borrar historial completo o elemento individual
  if (pathname.startsWith('/api/history') && req.method === 'DELETE') {
    const parts = pathname.split('/');
    const id = parts[3];
    if (id) {
      history.deleteHistoryItem(id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Elemento eliminado.' }));
    } else {
      history.clearAllHistory();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Historial vaciado.' }));
    }
    return;
  }

  // 4. Descargar archivo convertido
  if (pathname.startsWith('/api/download/') && req.method === 'GET') {
    const fileName = path.basename(pathname.replace('/api/download/', ''));
    const filePath = path.join(CONVERTED_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Archivo no encontrado o expirado.' }));
      return;
    }

    const ext = path.extname(fileName).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      'Content-Length': fs.statSync(filePath).size
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    return;
  }

  // 5. Previsualizar archivo en navegador / celular
  if (pathname.startsWith('/api/preview/') && req.method === 'GET') {
    const fileName = path.basename(pathname.replace('/api/preview/', ''));
    const filePath = path.join(CONVERTED_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Archivo no encontrado.' }));
      return;
    }

    const ext = path.extname(fileName).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
      'Content-Length': fs.statSync(filePath).size
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    return;
  }

  // 6. Conversión de Archivos (POST /api/convert)
  if (pathname === '/api/convert' && req.method === 'POST') {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', async () => {
      try {
        const rawBody = Buffer.concat(body).toString('utf8');
        const payload = JSON.parse(rawBody);

        const { operation, files, options = {} } = payload;
        if (!operation) throw new Error('Debe especificar el tipo de operación.');
        if (!files || !files.length) throw new Error('No se han recibido archivos para procesar.');

        let resultBuffer;
        let resultExtension = '.pdf';
        let originalTotalSize = 0;
        const baseName = (files[0].name || 'archivo').replace(/\.[^/.]+$/, '');

        // Calcular tamaño original
        for (const f of files) {
          if (f.base64) {
            originalTotalSize += Math.round((f.base64.length * 3) / 4);
          }
        }

        switch (operation) {
          case 'pdf-to-word': {
            const pdfBuf = Buffer.from(files[0].base64, 'base64');
            resultBuffer = await converter.pdfToWord(pdfBuf, options);
            resultExtension = '.docx';
            break;
          }
          case 'word-to-pdf': {
            const wordBuf = Buffer.from(files[0].base64, 'base64');
            resultBuffer = await converter.wordToPdf(wordBuf, options);
            resultExtension = '.pdf';
            break;
          }
          case 'merge-pdf': {
            const buffers = files.map(f => Buffer.from(f.base64, 'base64'));
            resultBuffer = await converter.mergePdfs(buffers, options);
            resultExtension = '.pdf';
            break;
          }
          case 'split-pdf': {
            const pdfBuf = Buffer.from(files[0].base64, 'base64');
            const splitRes = await converter.splitPdf(pdfBuf, options);
            resultBuffer = splitRes.buffer;
            resultExtension = splitRes.type === 'zip' ? '.zip' : '.pdf';
            break;
          }
          case 'pdf-to-excel': {
            const pdfBuf = Buffer.from(files[0].base64, 'base64');
            resultBuffer = await converter.pdfToExcel(pdfBuf, options);
            resultExtension = '.xlsx';
            break;
          }
          case 'excel-to-pdf': {
            const excelBuf = Buffer.from(files[0].base64, 'base64');
            resultBuffer = await converter.excelToPdf(excelBuf, options);
            resultExtension = '.pdf';
            break;
          }
          case 'pdf-to-pptx': {
            const pdfBuf = Buffer.from(files[0].base64, 'base64');
            resultBuffer = await converter.pdfToPptx(pdfBuf, options);
            resultExtension = '.pptx';
            break;
          }
          case 'pptx-to-pdf': {
            const pptxBuf = Buffer.from(files[0].base64, 'base64');
            resultBuffer = await converter.pptxToPdf(pptxBuf, options);
            resultExtension = '.pdf';
            break;
          }
          case 'images-to-pdf': {
            const images = files.map(f => ({
              buffer: Buffer.from(f.base64, 'base64'),
              mimeType: f.type || 'image/jpeg',
              filename: f.name
            }));
            resultBuffer = await converter.imagesToPdf(images, options);
            resultExtension = '.pdf';
            break;
          }
          case 'pdf-to-jpg': {
            const pdfBuf = Buffer.from(files[0].base64, 'base64');
            const resJpg = await converter.pdfToJpg(pdfBuf, options);
            resultBuffer = resJpg.buffer;
            resultExtension = '.zip';
            break;
          }
          case 'watermark-pdf': {
            const pdfBuf = Buffer.from(files[0].base64, 'base64');
            resultBuffer = await converter.watermarkPdf(
              pdfBuf,
              options.watermarkText || 'ConversorG',
              options
            );
            resultExtension = '.pdf';
            break;
          }
          case 'rotate-pdf': {
            const pdfBuf = Buffer.from(files[0].base64, 'base64');
            resultBuffer = await converter.rotatePdf(pdfBuf, options.degrees || 90);
            resultExtension = '.pdf';
            break;
          }
          case 'compress-pdf': {
            const pdfBuf = Buffer.from(files[0].base64, 'base64');
            resultBuffer = await converter.compressPdf(pdfBuf, options);
            resultExtension = '.pdf';
            break;
          }
          case 'extract-text': {
            const pdfBuf = Buffer.from(files[0].base64, 'base64');
            const textData = await converter.extractTextFromPdf(pdfBuf);
            resultBuffer = Buffer.from(textData.text, 'utf8');
            resultExtension = '.txt';
            break;
          }
          default:
            throw new Error(`Operación "${operation}" no reconocida.`);
        }

        const timestamp = Date.now();
        const safeBaseName = baseName.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const outputFileName = `${safeBaseName}_ConversorG_${timestamp}${resultExtension}`;
        const outputFilePath = path.join(CONVERTED_DIR, outputFileName);

        fs.writeFileSync(outputFilePath, resultBuffer);

        const resultSize = resultBuffer.length;
        const downloadUrl = `/api/download/${outputFileName}`;
        const previewUrl = `/api/preview/${outputFileName}`;

        // Guardar registro en historial
        const historyRecord = history.addHistoryItem({
          name: files[0].name || 'Archivo',
          operation,
          originalSize: originalTotalSize,
          resultSize,
          resultFileName: outputFileName,
          downloadUrl,
          previewUrl,
          format: resultExtension.replace('.', '')
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          fileName: outputFileName,
          downloadUrl,
          previewUrl,
          originalSize: originalTotalSize,
          resultSize,
          savings: originalTotalSize > resultSize ? Math.round((1 - resultSize / originalTotalSize) * 100) : 0,
          historyId: historyRecord.id
        }));
      } catch (err) {
        console.error('Error en conversión:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: err.message || 'Ocurrió un error inesperado al procesar el archivo.'
        }));
      }
    });
    return;
  }

  // --- SERVIR ARCHIVOS ESTÁTICOS (Frontend Web & PWA) ---
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';

  let filePath = path.join(__dirname, safePath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, safePath);
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(__dirname, 'index.html');
  }

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 No encontrado');
  }
});

// Iniciar servidor
server.listen(PORT, '0.0.0.0', async () => {
  const localIp = getLocalNetworkIp();
  const networkUrl = `http://${localIp}:${PORT}`;
  const localUrl = `http://localhost:${PORT}`;

  console.log('====================================================');
  console.log('           📄 CONVERSORG - CONVERSOR DE PDF         ');
  console.log('       Desarrollador: Estiven Garces                ');
  console.log('       Contacto: estivenabreo@gmail.com             ');
  console.log('====================================================');
  console.log(`💻 En tu PC:          ${localUrl}`);
  console.log(`📱 En Celular WiFi:   ${networkUrl}`);
  console.log('----------------------------------------------------');
  console.log('📲 Escanea este código QR con la cámara de tu celular:');

  try {
    const qrTerminal = await qrcode.toString(networkUrl, { type: 'terminal', small: true });
    console.log(qrTerminal);
  } catch (_) {}

  console.log('====================================================');
  console.log('Servidor activo y listo para procesar documentos localmente.');
});

// Manejo de errores no capturados
process.on('uncaughtException', err => {
  console.error('Error no capturado:', err);
});
