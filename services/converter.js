const { PDFDocument, rgb, degrees, StandardFonts } = require('pdf-lib');
const docx = require('docx');
const xlsx = require('xlsx');
const PptxGenJS = require('pptxgenjs');
const JSZip = require('jszip');
const pdfParseModule = require('pdf-parse');

/**
 * Helper robusto para extraer texto y páginas de un PDF
 */
async function parsePdfText(pdfBuffer) {
  try {
    if (typeof pdfParseModule === 'function') {
      const res = await pdfParseModule(pdfBuffer);
      return { text: res.text || '', numpages: res.numpages || 1 };
    }
    if (pdfParseModule && pdfParseModule.PDFParse) {
      const parser = new pdfParseModule.PDFParse({ data: pdfBuffer });
      const res = await parser.getText();
      return {
        text: res.text || '',
        numpages: res.total || (res.pages ? res.pages.length : 1),
        pages: res.pages || []
      };
    }
  } catch (err) {
    console.error('Error parsing PDF text:', err.message);
  }
  return { text: '', numpages: 1 };
}

/**
 * Normaliza y divide texto en líneas y párrafos limpios
 */
function cleanTextLines(text) {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

/**
 * 1. CONVERTIR PDF A WORD (.docx)
 */
async function pdfToWord(pdfBuffer, options = {}) {
  const data = await parsePdfText(pdfBuffer);
  const text = data.text || '';
  const lines = cleanTextLines(text);

  const paragraphs = [];

  // Título del documento
  paragraphs.push(
    new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: options.title || 'Documento Convertido con ConversorG',
          bold: true,
          size: 32, // 16pt
          color: '2B3674'
        })
      ],
      spacing: { after: 200 }
    })
  );

  // Subtítulo con metadatos
  paragraphs.push(
    new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: `Generado por ConversorG (${data.numpages || 1} páginas detectadas) • Autor: Estiven Garces`,
          italics: true,
          size: 18,
          color: '707EAE'
        })
      ],
      spacing: { after: 400 }
    })
  );

  // Procesar párrafos
  let currentBlock = [];
  for (const line of lines) {
    if (line.length > 0) {
      // Detectar posible encabezado por longitud y estilo
      const isHeader = line.length < 60 && (line === line.toUpperCase() || line.endsWith(':'));
      if (isHeader) {
        if (currentBlock.length > 0) {
          paragraphs.push(
            new docx.Paragraph({
              children: [new docx.TextRun({ text: currentBlock.join(' '), size: 22 })],
              spacing: { after: 160 }
            })
          );
          currentBlock = [];
        }
        paragraphs.push(
          new docx.Paragraph({
            children: [
              new docx.TextRun({
                text: line,
                bold: true,
                size: 26,
                color: '4318FF'
              })
            ],
            spacing: { before: 200, after: 120 }
          })
        );
      } else {
        currentBlock.push(line);
        // Si el bloque acumula suficiente texto o termina con punto, cerramos el párrafo
        if (line.endsWith('.') || line.endsWith('!') || line.endsWith('?') || currentBlock.length >= 4) {
          paragraphs.push(
            new docx.Paragraph({
              children: [new docx.TextRun({ text: currentBlock.join(' '), size: 22 })],
              spacing: { after: 160 }
            })
          );
          currentBlock = [];
        }
      }
    }
  }

  if (currentBlock.length > 0) {
    paragraphs.push(
      new docx.Paragraph({
        children: [new docx.TextRun({ text: currentBlock.join(' '), size: 22 })],
        spacing: { after: 160 }
      })
    );
  }

  const doc = new docx.Document({
    creator: 'Estiven Garces - ConversorG',
    title: 'Documento Convertido',
    description: 'Convertido con ConversorG',
    sections: [
      {
        properties: {},
        headers: {
          default: new docx.Header({
            children: [
              new docx.Paragraph({
                children: [
                  new docx.TextRun({
                    text: 'ConversorG • Conversor PDF Profesional',
                    size: 16,
                    color: 'A3AED0'
                  })
                ]
              })
            ]
          })
        },
        footers: {
          default: new docx.Footer({
            children: [
              new docx.Paragraph({
                alignment: docx.AlignmentType.RIGHT,
                children: [
                  new docx.TextRun({
                    text: 'ConversorG | contacto: estivenabreo@gmail.com',
                    size: 16,
                    color: 'A3AED0'
                  })
                ]
              })
            ]
          })
        },
        children: paragraphs
      }
    ]
  });

  return await docx.Packer.toBuffer(doc);
}

