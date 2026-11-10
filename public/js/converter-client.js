/**
 * CONVERSORG - MOTOR DE CONVERSIÓN CLIENT-SIDE (100% EN EL NAVEGADOR)
 * Compatible con GitHub Pages (Sin necesidad de servidor Node.js)
 * Desarrollado por Estiven Garces (estivenabreo@gmail.com)
 * GitHub: https://github.com/EstivenG1
 */

// ─── Guard: verificar que todas las librerías están disponibles ───────────────
function checkLibsLoaded() {
  const faltantes = [];
  if (typeof PDFLib === 'undefined')    faltantes.push('PDFLib (pdf-lib)');
  if (typeof pdfjsLib === 'undefined')  faltantes.push('pdfjsLib (pdf.js)');
  if (typeof docx === 'undefined')      faltantes.push('docx');
  if (typeof XLSX === 'undefined')      faltantes.push('XLSX (SheetJS)');
  if (typeof PptxGenJS === 'undefined') faltantes.push('PptxGenJS');
  if (typeof JSZip === 'undefined')     faltantes.push('JSZip');
  if (faltantes.length > 0) {
    throw new Error(
      `⚠️ Librerías no cargadas: ${faltantes.join(', ')}.\n` +
      `Revisa tu conexión a internet y recarga la página.`
    );
  }
}

// Inicializar Worker de PDF.js (jsDelivr como CDN principal)
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

