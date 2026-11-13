/**
 * CONVERSORG - MOTOR DE CONVERSIÓN CLIENT-SIDE (100% EN EL NAVEGADOR)
 * Compatible con GitHub Pages (Sin necesidad de servidor Node.js)
 * Desarrollado por Estiven Garces (estivenabreo@gmail.com)
 * GitHub: https://github.com/EstivenG1
 */

// ─── Guard: validar solo las librerías requeridas por cada operación ──────────
function checkLibsLoaded(required = ['PDFLib', 'pdfjsLib', 'docx', 'XLSX', 'PptxGenJS', 'JSZip']) {
  const libraryNames = {
    PDFLib: 'PDFLib (pdf-lib)',
    pdfjsLib: 'pdfjsLib (pdf.js)',
    docx: 'docx',
    XLSX: 'XLSX (SheetJS)',
    PptxGenJS: 'PptxGenJS',
    JSZip: 'JSZip'
  };
  const libraryIsLoaded = {
    PDFLib: () => typeof PDFLib !== 'undefined',
    pdfjsLib: () => typeof pdfjsLib !== 'undefined',
    docx: () => typeof docx !== 'undefined',
    XLSX: () => typeof XLSX !== 'undefined',
    PptxGenJS: () => typeof PptxGenJS !== 'undefined',
    JSZip: () => typeof JSZip !== 'undefined'
  };
  const faltantes = required
    .filter(name => !libraryIsLoaded[name] || !libraryIsLoaded[name]())
    .map(name => libraryNames[name] || name);
  if (faltantes.length > 0) {
    throw new Error(
      `No están disponibles las librerías requeridas: ${faltantes.join(', ')}. Comprueba que sus archivos se hayan cargado y recarga la página.`
    );
  }
}

function makeWinAnsiSafe(text, font) {
  const replacements = {
    '→': '->',
    '←': '<-',
    '↔': '<->',
    '⇒': '=>',
    '⇐': '<=',
    '⇔': '<=>',
    '↑': 'up',
    '↓': 'down',
    '…': '...',
    '—': '-',
    '–': '-',
    '−': '-',
    '“': '"',
    '”': '"',
    '‘': "'",
    '’': "'",
    '\u00a0': ' '
  };

  return Array.from(String(text), character => {
    const replacement = replacements[character] || character;
    try {
      font.widthOfTextAtSize(replacement, 11);
      return replacement;
    } catch {
      const decomposed = character.normalize('NFKD').replace(/\p{M}/gu, '');
      try {
        font.widthOfTextAtSize(decomposed, 11);
        return decomposed;
      } catch {
        return '?';
      }
    }
  }).join('');
}

function getImageType(buffer) {
  const bytes = new Uint8Array(buffer);
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) return 'png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP'
  ) return 'webp';
  return null;
}

async function convertWebpToPng(buffer, fileName) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(new Blob([buffer], { type: 'image/webp' }));
  } catch (error) {
    throw new Error(`No se pudo decodificar "${fileName}" como WebP. Comprueba que la imagen no esté dañada. Detalle: ${error.message}`);
  }

  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error(`El navegador no pudo preparar "${fileName}" para convertirla a PDF.`);
  }

  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const pngBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!pngBlob) {
    throw new Error(`El navegador no pudo convertir "${fileName}" de WebP a PNG.`);
  }

  return pngBlob.arrayBuffer();
}

// Inicializar Worker de PDF.js (archivo local - sin dependencia de CDN)
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = './js/libs/pdf.worker.min.js';
}