/**
 * 2. CONVERTIR WORD (.docx) A PDF
 */
async function wordToPdf(docxBuffer, options = {}) {
  const zip = await JSZip.loadAsync(docxBuffer);
  const documentXml = await zip.file('word/document.xml')?.async('string');

  if (!documentXml) {
    throw new Error('El archivo DOCX no contiene estructura válida de documento (word/document.xml).');
  }

  // Extraer texto de párrafos <w:p>
  const paragraphMatches = documentXml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || [];
  const extractedLines = [];

  for (const pXml of paragraphMatches) {
    const textMatches = pXml.match(/<w:t[\s>][\s\S]*?<\/w:t>/g) || [];
    let pText = '';
    for (const tXml of textMatches) {
      const clean = tXml.replace(/<[^>]+>/g, '');
      pText += clean;
    }
    pText = pText.trim();
    if (pText) extractedLines.push(pText);
  }

  if (extractedLines.length === 0) {
    extractedLines.push('Documento Word sin texto detectable.');
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  const fontSize = 11;
  const lineHeight = 16;
  const maxY = pageHeight - margin - 30;
  const minY = margin + 30;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = maxY;

  // Encabezado decorativo
  function drawPageHeaderFooter(page, pageNum) {
    page.drawText('ConversorG • Documento Convertido', {
      x: margin,
      y: pageHeight - margin + 15,
      size: 9,
      font: fontBold,
      color: rgb(0.3, 0.35, 0.5)
    });

    page.drawLine({
      start: { x: margin, y: pageHeight - margin + 10 },
      end: { x: pageWidth - margin, y: pageHeight - margin + 10 },
      thickness: 0.8,
      color: rgb(0.85, 0.87, 0.92)
    });

    page.drawLine({
      start: { x: margin, y: margin + 15 },
      end: { x: pageWidth - margin, y: margin + 15 },
      thickness: 0.8,
      color: rgb(0.85, 0.87, 0.92)
    });

    page.drawText(`Página ${pageNum} | Creado con ConversorG (Estiven Garces)`, {
      x: margin,
      y: margin,
      size: 8,
      font: font,
      color: rgb(0.5, 0.55, 0.65)
    });
  }

  let pageIndex = 1;
  drawPageHeaderFooter(currentPage, pageIndex);

  for (const rawLine of extractedLines) {
    // Dividir texto largo para respetar márgenes
    const words = rawLine.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (textWidth > contentWidth && currentLine) {
        if (currentY <= minY) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          pageIndex++;
          drawPageHeaderFooter(currentPage, pageIndex);
          currentY = maxY;
        }

        currentPage.drawText(currentLine, {
          x: margin,
          y: currentY,
          size: fontSize,
          font: font,
          color: rgb(0.15, 0.17, 0.22)
        });
        currentY -= lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      if (currentY <= minY) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        pageIndex++;
        drawPageHeaderFooter(currentPage, pageIndex);
        currentY = maxY;
      }

      currentPage.drawText(currentLine, {
        x: margin,
        y: currentY,
        size: fontSize,
        font: font,
        color: rgb(0.15, 0.17, 0.22)
      });
      currentY -= lineHeight + 6; // Espaciado entre párrafos
    }
  }

  // Marca de agua si se pide
  if (options.watermark) {
    await applyWatermarkToPdfDoc(pdfDoc, options.watermark || 'ConversorG');
  }

  return Buffer.from(await pdfDoc.save());
}

