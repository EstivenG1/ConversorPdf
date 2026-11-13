# ConversorG - Conversor de PDF y Gestor de Documentos

**ConversorG** es una suite profesional, elegante, ultrarrápida y 100% local desarrollada por **Estiven Garces**. Diseñada con una estética distinguida basada en **tonos hueso e ivory cálido, acentos en amarillo claro/oro champán y el icónico verde Rolex**, adaptable tanto a **Modo Claro** como a **Modo Oscuro**.

Permite convertir, unir, dividir, proteger, optimizar y visualizar documentos PDF, Word, Excel, PowerPoint e Imágenes directamente en tu PC Windows a través de un **archivo ejecutable nativo (.exe)** y en cualquier celular Android conectado a la misma red WiFi, con absoluta privacidad y sin subir archivos a la nube.

---

## 🌟 Identidad y Créditos
- **Aplicación:** ConversorG PRO
- **Autor / Desarrollador:** Estiven Garces
- **Contacto / Soporte:** estivenabreo@gmail.com
- **Sello / Marca de Agua:** `ConversorG`
- **Gama Visual:** Tonos cálidos tipo hueso, amarillo claro / oro champán y verde Rolex.
- **Plataformas:** PC Windows (.EXE nativo, .BAT, .VBS) y Android (PWA / Web Local WiFi).

---

## 💻 El Ejecutable Windows (`ConversorG.exe`): ¿Cómo funciona y cómo iniciarlo?

Para la máxima comodidad en entornos Windows, la aplicación incluye un archivo ejecutable compilado nativamente en C# (.NET): **`ConversorG.exe`**.

### ¿Cómo iniciarlo?
1. **Doble clic sobre `ConversorG.exe`:**
   - No necesitas abrir consolas ni escribir comandos.
   - El ejecutable comprueba si el servicio local ya está activo; si no lo está, lo inicia silenciosamente en segundo plano sin mostrar ventanas negras de terminal.
   - Espera una fracción de segundo a que el puerto local (`3000`) esté listo y abre automáticamente tu navegador web predeterminado en `http://localhost:3000`.
2. **Métodos alternativos incluidos:**
   - **`ConversorG.bat`:** Ideal si deseas ver el banner de bienvenida oficial, la dirección IP local de tu red y el **código QR interactivo** directamente dibujado en la consola para escanearlo con el móvil.
   - **`ConversorG.vbs`:** Script visual silencioso que ejecuta el servidor y abre el navegador sin interacción de teclado.

---

## 📱 Conexión Móvil en Celulares Android (Red WiFi Local)

La app permite procesar archivos desde el móvil usando el poder de procesamiento de tu PC mediante WiFi:

1. Conecta tu celular a la **misma red WiFi** que tu computadora.
2. Inicia la aplicación en tu PC mediante **`ConversorG.exe`** o **`ConversorG.bat`**.
3. En la barra superior de la app, pulsa el botón **"Celular WiFi"** (o mira la consola de `ConversorG.bat`).
4. Se desplegará un **código QR** junto con la dirección local (por ejemplo: `http://192.168.1.40:3000`).
5. Abre la cámara de tu celular Android o cualquier lector de códigos QR y escanea el código en pantalla.
6. La aplicación cargará al instante con su interfaz responsive adaptada a pantallas táctiles.
7. **Instalación como App Nativa (PWA):** En Google Chrome para Android, abre el menú de tres puntos (`⋮`) y presiona **"Agregar a la pantalla principal"** o **"Instalar aplicación"**. ConversorG se instalará con su propio icono en el cajón de aplicaciones de tu celular.
8. El enlace del QR debe usar la dirección Wi-Fi/LAN del PC (por ejemplo, `http://192.168.1.40:3000`), nunca `localhost` ni `127.0.0.1`. Si el celular no conecta, comprueba que ambos dispositivos estén en la misma red y permite Node.js en redes privadas cuando Windows Firewall lo solicite.

---

## 🌐 Publicación Gratuita en GitHub Pages (100% en el Navegador)

¡ConversorG ahora está adaptado con motor **Client-Side**! Esto significa que las 14 conversiones se procesan directamente en la memoria del navegador del usuario (PC o celular) sin necesidad de un servidor Node.js activo, permitiéndote alojarlo **100% gratis en GitHub Pages**:

### Pasos para Activar GitHub Pages en tu Repositorio:
1. **Sube tus cambios a GitHub:**
   ```bash
   git push origin main
   ```
