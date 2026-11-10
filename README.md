# ConversorG - Conversor de PDF y Gestor de Documentos

**ConversorG** es una aplicación profesional, ultrarrápida, elegante y 100% local desarrollada por **Estiven Garces** (`estivenabreo@gmail.com`). Permite convertir, unir, dividir, proteger, optimizar y visualizar documentos PDF, Word, Excel, PowerPoint e Imágenes directamente en tu PC Windows y en cualquier celular Android conectado a la misma red WiFi, sin depender de servidores externos ni subir archivos privados a internet.

---

## 🌟 Creador y Créditos
- **Aplicación:** ConversorG PRO
- **Autor / Desarrollador:** Estiven Garces
- **Contacto / Soporte:** estivenabreo@gmail.com
- **Sello / Marca de Agua:** `ConversorG`
- **Plataformas:** PC Windows (.EXE nativo, .BAT, .VBS) y Android (PWA / Web Local WiFi)

---

## 🚀 Funcionalidades Principales

### 📄 Conversores PDF y Office
1. **Convertir PDF a Word (.docx):** Extrae texto, párrafos y estructura de documentos PDF generando un archivo DOCX editable.
2. **Convertir Word (.docx) a PDF:** Convierte documentos de Microsoft Word a PDF con paginación, estilo limpio y pie de página.
3. **Unir PDF (Merge):** Fusiona dos o más documentos PDF en un solo archivo en el orden que desees.
4. **Dividir PDF (Split):** Extrae rangos específicos (ejemplo: `1-3, 5, 8`) o divide cada página en archivos individuales dentro de un ZIP.
5. **PDF a Excel (.xlsx):** Detecta tablas, columnas y datos numéricos en el PDF y genera una hoja de cálculo Excel lista para trabajar.
6. **Excel (.xlsx, .xls, .csv) a PDF:** Convierte libros y tablas de Excel en un PDF con diseño tabular profesional, cabeceras estilizadas y filas cebra.
7. **PDF a PowerPoint (.pptx):** Convierte el PDF en una presentación PowerPoint 16:9 con diapositiva de portada y secciones organizadas.
8. **PowerPoint (.pptx) a PDF:** Transforma presentaciones de diapositivas PPTX en un documento PDF listo para imprimir o compartir.

### 🖼️ Conversores de Imagen
9. **JPG / Fotos a PDF:** Convierte fotos e imágenes (JPG, PNG, WebP) a PDF con opciones de ajuste al tamaño de imagen o página A4 con márgenes.
10. **PDF a JPG (ZIP):** Exporta cada página de tu PDF como imagen individual de alta resolución empaquetadas en un archivo comprimido ZIP.

### 🛠️ Herramientas Avanzadas Añadidas (Mejoras y Optimización)
11. **Comprimir PDF:** Optimiza la estructura interna y reduce los megabytes del archivo PDF para enviarlo fácilmente por WhatsApp o correo.
12. **Rotar Páginas de PDF:** Gira páginas a 90°, 180° o 270° en caso de escaneos invertidos.
13. **Marca de Agua Personalizada ("ConversorG"):** Aplica una marca de agua diagonal semi-transparente personalizable en todas las páginas para proteger tus documentos.
14. **Extraer Texto Plano:** Extrae todo el contenido de texto limpio a archivo `.txt` y permite copiarlo directo al portapapeles.
15. **Historial de Actividad Persistente:** Registra cada conversión con fecha, hora, tamaño original, tamaño final, porcentaje de ahorro y acciones inmediatas.
16. **Visualizador Integrado (File Previewer):** Abre y previsualiza archivos PDF, texto e imágenes directamente en la aplicación sin necesidad de programas externos.

---

## 📱 Cómo Funciona en PC Windows y en Celular Android (WiFi Local)

La aplicación corre **localmente** en tu red:

### 1. En PC Windows
Tienes 3 formas sencillas de abrirla:
- **`ConversorG.exe`**: Ejecutable nativo Windows compilado en C#. Haz doble clic y abrirá automáticamente la aplicación en tu navegador web predeterminado.
- **`ConversorG.bat`**: Lanzador por consola que muestra el banner oficial, la URL y el código QR interactivo en el terminal.
- **`ConversorG.vbs`**: Lanzador silencioso en segundo plano con un solo clic.

### 2. En Celular Android (mediante WiFi)
1. Asegúrate de que el celular esté conectado a la **misma red WiFi** que tu PC.
2. Al iniciar la aplicación en tu PC, haz clic en el botón superior **"Celular WiFi"** o revisa la consola de `ConversorG.bat`.
3. Aparecerá un **código QR** y una dirección IP local (por ejemplo `http://192.168.1.40:3000`).
4. Abre la cámara de tu celular Android o lector de QR y escanea el código.
5. ¡Listo! La interfaz se adaptará automáticamente a tu teléfono con diseño móvil responsive.
6. En Google Chrome para Android, toca el menú de 3 puntos y presiona **"Agregar a la pantalla principal"** para instalarla como una App nativa (PWA).

---

## 🛠️ Estructura del Proyecto

```
Conversor PDF/
├── ConversorG.exe           # Ejecutable Windows nativo (.NET / C#)
├── ConversorG.bat           # Lanzador rápido en terminal con QR ASCII
├── ConversorG.vbs           # Lanzador silencioso Windows
├── server.js                # Servidor HTTP local y API REST de conversión
├── package.json             # Dependencias y configuración
├── services/
│   ├── converter.js         # Motor con las 14 funciones de conversión
│   └── history.js           # Gestor del historial persistente
├── public/                  # Interfaz web moderna (PWA)
│   ├── index.html           # Página principal responsive
│   ├── manifest.json        # Manifiesto PWA para Android
│   ├── sw.js                # Service Worker para caché rápida
│   ├── css/
│   │   └── style.css        # Diseño elegante con tema oscuro y claro
│   ├── js/
│   │   └── app.js           # Lógica frontend, Drag & Drop y visor
│   └── assets/              # Logo, iconos y recursos visuales
├── converted/               # Carpeta de salida de archivos convertidos
├── uploads/                 # Carpeta temporal
└── test_conversions.js      # Suite de pruebas automatizadas
```

---

## 🧪 Pruebas Automatizadas
Para verificar que todas las funciones de conversión operan al 100%:
```powershell
node test_conversions.js
```
Todas las 14 funciones han sido probadas y verificadas con éxito.