const ClientConverter = {
  /**
   * Helper: Extraer texto y páginas de un PDF en el navegador con PDF.js
   */
  async extractPdfTextAndPages(arrayBuffer) {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const pages = [];
    let fullText = '';

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items.map(item => item.str).filter(s => s && s.trim().length > 0);
      const pageText = pageStrings.join(' ');
      pages.push({ pageNum: i, text: pageText, lines: pageStrings });
      fullText += pageText + '\n\n';
    }

    return { numPages, pages, fullText };
  },

  /**
   * 1. PDF A WORD (.docx)
   */
  async pdfToWord(arrayBuffer, options = {}) {
    checkLibsLoaded();
    const { numPages, pages, fullText } = await this.extractPdfTextAndPages(arrayBuffer);
    const paragraphs = [];

    // Título principal
    paragraphs.push(
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: options.title || 'Documento Convertido con ConversorG',
            bold: true,
            size: 32,
            color: '006039' // Verde Rolex
          })
        ],
        spacing: { after: 200 }
      })
    );

    // Subtítulo con créditos de Estiven Garces
    paragraphs.push(
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: `Generado por ConversorG (${numPages} páginas) • Autor: Estiven Garces (estivenabreo@gmail.com)`,
            italics: true,
            size: 18,
            color: '7E8D86'
          })
        ],
        spacing: { after: 400 }
      })
    );

    // Procesar contenido
    for (const pInfo of pages) {
      if (pInfo.lines.length === 0) continue;

      paragraphs.push(
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: `--- Página ${pInfo.pageNum} ---`,
              bold: true,
              size: 20,
              color: 'C5A059' // Oro Champán
            })
          ],
          spacing: { before: 200, after: 120 }
        })
      );

      let currentChunk = [];
      for (const line of pInfo.lines) {
        currentChunk.push(line);
        if (line.endsWith('.') || currentChunk.length >= 4) {
          paragraphs.push(
            new docx.Paragraph({
              children: [new docx.TextRun({ text: currentChunk.join(' '), size: 22 })],
              spacing: { after: 160 }
            })
          );
          currentChunk = [];
        }
      }
      if (currentChunk.length > 0) {
        paragraphs.push(
          new docx.Paragraph({
            children: [new docx.TextRun({ text: currentChunk.join(' '), size: 22 })],
            spacing: { after: 160 }
          })
        );
      }
    }

    const doc = new docx.Document({
      creator: 'Estiven Garces - ConversorG',
      title: 'Documento Convertido',
      sections: [
        {
          properties: {},
          headers: {
            default: new docx.Header({
              children: [
                new docx.Paragraph({
                  children: [new docx.TextRun({ text: 'ConversorG • Conversor PDF Profesional', size: 16, color: '7E8D86' })]
                })
              ]
            })
          },
          footers: {
            default: new docx.Footer({
              children: [
                new docx.Paragraph({
                  alignment: docx.AlignmentType.RIGHT,
                  children: [new docx.TextRun({ text: 'ConversorG | https://github.com/EstivenG1', size: 16, color: '7E8D86' })]
                })
              ]
            })
          },
          children: paragraphs
        }
      ]
    });

    const blob = await docx.Packer.toBlob(doc);
    return blob;
  },

  /**
   * 2. WORD (.docx) A PDF
   */
  async wordToPdf(arrayBuffer, options = {}) {
    checkLibsLoaded();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const documentXml = await zip.file('word/document.xml')?.async('string');

    if (!documentXml) {
      throw new Error('El archivo DOCX no contiene estructura válida (word/document.xml).');
    }

    const paragraphMatches = documentXml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || [];
    const extractedLines = [];

    for (const pXml of paragraphMatches) {
      const textMatches = pXml.match(/<w:t[\s>][\s\S]*?<\/w:t>/g) || [];
      let pText = '';
      for (const tXml of textMatches) {
        pText += tXml.replace(/<[^>]+>/g, '');
      }
      pText = pText.trim();
      if (pText) extractedLines.push(pText);
    }

    if (extractedLines.length === 0) extractedLines.push('Documento Word procesado.');

    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;
    const fontSize = 11;
    const lineHeight = 16;
    const maxY = pageHeight - margin - 30;
    const minY = margin + 30;

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = maxY;

    function drawHeaderFooter(page, pageNum) {
      page.drawText('ConversorG • Documento Convertido', {
        x: margin,
        y: pageHeight - margin + 15,
        size: 9,
        font: fontBold,
        color: rgb(0, 0.38, 0.22) // Verde Rolex
      });
      page.drawLine({
        start: { x: margin, y: pageHeight - margin + 10 },
        end: { x: pageWidth - margin, y: pageHeight - margin + 10 },
        thickness: 0.8,
        color: rgb(0.85, 0.82, 0.75)
      });
      page.drawLine({
        start: { x: margin, y: margin + 15 },
        end: { x: pageWidth - margin, y: margin + 15 },
        thickness: 0.8,
        color: rgb(0.85, 0.82, 0.75)
      });
      page.drawText(`Página ${pageNum} | Creado con ConversorG (Estiven Garces)`, {
        x: margin,
        y: margin,
        size: 8,
        font: font,
        color: rgb(0.45, 0.5, 0.45)
      });
    }

    let pageIdx = 1;
    drawHeaderFooter(currentPage, pageIdx);

    for (const rawLine of extractedLines) {
      const words = rawLine.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (textWidth > contentWidth && currentLine) {
          if (currentY <= minY) {
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            pageIdx++;
            drawHeaderFooter(currentPage, pageIdx);
            currentY = maxY;
          }
          currentPage.drawText(currentLine, { x: margin, y: currentY, size: fontSize, font, color: rgb(0.1, 0.12, 0.1) });
          currentY -= lineHeight;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        if (currentY <= minY) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          pageIdx++;
          drawHeaderFooter(currentPage, pageIdx);
          currentY = maxY;
        }
        currentPage.drawText(currentLine, { x: margin, y: currentY, size: fontSize, font, color: rgb(0.1, 0.12, 0.1) });
        currentY -= lineHeight + 6;
      }
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  },

  /**
   * 3. UNIR PDF (Merge)
   */
  async mergePdfs(buffersList, options = {}) {
    checkLibsLoaded();
    const { PDFDocument } = PDFLib;
    const mergedDoc = await PDFDocument.create();

    for (const buf of buffersList) {
      const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      for (const p of copiedPages) {
        mergedDoc.addPage(p);
      }
    }

    const pdfBytes = await mergedDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  },

  /**
   * 4. DIVIDIR PDF (Split)
   */
  async splitPdf(arrayBuffer, options = {}) {
    checkLibsLoaded();
    const { PDFDocument } = PDFLib;
    const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();

    const rangeStr = (options.pageRanges || 'all').trim();

    if (rangeStr && rangeStr.toLowerCase() !== 'all') {
      const pagesToExtract = this.parsePageRanges(rangeStr, totalPages);
      if (pagesToExtract.length === 0) throw new Error('Rango de páginas inválido.');

      const newDoc = await PDFDocument.create();
      const copied = await newDoc.copyPages(srcDoc, pagesToExtract.map(n => n - 1));
      copied.forEach(p => newDoc.addPage(p));

      const pdfBytes = await newDoc.save();
      return {
        blob: new Blob([pdfBytes], { type: 'application/pdf' }),
        filename: `pdf_dividido_${pagesToExtract.join('_')}.pdf`
      };
    }

    // Dividir todas en un ZIP
    const zip = new JSZip();
    for (let i = 0; i < totalPages; i++) {
      const singleDoc = await PDFDocument.create();
      const [copiedPage] = await singleDoc.copyPages(srcDoc, [i]);
      singleDoc.addPage(copiedPage);
      const singleBytes = await singleDoc.save();
      zip.file(`pagina_${i + 1}_ConversorG.pdf`, singleBytes);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return {
      blob: zipBlob,
      filename: `pdf_dividido_${totalPages}_paginas.zip`
    };
  },

  parsePageRanges(str, maxPages) {
    const set = new Set();
    const parts = str.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [s, e] = trimmed.split('-');
        const start = Math.max(1, parseInt(s, 10));
        const end = Math.min(maxPages, parseInt(e, 10));
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) set.add(i);
        }
      } else {
        const num = parseInt(trimmed, 10);
        if (!isNaN(num) && num >= 1 && num <= maxPages) set.add(num);
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  },

  /**
   * 5. PDF A EXCEL (.xlsx)
   */
  async pdfToExcel(arrayBuffer, options = {}) {
    checkLibsLoaded();
    const { numPages, pages } = await this.extractPdfTextAndPages(arrayBuffer);
    const sheetData = [];

    sheetData.push(['CONVERSORG - EXTRACCIÓN DE DATOS DE PDF']);
    sheetData.push([`Páginas detectadas: ${numPages} • Autor: Estiven Garces (https://github.com/EstivenG1)`]);
    sheetData.push([]);

    for (const p of pages) {
      for (const line of p.lines) {
        let cols = [];
        if (line.includes('\t')) {
          cols = line.split('\t').map(c => c.trim());
        } else if (/\s{2,}/.test(line)) {
          cols = line.split(/\s{2,}/).map(c => c.trim());
        } else {
          cols = [line];
        }
        sheetData.push(cols);
      }
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    const colWidths = [];
    for (const row of sheetData) {
      row.forEach((cell, i) => {
        const len = String(cell || '').length;
        colWidths[i] = Math.max(colWidths[i] || 10, Math.min(len + 3, 50));
      });
    }
    ws['!cols'] = colWidths.map(w => ({ wch: w }));

    XLSX.utils.book_append_sheet(wb, ws, 'Datos Extraídos');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  },

  /**
   * 6. EXCEL A PDF (.xlsx -> .pdf)
   */
  async excelToPdf(arrayBuffer, options = {}) {
    checkLibsLoaded();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetNames = wb.SheetNames;
    if (!sheetNames || sheetNames.length === 0) throw new Error('El archivo Excel no tiene hojas.');

    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 841.89; // Landscape A4
    const pageHeight = 595.28;
    const margin = 40;
    const usableWidth = pageWidth - margin * 2;

    for (const sheetName of sheetNames) {
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (!data || data.length === 0) continue;

      let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      let currentY = pageHeight - margin - 20;

      currentPage.drawText(`Hoja: ${sheetName} • ConversorG`, {
        x: margin,
        y: currentY,
        size: 14,
        font: fontBold,
        color: rgb(0, 0.38, 0.22) // Verde Rolex
      });

      currentY -= 25;
      const maxCols = Math.max(...data.map(r => (Array.isArray(r) ? r.length : 0)), 1);
      const colWidth = Math.min(usableWidth / maxCols, 160);
      const rowHeight = 20;

      for (let rIdx = 0; rIdx < data.length; rIdx++) {
        const row = data[rIdx] || [];
        if (currentY <= margin + 30) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin - 20;
        }

        const isHeaderRow = rIdx === 0;
        if (isHeaderRow) {
          currentPage.drawRectangle({
            x: margin,
            y: currentY - 5,
            width: colWidth * maxCols,
            height: rowHeight,
            color: rgb(0, 0.38, 0.22) // Verde Rolex header
          });
        } else if (rIdx % 2 === 0) {
          currentPage.drawRectangle({
            x: margin,
            y: currentY - 5,
            width: colWidth * maxCols,
            height: rowHeight,
            color: rgb(0.97, 0.96, 0.93) // Hueso suave zebra
          });
        }

        for (let cIdx = 0; cIdx < maxCols; cIdx++) {
          const cellVal = String(row[cIdx] !== undefined && row[cIdx] !== null ? row[cIdx] : '');
          const cellX = margin + cIdx * colWidth + 4;
          const textColor = isHeaderRow ? rgb(1, 1, 1) : rgb(0.12, 0.15, 0.12);
          const cellFont = isHeaderRow ? fontBold : font;

          let displayVal = cellVal;
          while (cellFont.widthOfTextAtSize(displayVal, 9) > colWidth - 8 && displayVal.length > 3) {
            displayVal = displayVal.slice(0, -4) + '...';
          }

          currentPage.drawText(displayVal, { x: cellX, y: currentY, size: 9, font: cellFont, color: textColor });
        }

        currentY -= rowHeight;
      }
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  },

  /**
   * 7. PDF A POWERPOINT (.pptx)
   */
  async pdfToPptx(arrayBuffer, options = {}) {
    checkLibsLoaded();
    const { numPages, pages } = await this.extractPdfTextAndPages(arrayBuffer);
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'Estiven Garces';
    pptx.company = 'ConversorG';

    // Portada en Verde Rolex
    const cover = pptx.addSlide();
    cover.background = { color: '004D2E' };
    cover.addText('ConversorG', {
      x: 1.0,
      y: 2.0,
      w: '80%',
      h: 1.0,
      fontSize: 44,
      bold: true,
      color: 'DFBA73' // Oro Champán
    });
    cover.addText('Documento convertido desde PDF a Presentación', {
      x: 1.0,
      y: 3.0,
      w: '80%',
      h: 0.8,
      fontSize: 22,
      color: 'F7F4EB' // Tono Hueso
    });
    cover.addText(`Desarrollado por Estiven Garces • https://github.com/EstivenG1`, {
      x: 1.0,
      y: 5.5,
      w: '80%',
      h: 0.5,
      fontSize: 14,
      color: 'B8C7BF'
    });

    for (let pIdx = 0; pIdx < pages.length; pIdx++) {
      const pageInfo = pages[pIdx];
      const slide = pptx.addSlide();
      slide.background = { color: 'F7F4EB' }; // Fondo Hueso

      // Cabecera Verde Rolex
      slide.addShape(pptx.shapes.RECTANGLE, {
        x: 0,
        y: 0,
        w: '100%',
        h: 0.85,
        fill: { color: '006039' }
      });
      slide.addText(`Página ${pIdx + 1} • ConversorG`, {
        x: 0.8,
        y: 0.22,
        w: '80%',
        h: 0.5,
        fontSize: 18,
        bold: true,
        color: 'FFFFFF'
      });

      const bullets = pageInfo.lines.slice(0, 10).map(l => ({
        text: l,
        options: { fontSize: 16, bullet: true, color: '141E1A', breakLine: true, spacing: { after: 12 } }
      }));

      slide.addText(bullets, { x: 0.8, y: 1.3, w: 11.5, h: 5.0, valign: 'top' });
      slide.addText('ConversorG | https://github.com/EstivenG1', {
        x: 0.8,
        y: 6.8,
        w: 6.0,
        h: 0.3,
        fontSize: 11,
        color: '7E8D86'
      });
    }

    const blob = await pptx.write({ outputType: 'blob' });
    return blob;
  },

  /**
   * 8. POWERPOINT (.pptx) A PDF
   */
  async pptxToPdf(arrayBuffer, options = {}) {
    checkLibsLoaded();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const slideFiles = Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10);
      const numB = parseInt(b.replace(/\D/g, ''), 10);
      return numA - numB;
    });

    if (slideFiles.length === 0) throw new Error('El archivo PPTX no contiene diapositivas legibles.');

    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 841.89;
    const pageHeight = 473.56;
    const margin = 40;

    let slideIndex = 1;
    for (const slidePath of slideFiles) {
      const xml = await zip.file(slidePath).async('string');
      const textMatches = xml.match(/<a:t[\s>][\s\S]*?<\/a:t>/g) || [];
      const slideTexts = textMatches.map(t => t.replace(/<[^>]+>/g, '').trim()).filter(t => t.length > 0);

      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      // Fondo hueso
      page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: rgb(0.97, 0.96, 0.92) });

      // Cabecera Verde Rolex
      page.drawRectangle({ x: 0, y: pageHeight - 50, width: pageWidth, height: 50, color: rgb(0, 0.38, 0.22) });

      const title = slideTexts[0] || `Diapositiva ${slideIndex}`;
      page.drawText(title.slice(0, 70), {
        x: margin,
        y: pageHeight - 32,
        size: 16,
        font: fontBold,
        color: rgb(1, 1, 1)
      });

      let currentY = pageHeight - 80;
      for (const item of slideTexts.slice(1, 9)) {
        if (currentY < margin + 40) break;
        page.drawCircle({ x: margin + 8, y: currentY + 4, size: 3, color: rgb(0.77, 0.63, 0.35) }); // Oro
        page.drawText(item.slice(0, 110), { x: margin + 22, y: currentY, size: 13, font, color: rgb(0.1, 0.12, 0.1) });
        currentY -= 26;
      }

      page.drawText('ConversorG • Estiven Garces (https://github.com/EstivenG1)', {
        x: margin,
        y: margin - 15,
        size: 9,
        font,
        color: rgb(0.45, 0.5, 0.45)
      });

      slideIndex++;
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  },

  /**
   * 9. IMÁGENES A PDF
   */
  async imagesToPdf(imagesList, options = {}) {
    checkLibsLoaded();
    const { PDFDocument } = PDFLib;
    const pdfDoc = await PDFDocument.create();

    for (const img of imagesList) {
      let embeddedImg;
      const isPng = (img.type && img.type.includes('png')) || img.name.toLowerCase().endsWith('.png');

      try {
        embeddedImg = isPng ? await pdfDoc.embedPng(img.buffer) : await pdfDoc.embedJpg(img.buffer);
      } catch (_) {
        embeddedImg = isPng ? await pdfDoc.embedJpg(img.buffer) : await pdfDoc.embedPng(img.buffer);
      }

      const dims = embeddedImg.scale(1);
      let pWidth = 595.28;
      let pHeight = 841.89;
      let imgWidth = dims.width;
      let imgHeight = dims.height;
      let imgX = 0;
      let imgY = 0;

      if (options.pageSize === 'fit_image') {
        pWidth = dims.width;
        pHeight = dims.height;
      } else {
        const margin = 30;
        const targetW = pWidth - margin * 2;
        const targetH = pHeight - margin * 2;
        const scale = Math.min(targetW / dims.width, targetH / dims.height, 1);
        imgWidth = dims.width * scale;
        imgHeight = dims.height * scale;
        imgX = margin + (targetW - imgWidth) / 2;
        imgY = margin + (targetH - imgHeight) / 2;
      }

      const page = pdfDoc.addPage([pWidth, pHeight]);
      page.drawImage(embeddedImg, { x: imgX, y: imgY, width: imgWidth, height: imgHeight });
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  },

  /**
   * 10. PDF A IMÁGENES JPG (Renderizado HD con Canvas en Navegador)
   */
  async pdfToJpg(arrayBuffer, options = {}) {
    checkLibsLoaded();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const zip = new JSZip();

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // Escala 2x para nitidez HD

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;

      const imgBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      zip.file(`pagina_${i}_ConversorG.jpg`, imgBlob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return { blob: zipBlob, numPages, filename: `pdf_imagenes_${numPages}_paginas.zip` };
  },

  /**
   * 11. COMPRIMIR PDF
   */
  async compressPdf(arrayBuffer, options = {}) {
    checkLibsLoaded();
    const { PDFDocument } = PDFLib;
    const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const compressedBytes = await doc.save({ useObjectStreams: true });
    return new Blob([compressedBytes], { type: 'application/pdf' });
  },

  /**
   * 12. ROTAR PÁGINAS DE PDF
   */
  async rotatePdf(arrayBuffer, degreesAngle = 90) {
    checkLibsLoaded();
    const { PDFDocument, degrees } = PDFLib;
    const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const pages = doc.getPages();
    const rot = Number(degreesAngle) || 90;

    for (const p of pages) {
      const current = p.getRotation().angle;
      p.setRotation(degrees((current + rot) % 360));
    }

    const pdfBytes = await doc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  },

  /**
   * 13. MARCA DE AGUA ("ConversorG")
   */
  async watermarkPdf(arrayBuffer, text = 'ConversorG', options = {}) {
    checkLibsLoaded();
    const { PDFDocument, rgb, degrees, StandardFonts } = PDFLib;
    const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const pages = doc.getPages();

    const opacity = options.opacity ? Number(options.opacity) : 0.22;
    const size = options.size ? Number(options.size) : 48;
    const rot = options.rotation !== undefined ? Number(options.rotation) : 45;

    for (const page of pages) {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: (width - textWidth) / 2,
        y: height / 2,
        size,
        font,
        color: rgb(0, 0.38, 0.22), // Sello en Verde Rolex
        opacity,
        rotate: degrees(rot)
      });
    }

    const pdfBytes = await doc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  },

  /**
   * 14. EXTRAER TEXTO PLANO
   */
  async extractText(arrayBuffer) {
    checkLibsLoaded();
    const { numPages, fullText } = await this.extractPdfTextAndPages(arrayBuffer);
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    return { blob, text: fullText, numPages };
  }
};

window.ClientConverter = ClientConverter;