const ClientConverter = {
  /**
   * Helper: Extraer texto y páginas de un PDF en el navegador con PDF.js
   */
  async extractPdfTextAndPages(arrayBuffer) {
    checkLibsLoaded(['pdfjsLib']);
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
    checkLibsLoaded(['pdfjsLib', 'docx']);
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
    checkLibsLoaded(['PDFLib', 'JSZip']);
    const zip = await JSZip.loadAsync(arrayBuffer);
    const documentXml = await zip.file('word/document.xml')?.async('string');

    if (!documentXml) {
      throw new Error('El archivo DOCX no contiene estructura válida (word/document.xml).');
    }

    const wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const xmlDocument = new DOMParser().parseFromString(documentXml, 'application/xml');
    if (xmlDocument.getElementsByTagName('parsererror').length > 0) {
      throw new Error('El documento Word contiene XML dañado y no se pudo interpretar.');
    }

    const getWordChild = (node, name) => Array.from(node?.children || [])
      .find(child => child.namespaceURI === wordNamespace && child.localName === name) || null;
    const getWordValue = node => node?.getAttributeNS(wordNamespace, 'val') ?? null;
    const getWordAttributes = node => {
      if (!node) return null;
      return Object.fromEntries(Array.from(node.attributes)
        .filter(attribute => attribute.namespaceURI === wordNamespace)
        .map(attribute => [attribute.localName, attribute.value]));
    };

    const stylesXml = await zip.file('word/styles.xml')?.async('string');
    const stylesDocument = stylesXml
      ? new DOMParser().parseFromString(stylesXml, 'application/xml')
      : null;
    const stylesRoot = stylesDocument?.documentElement || null;
    const styleMap = new Map();
    const defaultStyles = {};
    for (const style of Array.from(stylesRoot?.getElementsByTagNameNS(wordNamespace, 'style') || [])) {
      const styleId = style.getAttributeNS(wordNamespace, 'styleId');
      const styleType = style.getAttributeNS(wordNamespace, 'type');
      if (!styleId || !styleType) continue;
      styleMap.set(styleId, style);
      if (style.getAttributeNS(wordNamespace, 'default') === '1') defaultStyles[styleType] = styleId;
    }

    function findStyleProperty(styleId, sectionName, propertyName, styleType) {
      const visited = new Set();
      let currentId = styleId || defaultStyles[styleType];
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const style = styleMap.get(currentId);
        if (!style) break;
        const property = getWordChild(getWordChild(style, sectionName), propertyName);
        if (property) return property;
        currentId = getWordValue(getWordChild(style, 'basedOn'));
      }

      if (styleId && defaultStyles[styleType] && styleId !== defaultStyles[styleType]) {
        return findStyleProperty(defaultStyles[styleType], sectionName, propertyName, styleType);
      }
      const defaultsName = sectionName === 'pPr' ? 'pPrDefault' : 'rPrDefault';
      const defaultSection = getWordChild(
        getWordChild(getWordChild(stylesRoot, 'docDefaults'), defaultsName),
        sectionName
      );
      return getWordChild(defaultSection, propertyName);
    }

    function getEffectiveProperty(directProperties, propertyName, styleId, sectionName, styleType) {
      return getWordChild(directProperties, propertyName) ||
        findStyleProperty(styleId, sectionName, propertyName, styleType);
    }

    const documentBody = xmlDocument.getElementsByTagNameNS(wordNamespace, 'body')[0];
    if (!documentBody) {
      throw new Error('El archivo Word no contiene un cuerpo de documento válido.');
    }

    function parseWordParagraph(paragraph) {
      const paragraphProperties = getWordChild(paragraph, 'pPr');
      const paragraphStyleId = getWordValue(getWordChild(paragraphProperties, 'pStyle'));
      const paragraphProperty = name =>
        getEffectiveProperty(paragraphProperties, name, paragraphStyleId, 'pPr', 'paragraph');
      const spacing = getWordAttributes(paragraphProperty('spacing')) || {};
      const indentation = getWordAttributes(paragraphProperty('ind')) || {};
      const alignment = getWordValue(paragraphProperty('jc')) || 'left';
      const pageBreakBeforeProperty = paragraphProperty('pageBreakBefore');
      const fragments = [];

      function collectRunContent(node, currentRunProperties = null) {
        if (node.namespaceURI === wordNamespace && node.localName === 'del') return;
        if (node.namespaceURI === wordNamespace && node.localName === 'r') {
          currentRunProperties = getWordChild(node, 'rPr');
        }
        if (node.namespaceURI === wordNamespace && node.localName === 't') {
          fragments.push({ text: node.textContent, properties: currentRunProperties });
          return;
        }
        if (node.namespaceURI === wordNamespace && node.localName === 'tab') {
          fragments.push({ text: '    ', properties: currentRunProperties });
          return;
        }
        if (node.namespaceURI === wordNamespace && (node.localName === 'br' || node.localName === 'cr')) {
          fragments.push({
            text: '\n',
            properties: currentRunProperties,
            pageBreak: getWordAttributes(node)?.type === 'page'
          });
          return;
        }
        for (const child of Array.from(node.children || [])) {
          collectRunContent(child, currentRunProperties);
        }
      }

      collectRunContent(paragraph);
      return {
        fragments,
        paragraphStyleId,
        alignment,
        spacing,
        indentation,
        pageBreakBefore: pageBreakBeforeProperty !== null &&
          !['0', 'false', 'off'].includes((getWordValue(pageBreakBeforeProperty) || '1').toLowerCase())
      };
    }

    function parseWordTable(tableNode) {
      const tableProperties = getWordChild(tableNode, 'tblPr');
      const tableGrid = getWordChild(tableNode, 'tblGrid');
      const gridWidths = Array.from(tableGrid?.children || [])
        .filter(column => column.namespaceURI === wordNamespace && column.localName === 'gridCol')
        .map(column => Number(getWordAttributes(column)?.w) || 0);
      const rows = Array.from(tableNode.children || [])
        .filter(row => row.namespaceURI === wordNamespace && row.localName === 'tr')
        .map(row => {
          const rowProperties = getWordChild(row, 'trPr');
          return {
            cantSplit: getWordChild(rowProperties, 'cantSplit') !== null,
            cells: Array.from(row.children || [])
              .filter(cell => cell.namespaceURI === wordNamespace && cell.localName === 'tc')
              .map(cell => {
                const cellProperties = getWordChild(cell, 'tcPr');
                const span = Number(getWordValue(getWordChild(cellProperties, 'gridSpan'))) || 1;
                const verticalMerge = getWordChild(cellProperties, 'vMerge');
                const mergeValue = getWordValue(verticalMerge);
                return {
                  paragraphs: Array.from(cell.children || [])
                    .filter(child => child.namespaceURI === wordNamespace && child.localName === 'p')
                    .map(parseWordParagraph),
                  span,
                  verticalMerge: verticalMerge ? (mergeValue === 'restart' ? 'restart' : 'continue') : null,
                  verticalAlignment: getWordValue(getWordChild(cellProperties, 'vAlign')) || 'top',
                  shading: getWordAttributes(getWordChild(cellProperties, 'shd')),
                  borders: getWordChild(cellProperties, 'tcBorders'),
                  margins: getWordChild(cellProperties, 'tcMar')
                };
              })
          };
        });
      return {
        rows,
        gridWidths,
        width: getWordAttributes(getWordChild(tableProperties, 'tblW')),
        indentation: getWordAttributes(getWordChild(tableProperties, 'tblInd')),
        alignment: getWordValue(getWordChild(tableProperties, 'jc')) || 'left',
        borders: getWordChild(tableProperties, 'tblBorders'),
        cellMargins: getWordChild(tableProperties, 'tblCellMar')
      };
    }

    const documentBlocks = Array.from(documentBody.children || [])
      .filter(child => child.namespaceURI === wordNamespace && ['p', 'tbl'].includes(child.localName))
      .map(child => child.localName === 'tbl'
        ? { type: 'table', table: parseWordTable(child) }
        : { type: 'paragraph', paragraph: parseWordParagraph(child) });
    const parsedParagraphs = documentBlocks
      .filter(block => block.type === 'paragraph')
      .map(block => block.paragraph);

    if (documentBlocks.length === 0) {
      documentBlocks.push({
        type: 'paragraph',
        paragraph: {
          fragments: [{ text: 'Documento Word procesado.', properties: null }],
          paragraphStyleId: null,
          alignment: 'left',
          spacing: {},
          indentation: {},
          pageBreakBefore: false
        }
      });
    }

    const { PDFDocument, rgb, StandardFonts, PDFName, PDFString } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const stylesDefaults = getWordChild(getWordChild(stylesRoot, 'docDefaults'), 'rPrDefault');
    const defaultRunProperties = getWordChild(stylesDefaults, 'rPr');
    const defaultFontProperties = getEffectiveProperty(
      defaultRunProperties, 'rFonts', defaultStyles.character, 'rPr', 'character'
    );
    const defaultFontName = defaultFontProperties?.getAttributeNS(wordNamespace, 'hAnsi') ||
      defaultFontProperties?.getAttributeNS(wordNamespace, 'ascii') || 'Calibri';
    const defaultSizeProperty = getEffectiveProperty(
      defaultRunProperties, 'sz', defaultStyles.character, 'rPr', 'character'
    );
    const defaultFontSize = Number(getWordValue(defaultSizeProperty)) / 2 || 11;
    const fontCache = new Map();

    function resolveRunProperty(runProperties, propertyName, paragraphStyleId) {
      const characterStyleId = getWordValue(getWordChild(runProperties, 'rStyle'));
      return getEffectiveProperty(runProperties, propertyName, characterStyleId, 'rPr', 'character') ||
        findStyleProperty(paragraphStyleId, 'rPr', propertyName, 'paragraph') ||
        findStyleProperty(defaultStyles.character, 'rPr', propertyName, 'character');
    }

    function getStandardFontName(runProperties, paragraphStyleId) {
      const fontProperties = resolveRunProperty(runProperties, 'rFonts', paragraphStyleId);
      const family = (
        fontProperties?.getAttributeNS(wordNamespace, 'hAnsi') ||
        fontProperties?.getAttributeNS(wordNamespace, 'ascii') ||
        defaultFontName
      ).toLowerCase();
      const familyPrefix = /times|cambria|georgia/.test(family)
        ? 'TimesRoman'
        : /courier|consolas/.test(family)
          ? 'Courier'
          : 'Helvetica';
      const boldProperty = resolveRunProperty(runProperties, 'b', paragraphStyleId);
      const italicProperty = resolveRunProperty(runProperties, 'i', paragraphStyleId);
      const isOn = property => property !== null &&
        !['0', 'false', 'off'].includes((getWordValue(property) || '1').toLowerCase());
      const bold = isOn(boldProperty);
      const italic = isOn(italicProperty);
      if (familyPrefix === 'Helvetica') {
        return bold ? (italic ? 'HelveticaBoldOblique' : 'HelveticaBold') : (italic ? 'HelveticaOblique' : 'Helvetica');
      }
      if (familyPrefix === 'Courier') {
        return bold ? (italic ? 'CourierBoldOblique' : 'CourierBold') : (italic ? 'CourierOblique' : 'Courier');
      }
      return bold ? (italic ? 'TimesRomanBoldItalic' : 'TimesRomanBold') : (italic ? 'TimesRomanItalic' : 'TimesRoman');
    }

    async function getRunStyle(fragment, paragraphStyleId) {
      const properties = fragment.properties;
      const sizeProperty = resolveRunProperty(properties, 'sz', paragraphStyleId);
      const fontSize = Number(getWordValue(sizeProperty)) / 2 || defaultFontSize;
      const standardFontName = getStandardFontName(properties, paragraphStyleId);
      if (!fontCache.has(standardFontName)) {
        fontCache.set(standardFontName, await pdfDoc.embedFont(StandardFonts[standardFontName]));
      }
      const colorProperty = resolveRunProperty(properties, 'color', paragraphStyleId);
      const colorValue = getWordValue(colorProperty);
      const color = colorValue && /^[0-9a-f]{6}$/i.test(colorValue)
        ? rgb(
          parseInt(colorValue.slice(0, 2), 16) / 255,
          parseInt(colorValue.slice(2, 4), 16) / 255,
          parseInt(colorValue.slice(4, 6), 16) / 255
        )
        : rgb(0.1, 0.12, 0.1);
      const underlineProperty = resolveRunProperty(properties, 'u', paragraphStyleId);
      return {
        font: fontCache.get(standardFontName),
        fontSize,
        color,
        underline: underlineProperty !== null && getWordValue(underlineProperty) !== 'none'
      };
    }

    const body = xmlDocument.getElementsByTagNameNS(wordNamespace, 'body')[0];
    const sectionProperties = Array.from(body.getElementsByTagNameNS(wordNamespace, 'sectPr')).pop();
    const pageSize = getWordAttributes(getWordChild(sectionProperties, 'pgSz')) || {};
    const pageMargins = getWordAttributes(getWordChild(sectionProperties, 'pgMar')) || {};
    const twipsToPoints = (value, fallback) => value === undefined ? fallback : Number(value) / 20;
    const pageWidth = twipsToPoints(pageSize.w, 595.28);
    const pageHeight = twipsToPoints(pageSize.h, 841.89);
    const marginTop = twipsToPoints(pageMargins.top, 72);
    const marginRight = twipsToPoints(pageMargins.right, 72);
    const marginBottom = twipsToPoints(pageMargins.bottom, 72);
    const marginLeft = twipsToPoints(pageMargins.left, 72);
    const contentBottom = marginBottom + 18;
    const contentTop = pageHeight - marginTop;
    const sourceUrl = 'https://estiveng1.github.io/ConversorPdf/';
    let currentPage;
    let currentY;
    let pageNumber = 0;

    function addPage() {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      pageNumber++;
      currentY = contentTop;
      const pageNumberText = String(pageNumber);
      const numberFont = fontCache.get('Helvetica');
      const numberWidth = numberFont.widthOfTextAtSize(pageNumberText, 8);
      currentPage.drawText('ConversorG • Documento convertido', {
        x: marginLeft,
        y: pageHeight - Math.max(18, marginTop / 2),
        size: 8,
        font: numberFont,
        color: rgb(0.45, 0.5, 0.45)
      });
      currentPage.drawText(pageNumberText, {
        x: pageWidth - marginRight - numberWidth,
        y: pageHeight - Math.max(18, marginTop / 2),
        size: 8,
        font: numberFont,
        color: rgb(0.45, 0.5, 0.45)
      });
    }

    async function ensurePage() {
      if (!currentPage) {
        if (!fontCache.has('Helvetica')) {
          fontCache.set('Helvetica', await pdfDoc.embedFont(StandardFonts.Helvetica));
        }
        addPage();
      }
    }

    function addFooterLink(page) {
      const prefix = `Página ${pageNumber} | Creado con ConversorG - `;
      const footerFont = fontCache.get('Helvetica');
      const footerSize = 8;
      const footerX = marginLeft;
      const footerY = Math.max(10, marginBottom / 2 - 4);
      const safePrefix = makeWinAnsiSafe(prefix, footerFont);
      const safeUrl = makeWinAnsiSafe(sourceUrl, footerFont);
      const prefixWidth = footerFont.widthOfTextAtSize(safePrefix, footerSize);
      const urlWidth = footerFont.widthOfTextAtSize(safeUrl, footerSize);
      page.drawText(safePrefix, {
        x: footerX,
        y: footerY,
        size: footerSize,
        font: footerFont,
        color: rgb(0.45, 0.5, 0.45)
      });
      page.drawText(safeUrl, {
        x: footerX + prefixWidth,
        y: footerY,
        size: footerSize,
        font: footerFont,
        color: rgb(0, 0.38, 0.22)
      });
      page.drawLine({
        start: { x: footerX + prefixWidth, y: footerY - 1 },
        end: { x: footerX + prefixWidth + urlWidth, y: footerY - 1 },
        thickness: 0.35,
        color: rgb(0, 0.38, 0.22)
      });
      const annotation = pdfDoc.context.obj({
        Type: PDFName.of('Annot'),
        Subtype: PDFName.of('Link'),
        Rect: [footerX + prefixWidth, footerY - 1, footerX + prefixWidth + urlWidth, footerY + footerSize + 2],
        Border: [0, 0, 0],
        A: {
          Type: PDFName.of('Action'),
          S: PDFName.of('URI'),
          URI: PDFString.of(sourceUrl)
        }
      });
      page.node.addAnnot(pdfDoc.context.register(annotation));
    }

    function startNewPage() {
      addPage();
    }

    function appendTextToLayout(text, style, maxWidth, layout) {
      const pushLine = (force = false) => {
        if (layout.currentLine.length || force) {
          layout.lines.push({ fragments: layout.currentLine, width: layout.currentWidth });
        }
        layout.currentLine = [];
        layout.currentWidth = 0;
      };
      const appendToken = token => {
        const width = style.font.widthOfTextAtSize(token, style.fontSize);
        if (/^\s+$/.test(token)) {
          if (layout.currentLine.length && layout.currentWidth + width <= maxWidth) {
            layout.currentLine.push({ text: token, style });
            layout.currentWidth += width;
          }
          return;
        }
        if (layout.currentLine.length && layout.currentWidth + width > maxWidth) pushLine();
        if (width <= maxWidth) {
          layout.currentLine.push({ text: token, style });
          layout.currentWidth += width;
          return;
        }
        let chunk = '';
        for (const character of Array.from(token)) {
          const nextChunk = chunk + character;
          if (chunk && style.font.widthOfTextAtSize(nextChunk, style.fontSize) > maxWidth) {
            const chunkWidth = style.font.widthOfTextAtSize(chunk, style.fontSize);
            layout.currentLine.push({ text: chunk, style });
            layout.currentWidth += chunkWidth;
            pushLine();
            chunk = character;
          } else {
            chunk = nextChunk;
          }
        }
        if (chunk) {
          layout.currentLine.push({ text: chunk, style });
          layout.currentWidth += style.font.widthOfTextAtSize(chunk, style.fontSize);
        }
      };

      for (const part of text.split(/(\n)/)) {
        if (part === '\n') {
          pushLine(true);
          continue;
        }
        for (const token of part.match(/\s+|[^\s]+/g) || []) appendToken(token);
      }
    }

    async function renderParagraph(paragraph) {
      if (!currentPage) await ensurePage();
      if (paragraph.pageBreakBefore && currentY < contentTop) {
        startNewPage();
      }
      const paragraphProperties = paragraph.spacing;
      const indent = paragraph.indentation;
      const leftIndent = Number(indent.left) / 20 || 0;
      const rightIndent = Number(indent.right) / 20 || 0;
      const firstLineIndent = Number(indent.firstLine) / 20 ||
        (indent.hanging ? -(Number(indent.hanging) / 20) : 0);
      const availableWidth = Math.max(24, pageWidth - marginLeft - marginRight - leftIndent - rightIndent);
      const maxLineWidth = Math.max(24, availableWidth - Math.max(0, firstLineIndent));
      const layout = { lines: [], currentLine: [], currentWidth: 0 };

      for (const fragment of paragraph.fragments) {
        if (fragment.pageBreak) {
          if (layout.currentLine.length) {
            layout.lines.push({ fragments: layout.currentLine, width: layout.currentWidth });
            layout.currentLine = [];
            layout.currentWidth = 0;
          }
          layout.lines.push({ pageBreak: true });
          continue;
        }
        const style = await getRunStyle(fragment, paragraph.paragraphStyleId);
        const safeText = makeWinAnsiSafe(fragment.text, style.font);
        appendTextToLayout(safeText, style, maxLineWidth, layout);
      }
      if (layout.currentLine.length) {
        layout.lines.push({ fragments: layout.currentLine, width: layout.currentWidth });
      }

      const before = Number(paragraphProperties.before) / 20 || 0;
      const after = Number(paragraphProperties.after) / 20 || 0;
      const lineValue = Number(paragraphProperties.line) || 0;
      const lineRule = paragraphProperties.lineRule || 'auto';
      currentY -= before;

      let firstLine = true;
      const textLines = layout.lines.filter(line => !line.pageBreak);
      const lastTextLine = textLines[textLines.length - 1];
      for (const line of layout.lines) {
        if (line.pageBreak) {
          if (currentY < contentTop) startNewPage();
          firstLine = true;
          continue;
        }
        const lineFragments = line.fragments || [];
        const maxFontSize = lineFragments.reduce((max, fragment) => Math.max(max, fragment.style.fontSize), defaultFontSize);
        const lineHeight = !lineValue
          ? maxFontSize * 1.2
          : lineRule === 'auto'
            ? (lineValue / 240) * maxFontSize
            : lineRule === 'atLeast'
              ? Math.max(maxFontSize * 1.2, lineValue / 20)
              : lineValue / 20;
        if (currentY - lineHeight < contentBottom) {
          startNewPage();
          firstLine = true;
        }
        const paragraphOffset = leftIndent + (firstLine ? firstLineIndent : 0);
        const lineWidth = line.width || 0;
        const alignment = paragraph.alignment;
        const isJustified = ['both', 'distribute', 'thaiDistribute'].includes(alignment) &&
          line !== lastTextLine;
        const spaceCount = isJustified
          ? lineFragments.reduce((count, fragment) => count + (fragment.text.match(/ /g) || []).length, 0)
          : 0;
        const extraSpace = spaceCount > 0 ? Math.max(0, availableWidth - paragraphOffset - lineWidth) / spaceCount : 0;
        let x = marginLeft + paragraphOffset;
        if (alignment === 'center') {
          x += Math.max(0, (availableWidth - paragraphOffset - lineWidth) / 2);
        } else if (alignment === 'right' || alignment === 'end') {
          x += Math.max(0, availableWidth - paragraphOffset - lineWidth);
        }

        for (const fragment of lineFragments) {
          const fragmentWidth = fragment.style.font.widthOfTextAtSize(fragment.text, fragment.style.fontSize);
          currentPage.drawText(fragment.text, {
            x,
            y: currentY,
            size: fragment.style.fontSize,
            font: fragment.style.font,
            color: fragment.style.color
          });
          if (fragment.style.underline) {
            currentPage.drawLine({
              start: { x, y: currentY - 1 },
              end: { x: x + fragmentWidth, y: currentY - 1 },
              thickness: 0.5,
              color: fragment.style.color
            });
          }
          const spaces = (fragment.text.match(/ /g) || []).length;
          x += fragmentWidth + spaces * extraSpace;
        }
        currentY -= lineHeight;
        firstLine = false;
      }
      currentY -= after;
    }

    async function layoutTableCell(cell, paragraphMaxWidth) {
      const paragraphLayouts = [];
      let totalHeight = 0;
      for (const paragraph of cell.paragraphs) {
        const leftIndent = Number(paragraph.indentation.left) / 20 || 0;
        const rightIndent = Number(paragraph.indentation.right) / 20 || 0;
        const firstLineIndent = Number(paragraph.indentation.firstLine) / 20 ||
          (paragraph.indentation.hanging ? -(Number(paragraph.indentation.hanging) / 20) : 0);
        const availableWidth = Math.max(12, paragraphMaxWidth - leftIndent - rightIndent);
        const maxLineWidth = Math.max(12, availableWidth - Math.max(0, firstLineIndent));
        const layout = { lines: [], currentLine: [], currentWidth: 0 };
        for (const fragment of paragraph.fragments) {
          if (fragment.pageBreak) {
            layout.lines.push({ pageBreak: true });
            continue;
          }
          const style = await getRunStyle(fragment, paragraph.paragraphStyleId);
          appendTextToLayout(makeWinAnsiSafe(fragment.text, style.font), style, maxLineWidth, layout);
        }
        if (layout.currentLine.length || layout.lines.length === 0) {
          layout.lines.push({ fragments: layout.currentLine, width: layout.currentWidth });
        }
        const spacing = paragraph.spacing;
        const lineValue = Number(spacing.line) || 0;
        const lineRule = spacing.lineRule || 'auto';
        const before = Number(spacing.before) / 20 || 0;
        const after = Number(spacing.after) / 20 || 0;
        const lines = layout.lines.map(line => {
          if (line.pageBreak) return line;
          const fontSize = line.fragments.reduce((max, fragment) => Math.max(max, fragment.style.fontSize), defaultFontSize);
          const lineHeight = !lineValue
            ? fontSize * 1.2
            : lineRule === 'auto'
              ? (lineValue / 240) * fontSize
              : lineRule === 'atLeast'
                ? Math.max(fontSize * 1.2, lineValue / 20)
                : lineValue / 20;
          return { ...line, height: lineHeight };
        });
        totalHeight += before + after + lines.reduce((height, line) => height + (line.height || 0), 0);
        paragraphLayouts.push({ paragraph, lines, before, after, leftIndent, firstLineIndent });
      }
      return { paragraphLayouts, height: totalHeight };
    }

    function getCellMargin(cell, side, defaultMargins) {
      const cellValue = getWordAttributes(getWordChild(cell.margins, side));
      const tableValue = getWordAttributes(getWordChild(defaultMargins, side));
      const value = cellValue?.w ?? tableValue?.w;
      return value === undefined ? 4.5 : Math.max(0, Number(value) / 20);
    }

    function getBorderStyle(cell, side, tableBorders) {
      const border = getWordChild(cell.borders, side) || getWordChild(tableBorders, side);
      if (!border || ['nil', 'none'].includes(getWordValue(border))) {
        return { width: 0, color: rgb(0, 0, 0) };
      }
      const colorValue = getWordAttributes(border)?.color;
      const color = colorValue && /^[0-9a-f]{6}$/i.test(colorValue)
        ? rgb(
          parseInt(colorValue.slice(0, 2), 16) / 255,
          parseInt(colorValue.slice(2, 4), 16) / 255,
          parseInt(colorValue.slice(4, 6), 16) / 255
        )
        : rgb(0.55, 0.55, 0.55);
      const size = Number(getWordValue(getWordChild(border, 'sz'))) / 8;
      return { width: size > 0 ? Math.max(0.35, size) : 0.6, color };
    }

    async function renderTable(table) {
      const tableIndent = Number(table.indentation?.w) / 20 || 0;
      const usableWidth = Math.max(48, pageWidth - marginLeft - marginRight - tableIndent);
      const maxColumns = Math.max(
        table.gridWidths.length,
        ...table.rows.map(row => row.cells.reduce((count, cell) => count + cell.span, 0)),
        1
      );
      let columnWidths = table.gridWidths.slice(0, maxColumns).map(width => width / 20);
      if (columnWidths.length !== maxColumns || columnWidths.some(width => width <= 0)) {
        columnWidths = Array(maxColumns).fill(usableWidth / maxColumns);
      } else {
        const gridWidth = columnWidths.reduce((sum, width) => sum + width, 0);
        const tableWidth = table.width?.type === 'pct'
          ? usableWidth * (Number(table.width.w) / 5000)
          : table.width?.w && table.width.type !== 'auto'
            ? Number(table.width.w) / 20
            : gridWidth;
        const targetWidth = Math.min(usableWidth, tableWidth);
        columnWidths = columnWidths.map(width => width * targetWidth / gridWidth);
      }

      for (const row of table.rows) {
        const cells = [];
        let column = 0;
        for (const cell of row.cells) {
          const span = Math.max(1, Math.min(cell.span, maxColumns - column));
          const width = columnWidths.slice(column, column + span).reduce((sum, value) => sum + value, 0);
          const left = marginLeft + tableIndent + columnWidths.slice(0, column).reduce((sum, value) => sum + value, 0);
          const paddingLeft = getCellMargin(cell, 'left', table.cellMargins);
          const paddingRight = getCellMargin(cell, 'right', table.cellMargins);
          const paddingTop = getCellMargin(cell, 'top', table.cellMargins);
          const paddingBottom = getCellMargin(cell, 'bottom', table.cellMargins);
          const layout = await layoutTableCell(cell, Math.max(12, width - paddingLeft - paddingRight));
          cells.push({
            ...cell,
            left,
            width,
            paddingLeft,
            paddingRight,
            paddingTop,
            paddingBottom,
            layout
          });
          column += span;
        }

        const rowHeight = Math.max(
          18,
          ...cells.map(cell => cell.layout.height + cell.paddingTop + cell.paddingBottom)
        );
        if (!currentPage) await ensurePage();
        if (currentY - rowHeight < contentBottom && currentY < contentTop) startNewPage();
        const rowTop = currentY;
        const rowBottom = rowTop - rowHeight;

        for (const cell of cells) {
          const shading = cell.shading?.fill;
          if (shading && !['auto', 'clear'].includes(shading.toLowerCase()) && /^[0-9a-f]{6}$/i.test(shading)) {
            currentPage.drawRectangle({
              x: cell.left,
              y: rowBottom,
              width: cell.width,
              height: rowHeight,
              color: rgb(
                parseInt(shading.slice(0, 2), 16) / 255,
                parseInt(shading.slice(2, 4), 16) / 255,
                parseInt(shading.slice(4, 6), 16) / 255
              )
            });
          }

          let cellY = rowTop - cell.paddingTop;
          if (cell.verticalAlignment === 'center') {
            cellY -= Math.max(0, rowHeight - cell.layout.height - cell.paddingTop - cell.paddingBottom) / 2;
          } else if (cell.verticalAlignment === 'bottom') {
            cellY -= Math.max(0, rowHeight - cell.layout.height - cell.paddingTop - cell.paddingBottom);
          }

          for (const paragraphLayout of cell.layout.paragraphLayouts) {
            const paragraph = paragraphLayout.paragraph;
            cellY -= paragraphLayout.before;
            let firstLine = true;
            for (const line of paragraphLayout.lines) {
              if (line.pageBreak) continue;
              const fragments = line.fragments;
              const paragraphOffset = paragraphLayout.leftIndent +
                (firstLine ? paragraphLayout.firstLineIndent : 0);
              let x = cell.left + cell.paddingLeft + paragraphOffset;
              const alignment = paragraph.alignment;
              const lineWidth = line.width || 0;
              if (alignment === 'center') {
                x += Math.max(0, (cell.width - cell.paddingLeft - cell.paddingRight - paragraphOffset - lineWidth) / 2);
              } else if (alignment === 'right' || alignment === 'end') {
                x += Math.max(0, cell.width - cell.paddingLeft - cell.paddingRight - paragraphOffset - lineWidth);
              }

              cellY -= line.height;
              for (const fragment of fragments) {
                const fragmentWidth = fragment.style.font.widthOfTextAtSize(fragment.text, fragment.style.fontSize);
                currentPage.drawText(fragment.text, {
                  x,
                  y: cellY,
                  size: fragment.style.fontSize,
                  font: fragment.style.font,
                  color: fragment.style.color
                });
                if (fragment.style.underline) {
                  currentPage.drawLine({
                    start: { x, y: cellY - 1 },
                    end: { x: x + fragmentWidth, y: cellY - 1 },
                    thickness: 0.5,
                    color: fragment.style.color
                  });
                }
                x += fragmentWidth;
              }
              firstLine = false;
            }
            cellY -= paragraphLayout.after;
          }

          for (const side of ['top', 'bottom', 'left', 'right']) {
            const border = getBorderStyle(cell, side, table.borders);
            if (border.width === 0) continue;
            const start = side === 'top'
              ? { x: cell.left, y: rowTop }
              : side === 'bottom'
                ? { x: cell.left, y: rowBottom }
                : side === 'left'
                  ? { x: cell.left, y: rowBottom }
                  : { x: cell.left + cell.width, y: rowBottom };
            const end = side === 'top'
              ? { x: cell.left + cell.width, y: rowTop }
              : side === 'bottom'
                ? { x: cell.left + cell.width, y: rowBottom }
                : side === 'left'
                  ? { x: cell.left, y: rowTop }
                  : { x: cell.left + cell.width, y: rowTop };
            currentPage.drawLine({ start, end, thickness: border.width, color: border.color });
          }
        }
        currentY = rowBottom;
      }
      currentY -= 6;
    }

    for (const block of documentBlocks) {
      if (block.type === 'table') {
        await renderTable(block.table);
      } else {
        await renderParagraph(block.paragraph);
      }
    }

    for (const [index, page] of pdfDoc.getPages().entries()) {
      pageNumber = index + 1;
      addFooterLink(page);
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  },

  /**
   * 3. UNIR PDF (Merge)
   */
  async mergePdfs(buffersList, options = {}) {
    checkLibsLoaded(['PDFLib']);
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
    checkLibsLoaded(['PDFLib']);
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
    checkLibsLoaded(['JSZip']);
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
    checkLibsLoaded(['pdfjsLib', 'XLSX']);
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
    checkLibsLoaded(['PDFLib', 'XLSX']);
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
    checkLibsLoaded(['pdfjsLib', 'PptxGenJS']);
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
    checkLibsLoaded(['PDFLib', 'JSZip']);
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
    checkLibsLoaded(['PDFLib']);
    const { PDFDocument } = PDFLib;
    const pdfDoc = await PDFDocument.create();

    for (const img of imagesList) {
      let buffer = img.buffer;
      let imageType = getImageType(buffer);
      if (!imageType) {
        const extension = img.name.split('.').pop().toLowerCase();
        const declaredType = (img.type || '').toLowerCase();
        if (extension === 'webp' || declaredType === 'image/webp') {
          imageType = 'webp';
        } else {
          throw new Error(`"${img.name}" no contiene una imagen JPEG, PNG o WebP válida. Comprueba que el archivo no esté dañado o que su extensión coincida con su contenido.`);
        }
      }

      if (imageType === 'webp') {
        buffer = await convertWebpToPng(buffer, img.name);
        imageType = 'png';
      }

      const embeddedImg = imageType === 'png'
        ? await pdfDoc.embedPng(buffer)
        : await pdfDoc.embedJpg(buffer);
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
    checkLibsLoaded(['pdfjsLib', 'JSZip']);
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
    checkLibsLoaded(['PDFLib']);
    const { PDFDocument } = PDFLib;
    const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const compressedBytes = await doc.save({ useObjectStreams: true });
    return new Blob([compressedBytes], { type: 'application/pdf' });
  },

  /**
   * 12. ROTAR PÁGINAS DE PDF
   */
  async rotatePdf(arrayBuffer, degreesAngle = 90) {
    checkLibsLoaded(['PDFLib']);
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
    checkLibsLoaded(['PDFLib']);
    const { PDFDocument, rgb, degrees, StandardFonts } = PDFLib;
    const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const pages = doc.getPages();

    const opacity = options.opacity ? Number(options.opacity) : 0.15;
    const size = options.size ? Number(options.size) : 24;
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
    checkLibsLoaded(['pdfjsLib']);
    const { numPages, fullText } = await this.extractPdfTextAndPages(arrayBuffer);
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    return { blob, text: fullText, numPages };
  }
};

window.ClientConverter = ClientConverter;