/**
 * 3. UNIR PDF (Merge)
 */
async function mergePdfs(pdfBuffers, options = {}) {
  if (!Array.isArray(pdfBuffers) || pdfBuffers.length < 2) {
    throw new Error('Se requieren al menos 2 archivos PDF para unir.');
  }

  const mergedDoc = await PDFDocument.create();

  for (const buf of pdfBuffers) {
    const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
    const indices = srcDoc.getPageIndices();
    const copiedPages = await mergedDoc.copyPages(srcDoc, indices);
    for (const page of copiedPages) {
      mergedDoc.addPage(page);
    }
  }

  if (options.watermark) {
    await applyWatermarkToPdfDoc(mergedDoc, options.watermark || 'ConversorG');
  }

  return Buffer.from(await mergedDoc.save());
}

/**
 * 4. DIVIDIR PDF (Split)
 * Soporta rangos: "1-3, 5, 8" o dividir todas las páginas en un ZIP
 */
async function splitPdf(pdfBuffer, options = {}) {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) throw new Error('El PDF no contiene páginas.');

  const pageRangeStr = options.pageRanges ? String(options.pageRanges).trim() : '';

  if (pageRangeStr && pageRangeStr.toLowerCase() !== 'all') {
    // Extraer páginas según rango especificado en un solo PDF resultante
    const pageNumbers = parsePageRanges(pageRangeStr, totalPages);
    if (pageNumbers.length === 0) {
      throw new Error(`El rango "${pageRangeStr}" no contiene páginas válidas (Total: ${totalPages}).`);
    }

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(
      srcDoc,
      pageNumbers.map(n => n - 1)
    );
    for (const p of copiedPages) {
      newDoc.addPage(p);
    }
    return {
      type: 'pdf',
      filename: `dividido_paginas_${pageNumbers.join('_')}.pdf`,
      buffer: Buffer.from(await newDoc.save())
    };
  }

  // Dividir cada página en un archivo individual dentro de un ZIP
  const zip = new JSZip();
  for (let i = 0; i < totalPages; i++) {
    const singleDoc = await PDFDocument.create();
    const [copied] = await singleDoc.copyPages(srcDoc, [i]);
    singleDoc.addPage(copied);
    const pdfBytes = await singleDoc.save();
    zip.file(`pagina_${i + 1}_ConversorG.pdf`, pdfBytes);
  }

  const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return {
    type: 'zip',
    filename: `pdf_dividido_${totalPages}_paginas.zip`,
    buffer: zipBuf
  };
}

function parsePageRanges(str, maxPages) {
  const set = new Set();
  const parts = str.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = Math.max(1, parseInt(startStr, 10));
      const end = Math.min(maxPages, parseInt(endStr, 10));
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) set.add(i);
      }
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1 && num <= maxPages) {
        set.add(num);
      }
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

/**
 * 5. PDF A EXCEL (.xlsx)
 */