2. Entra a tu repositorio en GitHub: [https://github.com/EstivenG1/ConversorPdf](https://github.com/EstivenG1/ConversorPdf)
3. Ve a la pestaña **Settings** (Configuración) arriba a la derecha.
4. En el menú lateral izquierdo, haz clic en **Pages**.
5. En la sección **Build and deployment**:
   - **Source:** *Deploy from a branch*
   - **Branch:** Selecciona **`main`** y la carpeta **`/(root)`**.
   - Haz clic en **Save** (Guardar).
6. En 1 o 2 minutos, GitHub te entregará el enlace público mundial de tu aplicación (por ejemplo: `https://estiveng1.github.io/ConversorPdf/`).
7. ¡Cualquier persona desde cualquier PC o celular del mundo podrá entrar y convertir documentos al instante sin costo alguno!

---

## 🎨 Paleta de Colores y Experiencia Visual

Diseñada pensando en el confort visual, la calidez y el lujo sobrio:
- **Modo Claro (Predeterminado):**
  - **Fondo:** Tono hueso e ivory cálido (`#F7F4EB`), suave para la vista.
  - **Tarjetas y Superficies:** Blanco marfil pulido con sutiles bordes lino (`#E2D9C8`).
  - **Acentos Principales:** Verde Rolex oficial (`#006039`) y amarillo claro / oro champán (`#C5A059`, `#F4E8C1`).
  - **Tipografía:** Carbón profundo esmeralda (`#141E1A`), brindando un contraste óptimo y distinguido.
- **Modo Oscuro:**
  - **Fondo:** Obsidiana esmeralda profunda (`#08110D`).
  - **Tarjetas:** Cristal esmeralda nocturno con desenfoque glassmorphism.
  - **Acentos:** Verde Rolex de alto contraste (`#0A8B55`) y oro champán luminoso (`#DFBA73`).
  - **Tipografía:** Hueso puro brillante (`#F7F4EB`).
- **Selector de Tema:** Botón de un solo clic en la cabecera (icono de luna / sol) que memoriza tu preferencia automáticamente.

---

## 🚀 Catálogo de Funciones (14 Conversores y Herramientas)

### 📄 Conversores PDF y Microsoft Office
1. **Convertir PDF a Word (.docx):** Extrae texto, párrafos y estructura de documentos PDF generando un archivo DOCX editable.
2. **Convertir Word (.docx) a PDF:** Convierte documentos de Microsoft Word a PDF con paginación, estilo limpio y pie de página.
3. **Unir PDF (Merge):** Fusiona dos o más documentos PDF en un solo archivo en el orden deseado.
4. **Dividir PDF (Split):** Extrae rangos específicos (ejemplo: `1-3, 5, 8`) o divide cada página en archivos individuales dentro de un ZIP.
5. **PDF a Excel (.xlsx):** Detecta tablas, columnas y datos numéricos en el PDF y genera una hoja de cálculo Excel lista para trabajar.
6. **Excel (.xlsx, .xls, .csv) a PDF:** Convierte libros y tablas de Excel en un PDF con diseño tabular profesional, cabeceras estilizadas y filas cebra.
7. **PDF a PowerPoint (.pptx):** Convierte el PDF en una presentación PowerPoint 16:9 con diapositiva de portada y secciones organizadas.
8. **PowerPoint (.pptx) a PDF:** Transforma presentaciones de diapositivas PPTX en un documento PDF listo para compartir.

### 🖼️ Conversores de Imagen
9. **JPG / Fotos a PDF:** Convierte fotos e imágenes (JPG, PNG, WebP) a PDF con opciones de ajuste al tamaño de imagen o página A4 con márgenes.
10. **PDF a JPG (ZIP):** Exporta cada página de tu PDF como imagen individual de alta resolución empaquetadas en un archivo comprimido ZIP.

### 🛠️ Herramientas de Optimización y Edición
11. **Comprimir PDF:** Optimiza la estructura interna y reduce los megabytes del archivo PDF para compartirlo por WhatsApp o correo.
12. **Rotar Páginas de PDF:** Gira páginas a 90°, 180° o 270° en caso de escaneos invertidos.
13. **Marca de Agua Personalizada ("ConversorG"):** Aplica una marca de agua diagonal semi-transparente en todas las páginas para proteger los documentos.
14. **Extraer Texto Plano:** Extrae todo el contenido de texto limpio a archivo `.txt` y permite copiarlo directo al portapapeles.
15. **Historial de Actividad Persistente:** Registra cada conversión con fecha, hora, tamaño original, tamaño final, porcentaje de ahorro y acciones inmediatas.
16. **Visualizador Integrado (File Previewer):** Abre y previsualiza archivos PDF, texto e imágenes directamente en la aplicación sin necesidad de programas externos.

---

## 🛠️ Estructura del Proyecto

```
Conversor PDF/
├── ConversorG.exe           # Ejecutable Windows nativo (.NET / C#)
├── ConversorG.bat           # Lanzador por consola con banner y QR
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
│   │   └── style.css        # Estilos en tonos hueso, amarillo claro y verde Rolex
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

---

## 👤 Créditos y Enlaces del Creador

- **Desarrollador:** Estiven Garces
- **Correo Electrónico:** [estivenabreo@gmail.com](mailto:estivenabreo@gmail.com)
- **Perfil de GitHub Oficial:** [https://github.com/EstivenG1](https://github.com/EstivenG1)
