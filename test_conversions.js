const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const converter = require('./services/converter');
const history = require('./services/history');

async function runAllTests() {
  console.log('🧪 Iniciando batería de pruebas completas de ConversorG...\n');

  // 1. Crear PDF de prueba
  console.log('[1/14] Generando PDF base para pruebas...');
  const basePdf = await PDFDocument.create();
  const font = await basePdf.embedFont(StandardFonts.Helvetica);
  
  const page1 = basePdf.addPage([595, 842]);
  page1.drawText('Documento de Prueba ConversorG', { x: 50, y: 750, size: 20, font });
  page1.drawText('Autor: Estiven Garces (estivenabreo@gmail.com)', { x: 50, y: 710, size: 12, font });
  page1.drawText('Esta es una prueba de extracción y conversión integral.', { x: 50, y: 680, size: 11, font });
  page1.drawText('Producto\tCantidad\tPrecio\tTotal', { x: 50, y: 640, size: 11, font });
  page1.drawText('Laptop\t2\t1200\t2400', { x: 50, y: 620, size: 11, font });
  page1.drawText('Mouse\t5\t25\t125', { x: 50, y: 600, size: 11, font });

  const page2 = basePdf.addPage([595, 842]);
  page2.drawText('Segunda Página de Prueba', { x: 50, y: 750, size: 18, font });
  page2.drawText('Párrafo adicional para comprobar soporte multipágina.', { x: 50, y: 710, size: 11, font });

  const basePdfBytes = Buffer.from(await basePdf.save());
  console.log('   ✓ PDF base generado con éxito (' + basePdfBytes.length + ' bytes, 2 páginas)');

  // 2. Probar PDF a Word
  console.log('\n[2/14] Probando conversión: PDF a Word (.docx)...');
  const docxBuf = await converter.pdfToWord(basePdfBytes, { title: 'Reporte ConversorG' });
  if (docxBuf && docxBuf.length > 500 && docxBuf.slice(0, 2).toString() === 'PK') {
    console.log('   ✓ ÉXITO: DOCX generado correctamente (' + docxBuf.length + ' bytes, magic bytes PK detectados)');
  } else {
    throw new Error('Fallo en PDF a Word');
  }

  // 3. Probar Word a PDF
  console.log('\n[3/14] Probando conversión: Word (.docx) a PDF...');
  const pdfFromDocx = await converter.wordToPdf(docxBuf, { watermark: 'ConversorG' });
  if (pdfFromDocx && pdfFromDocx.slice(0, 4).toString() === '%PDF') {
    console.log('   ✓ ÉXITO: PDF desde Word generado (' + pdfFromDocx.length + ' bytes, magic bytes %PDF detectados)');
  } else {
    throw new Error('Fallo en Word a PDF');
  }

  // 4. Probar Unir PDF
  console.log('\n[4/14] Probando función: Unir PDF (Merge)...');
  const mergedPdf = await converter.mergePdfs([basePdfBytes, pdfFromDocx]);
  const mergedDoc = await PDFDocument.load(mergedPdf);
  console.log('   ✓ ÉXITO: PDFs unidos correctamente (' + mergedPdf.length + ' bytes, ' + mergedDoc.getPageCount() + ' páginas totales)');

  // 5. Probar Dividir PDF
  console.log('\n[5/14] Probando función: Dividir PDF (Split)...');
  const splitRangeRes = await converter.splitPdf(mergedPdf, { pageRanges: '1' });
  const splitZipRes = await converter.splitPdf(mergedPdf, { pageRanges: 'all' });
  console.log('   ✓ ÉXITO: División por rango (' + splitRangeRes.buffer.length + ' bytes)');
  console.log('   ✓ ÉXITO: División en ZIP (' + splitZipRes.buffer.length + ' bytes)');

  // 6. Probar PDF a Excel
  console.log('\n[6/14] Probando conversión: PDF a Excel (.xlsx)...');
  const xlsxBuf = await converter.pdfToExcel(basePdfBytes);
  if (xlsxBuf && xlsxBuf.length > 500 && xlsxBuf.slice(0, 2).toString() === 'PK') {
    console.log('   ✓ ÉXITO: Excel XLSX generado (' + xlsxBuf.length + ' bytes)');
  } else {
    throw new Error('Fallo en PDF a Excel');
  }

  // 7. Probar Excel a PDF
  console.log('\n[7/14] Probando conversión: Excel (.xlsx) a PDF...');
  const pdfFromXlsx = await converter.excelToPdf(xlsxBuf);
  if (pdfFromXlsx && pdfFromXlsx.slice(0, 4).toString() === '%PDF') {
    console.log('   ✓ ÉXITO: PDF desde Excel generado (' + pdfFromXlsx.length + ' bytes)');
  } else {
    throw new Error('Fallo en Excel a PDF');
  }

  // 8. Probar PDF a PowerPoint
  console.log('\n[8/14] Probando conversión: PDF a PowerPoint (.pptx)...');
  const pptxBuf = await converter.pdfToPptx(basePdfBytes);
  if (pptxBuf && pptxBuf.length > 500 && pptxBuf.slice(0, 2).toString() === 'PK') {
    console.log('   ✓ ÉXITO: PowerPoint PPTX generado (' + pptxBuf.length + ' bytes)');
  } else {
    throw new Error('Fallo en PDF a PowerPoint');
  }

  // 9. Probar PowerPoint a PDF
  console.log('\n[9/14] Probando conversión: PowerPoint (.pptx) a PDF...');
  const pdfFromPptx = await converter.pptxToPdf(pptxBuf);
  if (pdfFromPptx && pdfFromPptx.slice(0, 4).toString() === '%PDF') {
    console.log('   ✓ ÉXITO: PDF desde PowerPoint generado (' + pdfFromPptx.length + ' bytes)');
  } else {
    throw new Error('Fallo en PowerPoint a PDF');
  }

  // 10. Probar Imágenes a PDF
  console.log('\n[10/14] Probando conversión: Imágenes a PDF...');
  const imgPngBuf = require('fs').readFileSync('public/assets/icon-192.png');
  const pdfFromImg = await converter.imagesToPdf([{ buffer: imgPngBuf, mimeType: 'image/png', filename: 'icon.png' }]);
  if (pdfFromImg && pdfFromImg.slice(0, 4).toString() === '%PDF') {
    console.log('   ✓ ÉXITO: PDF generado a partir de imágenes (' + pdfFromImg.length + ' bytes)');
  } else {
    throw new Error('Fallo en Imágenes a PDF');
  }

  // 11. Probar PDF a JPG/ZIP
  console.log('\n[11/14] Probando conversión: PDF a JPG / ZIP...');
  const zipImgRes = await converter.pdfToJpg(basePdfBytes);
  console.log('   ✓ ÉXITO: ' + zipImgRes.totalPages + ' páginas procesadas en ZIP (' + zipImgRes.buffer.length + ' bytes)');

  // 12. Probar Marca de Agua y Rotación
  console.log('\n[12/14] Probando: Marca de Agua ConversorG y Rotación de PDF...');
  const watermarkedPdf = await converter.watermarkPdf(basePdfBytes, 'ConversorG');
  const rotatedPdf = await converter.rotatePdf(watermarkedPdf, 90);
  console.log('   ✓ ÉXITO: Marca de agua y rotación aplicadas (' + rotatedPdf.length + ' bytes)');

  // 13. Probar Compresión y Extracción de texto
  console.log('\n[13/14] Probando: Compresión y Extracción de texto plano...');
  const compressed = await converter.compressPdf(basePdfBytes);
  const textResult = await converter.extractTextFromPdf(basePdfBytes);
  console.log('   ✓ ÉXITO: Compresión completada (' + compressed.length + ' bytes)');
  console.log('   ✓ ÉXITO: Texto extraído (' + textResult.text.length + ' caracteres, ' + textResult.numPages + ' páginas)');

  // 14. Probar Historial de Actividad
  console.log('\n[14/14] Probando: Historial de actividad y persistencia...');
  const item = history.addHistoryItem({
    name: 'prueba_documento.pdf',
    operation: 'pdf-to-word',
    originalSize: 1024,
    resultSize: 2048,
    resultFileName: 'prueba_ConversorG_123.docx',
    downloadUrl: '/api/download/prueba_ConversorG_123.docx',
    previewUrl: '/api/preview/prueba_ConversorG_123.docx',
    format: 'docx'
  });
  const historyList = history.loadHistory();
  console.log('   ✓ ÉXITO: Registro agregado al historial (ID: ' + item.id + ', Total en lista: ' + historyList.length + ')');

  console.log('\n======================================================');
  console.log('🎉 ¡TODAS LAS 14 FUNCIONALIDADES SUPERARON LAS PRUEBAS!');
  console.log('======================================================\n');
}

runAllTests().catch(err => {
  console.error('\n❌ ERROR EN PRUEBAS:', err);
  process.exit(1);
});