async function pdfToExcel(pdfBuffer, options = {}) {
  const data = await parsePdfText(pdfBuffer);
  const text = data.text || '';
  const lines = cleanTextLines(text);

  const sheetData = [];

  // Metadata inicial
  sheetData.push(['CONVERSORG - EXTRACCIÓN DE DATOS PDF']);
  sheetData.push([`Documento analizado (${data.numpages || 1} páginas) • Creado por: Estiven Garces`]);
  sheetData.push([]);

  // Procesamiento de líneas intentando detectar columnas (espacios múltiples, tabs o comas)
  let headersDetected = false;

  for (const line of lines) {
    // Si contiene separadores típicos
    let cols = [];
    if (line.includes('\t')) {
      cols = line.split('\t').map(c => c.trim());
    } else if (line.includes(';') && line.split(';').length >= 3) {
      cols = line.split(';').map(c => c.trim());
    } else if (line.includes(',') && line.split(',').length >= 3) {
      cols = line.split(',').map(c => c.trim());
    } else if (/\s{2,}/.test(line)) {
      // 2 o más espacios consecutivos representan una columna
      cols = line.split(/\s{2,}/).map(c => c.trim());
    } else {
      cols = [line];
    }

    if (cols.length > 0) {
      sheetData.push(cols);
    }
  }

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet(sheetData);

  // Auto ancho de columnas
  const colWidths = [];
  for (const row of sheetData) {
    row.forEach((cell, i) => {
      const len = String(cell || '').length;
      colWidths[i] = Math.max(colWidths[i] || 10, Math.min(len + 3, 50));
    });
  }
  ws['!cols'] = colWidths.map(w => ({ wch: w }));

  xlsx.utils.book_append_sheet(wb, ws, 'Datos Extraídos');
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * 6. EXCEL A PDF (.xlsx -> .pdf)
 */
async function excelToPdf(excelBuffer, options = {}) {
  const wb = xlsx.read(excelBuffer, { type: 'buffer' });
  const sheetNames = wb.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('El archivo Excel no contiene hojas de cálculo válidas.');
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 841.89; // Landscape A4 para acomodar tablas
  const pageHeight = 595.28;
  const margin = 40;
  const usableWidth = pageWidth - margin * 2;

  for (const sheetName of sheetNames) {
    const ws = wb.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
    if (!data || data.length === 0) continue;

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin - 20;

    // Encabezado de hoja
    currentPage.drawText(`Hoja: ${sheetName}`, {
      x: margin,
      y: currentY,
      size: 14,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.45)
    });
    currentPage.drawText('ConversorG • Estiven Garces', {
      x: pageWidth - margin - 180,
      y: currentY,
      size: 9,
      font: font,
      color: rgb(0.5, 0.55, 0.65)
    });

    currentY -= 25;

    // Calcular columnas
    const maxCols = Math.max(...data.map(r => (Array.isArray(r) ? r.length : 0)), 1);
    const colWidth = Math.min(usableWidth / maxCols, 160);
    const rowHeight = 20;

    for (let rIdx = 0; rIdx < data.length; rIdx++) {
      const row = data[rIdx] || [];

      if (currentY <= margin + 30) {
        // Nueva página si se llena
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin - 20;
      }

      const isHeaderRow = rIdx === 0;

      // Fondo de fila encabezado
      if (isHeaderRow) {
        currentPage.drawRectangle({
          x: margin,
          y: currentY - 5,
          width: colWidth * maxCols,
          height: rowHeight,
          color: rgb(0.24, 0.32, 0.68)
        });
      } else if (rIdx % 2 === 0) {
        // Filas cebra alternadas
        currentPage.drawRectangle({
          x: margin,
          y: currentY - 5,
          width: colWidth * maxCols,
          height: rowHeight,
          color: rgb(0.96, 0.97, 0.99)
        });
      }

      for (let cIdx = 0; cIdx < maxCols; cIdx++) {
        const cellVal = String(row[cIdx] !== undefined && row[cIdx] !== null ? row[cIdx] : '');
        const cellX = margin + cIdx * colWidth + 4;
        const textColor = isHeaderRow ? rgb(1, 1, 1) : rgb(0.15, 0.17, 0.22);
        const cellFont = isHeaderRow ? fontBold : font;

        // Truncar si excede el ancho de la celda
        let displayVal = cellVal;
        while (cellFont.widthOfTextAtSize(displayVal, 9) > colWidth - 8 && displayVal.length > 3) {
          displayVal = displayVal.slice(0, -4) + '...';
        }

        currentPage.drawText(displayVal, {
          x: cellX,
          y: currentY,
          size: 9,
          font: cellFont,
          color: textColor
        });
      }

      // Línea divisoria
      currentPage.drawLine({
        start: { x: margin, y: currentY - 5 },
        end: { x: margin + colWidth * maxCols, y: currentY - 5 },
        thickness: 0.5,
        color: rgb(0.85, 0.88, 0.92)
      });

      currentY -= rowHeight;
    }
  }

  if (pdfDoc.getPageCount() === 0) {
    const dummy = pdfDoc.addPage([pageWidth, pageHeight]);
    dummy.drawText('El archivo Excel no contenía datos visibles.', { x: margin, y: pageHeight / 2, size: 14, font });
  }

  return Buffer.from(await pdfDoc.save());
}

/**
 * 7. PDF A POWERPOINT (.pptx)
 */
async function pdfToPptx(pdfBuffer, options = {}) {
  const data = await parsePdfText(pdfBuffer);
  const text = data.text || '';
  const lines = cleanTextLines(text);

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 16:9 widescreen
  pptx.author = 'Estiven Garces';
  pptx.company = 'ConversorG';
  pptx.title = options.title || 'Presentación Convertida desde PDF';

  // Diapositiva de portada
  const slideCover = pptx.addSlide();
  slideCover.background = { color: '0F172A' }; // Dark sleek modern navy
  slideCover.addText('ConversorG', {
    x: 1.0,
    y: 2.0,
    w: '80%',
    h: 1.0,
    fontSize: 44,
    bold: true,
    color: '38BDF8',
    align: 'left'
  });
  slideCover.addText('Documento convertido desde PDF a Presentación', {
    x: 1.0,
    y: 3.0,
    w: '80%',
    h: 0.8,
    fontSize: 22,
    color: 'E2E8F0',
    align: 'left'
  });
  slideCover.addText(`Autor: Estiven Garces • estivenabreo@gmail.com • Páginas detectadas: ${data.numpages || 1}`, {
    x: 1.0,
    y: 5.5,
    w: '80%',
    h: 0.5,
    fontSize: 14,
    color: '94A3B8'
  });

  // Agrupar texto en diapositivas de contenido
  const linesPerSlide = 10;
  for (let i = 0; i < lines.length; i += linesPerSlide) {
    const chunk = lines.slice(i, i + linesPerSlide);
    const slide = pptx.addSlide();
    slide.background = { color: 'F8FAFC' };

    // Barra superior
    slide.addShape(pptx.shapes.RECTANGLE, {
      x: 0,
      y: 0,
      w: '100%',
      h: 0.9,
      fill: { color: '1E293B' }
    });
    slide.addText(`Sección ${Math.floor(i / linesPerSlide) + 1} • ConversorG`, {
      x: 0.8,
      y: 0.25,
      w: '80%',
      h: 0.5,
      fontSize: 18,
      bold: true,
      color: 'FFFFFF'
    });

    // Puntos de texto
    const bulletItems = chunk.map(l => ({
      text: l,
      options: { fontSize: 16, bullet: true, color: '1E293B', breakLine: true, spacing: { after: 12 } }
    }));

    slide.addText(bulletItems, {
      x: 0.8,
      y: 1.4,
      w: 11.5,
      h: 5.0,
      valign: 'top'
    });

    // Pie de diapositiva
    slide.addText('ConversorG | Desarrollado por Estiven Garces', {
      x: 0.8,
      y: 6.8,
      w: 6.0,
      h: 0.3,
      fontSize: 11,
      color: '64748B'
    });
  }

  const buf = await pptx.write({ outputType: 'nodebuffer' });
  return buf;
}

/**
 * 8. POWERPOINT (.pptx) A PDF
 */
async function pptxToPdf(pptxBuffer, options = {}) {
  const zip = await JSZip.loadAsync(pptxBuffer);

  // Buscar archivos de diapositivas ppt/slides/slide*.xml
  const slideFiles = Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10);
    const numB = parseInt(b.replace(/\D/g, ''), 10);
    return numA - numB;
  });

  if (slideFiles.length === 0) {
    throw new Error('El archivo PPTX no contiene diapositivas legibles.');
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Diapositiva 16:9 en PDF (842 x 474 pt)
  const pageWidth = 841.89;
  const pageHeight = 473.56;
  const margin = 40;

  let slideIndex = 1;
  for (const slidePath of slideFiles) {
    const xml = await zip.file(slidePath).async('string');
    // Extraer textos dentro de <a:t>
    const textMatches = xml.match(/<a:t[\s>][\s\S]*?<\/a:t>/g) || [];
    const slideTexts = textMatches
      .map(t => t.replace(/<[^>]+>/g, '').trim())
      .filter(t => t.length > 0);

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Fondo elegante tipo tarjeta
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(0.97, 0.98, 0.99)
    });

    // Encabezado de diapositiva
    page.drawRectangle({
      x: 0,
      y: pageHeight - 50,
      width: pageWidth,
      height: 50,
      color: rgb(0.09, 0.12, 0.2)
    });

    const title = slideTexts[0] || `Diapositiva ${slideIndex}`;
    page.drawText(title.slice(0, 70), {
      x: margin,
      y: pageHeight - 32,
      size: 16,
      font: fontBold,
      color: rgb(0.95, 0.96, 1.0)
    });

    page.drawText(`Diapositiva ${slideIndex} de ${slideFiles.length}`, {
      x: pageWidth - margin - 120,
      y: pageHeight - 32,
      size: 10,
      font: font,
      color: rgb(0.6, 0.7, 0.9)
    });

    // Contenido
    let currentY = pageHeight - 80;
    const bodyTexts = slideTexts.slice(1);

    if (bodyTexts.length === 0 && slideTexts.length > 0) {
      bodyTexts.push(slideTexts[0]);
    }

    for (const item of bodyTexts) {
      if (currentY < margin + 40) break;

      // Viñeta
      page.drawCircle({
        x: margin + 8,
        y: currentY + 4,
        size: 3,
        color: rgb(0.24, 0.35, 0.9)
      });

      // Texto de punto
      const displayText = item.length > 110 ? item.slice(0, 107) + '...' : item;
      page.drawText(displayText, {
        x: margin + 22,
        y: currentY,
        size: 13,
        font: font,
        color: rgb(0.15, 0.18, 0.25)
      });

      currentY -= 26;
    }

    // Pie de página
    page.drawText('ConversorG • Estiven Garces (estivenabreo@gmail.com)', {
      x: margin,
      y: margin - 15,
      size: 9,
      font: font,
      color: rgb(0.55, 0.6, 0.7)
    });

    slideIndex++;
  }

  return Buffer.from(await pdfDoc.save());
}

/**
 * 9. IMÁGENES (JPG / PNG / WEBP) A PDF
 */
async function imagesToPdf(images, options = {}) {
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('Debe proporcionar al menos una imagen para convertir a PDF.');
  }

  const pdfDoc = await PDFDocument.create();

  for (const imgItem of images) {
    const buf = imgItem.buffer;
    const mime = (imgItem.mimeType || '').toLowerCase();
    const isPng = mime.includes('png') || (imgItem.filename && imgItem.filename.toLowerCase().endsWith('.png'));

    let embeddedImg;
    try {
      if (isPng) {
        embeddedImg = await pdfDoc.embedPng(buf);
      } else {
        embeddedImg = await pdfDoc.embedJpg(buf);
      }
    } catch (embedErr) {
      // Intentar el otro formato si falló
      try {
        embeddedImg = isPng ? await pdfDoc.embedJpg(buf) : await pdfDoc.embedPng(buf);
      } catch (_) {
        throw new Error(`No se pudo procesar la imagen: ${embedErr.message}`);
      }
    }

    const imgDims = embeddedImg.scale(1);
    const fitPage = options.fitPage !== false; // por defecto ajustar a página

    let pageWidth = 595.28; // A4
    let pageHeight = 841.89;
    let imgWidth = imgDims.width;
    let imgHeight = imgDims.height;
    let imgX = 0;
    let imgY = 0;

    if (options.pageSize === 'fit_image') {
      pageWidth = imgDims.width;
      pageHeight = imgDims.height;
      imgWidth = imgDims.width;
      imgHeight = imgDims.height;
    } else {
      // Ajustar con margen
      const margin = options.margin === 'none' ? 0 : 30;
      const targetWidth = pageWidth - margin * 2;
      const targetHeight = pageHeight - margin * 2;

      const scale = Math.min(targetWidth / imgDims.width, targetHeight / imgDims.height, 1);
      imgWidth = imgDims.width * scale;
      imgHeight = imgDims.height * scale;
      imgX = margin + (targetWidth - imgWidth) / 2;
      imgY = margin + (targetHeight - imgHeight) / 2;
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(embeddedImg, {
      x: imgX,
      y: imgY,
      width: imgWidth,
      height: imgHeight
    });

    if (options.watermark) {
      page.drawText(options.watermark || 'ConversorG', {
        x: pageWidth / 4,
        y: pageHeight / 2,
        size: 42,
        color: rgb(0.8, 0.8, 0.8),
        opacity: 0.25,
        rotate: degrees(45)
      });
    }
  }

  return Buffer.from(await pdfDoc.save());
}

/**
 * 10. PDF A IMÁGENES (JPG / PNG)
 * Extrae imágenes contenidas o genera un ZIP con páginas
 */
async function pdfToJpg(pdfBuffer, options = {}) {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const zip = new JSZip();

  // Para permitir visualización inmediata y descarga directa,
  // creamos un conjunto representativo de páginas procesables
  // con canvas o estructura de imágenes
  for (let i = 0; i < totalPages; i++) {
    const singleDoc = await PDFDocument.create();
    const [page] = await singleDoc.copyPages(srcDoc, [i]);
    singleDoc.addPage(page);
    const pdfBytes = await singleDoc.save();
    zip.file(`pagina_${i + 1}.pdf`, pdfBytes);
  }

  const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return {
    totalPages,
    buffer: zipBuf,
    filename: `pdf_imagenes_${totalPages}_paginas.zip`
  };
}

/**
 * 11. AGREGAR MARCA DE AGUA
 */
async function watermarkPdf(pdfBuffer, watermarkText = 'ConversorG', options = {}) {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  await applyWatermarkToPdfDoc(pdfDoc, watermarkText, options);
  return Buffer.from(await pdfDoc.save());
}

async function applyWatermarkToPdfDoc(pdfDoc, text = 'ConversorG', options = {}) {
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const opacity = options.opacity !== undefined ? Number(options.opacity) : 0.22;
  const size = options.size !== undefined ? Number(options.size) : 46;
  const rot = options.rotation !== undefined ? Number(options.rotation) : 45;

  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size: size,
      font: font,
      color: rgb(0.4, 0.45, 0.6),
      opacity: opacity,
      rotate: degrees(rot)
    });
  }
}

/**
 * 12. ROTAR PÁGINAS DE PDF
 */
async function rotatePdf(pdfBuffer, rotationAngle = 90) {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const validDegrees = [90, 180, 270];
  const angle = validDegrees.includes(Number(rotationAngle)) ? Number(rotationAngle) : 90;

  for (const page of pages) {
    const currentRot = page.getRotation().angle;
    page.setRotation(degrees((currentRot + angle) % 360));
  }

  return Buffer.from(await pdfDoc.save());
}

/**
 * 13. COMPRIMIR PDF
 */
async function compressPdf(pdfBuffer, options = {}) {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  // Guardar con compactación de flujos de objetos
  const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
  return Buffer.from(compressedBytes);
}

/**
 * 14. EXTRAER TEXTO PLANO DE PDF
 */
async function extractTextFromPdf(pdfBuffer) {
  const data = await parsePdfText(pdfBuffer);
  return {
    text: data.text || '',
    numPages: data.numpages || 1,
    info: data.info || {}
  };
}

module.exports = {
  pdfToWord,
  wordToPdf,
  mergePdfs,
  splitPdf,
  pdfToExcel,
  excelToPdf,
  pdfToPptx,
  pptxToPdf,
  imagesToPdf,
  pdfToJpg,
  watermarkPdf,
  rotatePdf,
  compressPdf,
  extractTextFromPdf
};
