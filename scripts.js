// Configuración
const CONFIG = {
    id: 'APP-2025-11-OAF001',
    version: '1.0.0',
    fecha: '2025-11-27',
    autor: 'Andry Sanabria Mata',
    fechaExpiracion: null
};

// Estado de la aplicación
let archivosSeleccionados = [];
let archivosRenombrados = [];
let estaProcesando = false;

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', inicializar);

function inicializar() {
    log('🚀 Aplicación iniciada', 'header');
    log(`📋 ID: ${CONFIG.id} | Versión: ${CONFIG.version}`, 'info');
    
    // Configurar event listeners
    document.getElementById('btnSelectFiles').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    
    document.getElementById('fileInput').addEventListener('change', manejarSeleccionArchivos);
    document.getElementById('btnPreview').addEventListener('click', mostrarVistaPrevia);
    document.getElementById('btnProcess').addEventListener('click', procesarArchivos);
    document.getElementById('btnDownloadAll').addEventListener('click', descargarTodos);
    document.getElementById('btnClearLog').addEventListener('click', limpiarLog);
    
    // Botones de exportación
    document.getElementById('btnExportJSON').addEventListener('click', () => exportarJSON(archivosRenombrados));
    document.getElementById('btnExportCSV').addEventListener('click', () => exportarCSV(archivosRenombrados));
    document.getElementById('btnExportHTML').addEventListener('click', () => exportarHTML(archivosRenombrados));
    document.getElementById('btnExportXML').addEventListener('click', () => exportarXML(archivosRenombrados));
}

// ==================== MANEJO DE ARCHIVOS ====================
function manejarSeleccionArchivos(event) {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) {
        return;
    }
    
    archivosSeleccionados = files.map(file => ({
        file: file,
        nombreOriginal: file.name,
        nombreNuevo: '',
        extension: obtenerExtension(file.name),
        fechaModificacion: new Date(file.lastModified),
        tamanio: file.size,
        procesado: false
    }));
    
    actualizarContadorArchivos();
    habilitarBotones();
    
    log(`📁 ${files.length} archivo(s) seleccionado(s)`, 'success');
    log(`   Total: ${formatearTamanio(files.reduce((sum, f) => sum + f.size, 0))}`, 'info');
}

function actualizarContadorArchivos() {
    const countText = document.getElementById('fileCountText');
    const count = archivosSeleccionados.length;
    
    if (count === 0) {
        countText.textContent = 'No hay archivos seleccionados';
    } else {
        const totalSize = archivosSeleccionados.reduce((sum, a) => sum + a.tamanio, 0);
        countText.textContent = `${count} archivo(s) seleccionado(s) - ${formatearTamanio(totalSize)}`;
    }
}

function habilitarBotones() {
    const hayArchivos = archivosSeleccionados.length > 0;
    document.getElementById('btnPreview').disabled = !hayArchivos;
    document.getElementById('btnProcess').disabled = !hayArchivos;
}

// ==================== CONVERSIÓN DE NOMBRES ====================
function convertirASlug(texto, fecha = null) {
    // Convertir a minúsculas
    let slug = texto.toLowerCase();
    
    // Normalizar caracteres Unicode (eliminar acentos)
    slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Reemplazar espacios y caracteres especiales con guiones
    slug = slug.replace(/[^a-z0-9]+/g, '-');
    
    // Eliminar guiones al inicio y final
    slug = slug.replace(/^-+|-+$/g, '');
    
    // Reemplazar guiones múltiples con uno solo
    slug = slug.replace(/-+/g, '-');
    
    // Agregar fecha si se solicita
    if (fecha && document.getElementById('includeDate').checked) {
        const fechaStr = formatearFecha(fecha);
        slug = `${fechaStr}-${slug}`;
    }
    
    return slug;
}

function formatearFecha(fecha) {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

function obtenerExtension(nombreArchivo) {
    const partes = nombreArchivo.split('.');
    if (partes.length > 1) {
        return partes.pop().toLowerCase();
    }
    return 'sin_extension';
}

function obtenerNombreSinExtension(nombreArchivo) {
    const partes = nombreArchivo.split('.');
    if (partes.length > 1) {
        partes.pop();
    }
    return partes.join('.');
}

// ==================== VISTA PREVIA ====================
function mostrarVistaPrevia() {
    log('👁️ Generando vista previa...', 'header');
    
    const previewSection = document.getElementById('previewSection');
    const previewContainer = document.getElementById('previewContainer');
    previewContainer.innerHTML = '';
    
    // Generar nombres nuevos
    archivosSeleccionados.forEach(archivo => {
        const nombreSinExt = obtenerNombreSinExtension(archivo.nombreOriginal);
        const slug = convertirASlug(nombreSinExt, archivo.fechaModificacion);
        archivo.nombreNuevo = `${slug}.${archivo.extension}`;
    });
    
    // Verificar cambios
    const archivosConCambios = archivosSeleccionados.filter(a => a.nombreOriginal !== a.nombreNuevo);
    
    if (archivosConCambios.length === 0) {
        previewContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #6c757d;">✅ No hay cambios que realizar. Los nombres ya están en formato correcto.</p>';
        previewSection.style.display = 'block';
        log('✅ No hay cambios necesarios', 'success');
        return;
    }
    
    // Mostrar preview
    archivosConCambios.forEach((archivo, index) => {
        const item = document.createElement('div');
        item.className = 'preview-item';
        item.innerHTML = `
            <div class="original">❌ ${archivo.nombreOriginal}</div>
            <div class="arrow">   ↓</div>
            <div class="new">✅ ${archivo.nombreNuevo}</div>
        `;
        previewContainer.appendChild(item);
    });
    
    previewSection.style.display = 'block';
    
    log(`✅ Vista previa generada: ${archivosConCambios.length} archivo(s) con cambios`, 'success');
    
    // Scroll suave a la sección de preview
    previewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ==================== PROCESAMIENTO ====================
async function procesarArchivos() {
    if (estaProcesando) {
        return;
    }
    
    if (archivosSeleccionados.length === 0) {
        alert('⚠️ No hay archivos seleccionados');
        return;
    }
    
    // Confirmar acción
    if (!confirm(`¿Desea procesar ${archivosSeleccionados.length} archivo(s)?`)) {
        return;
    }
    
    estaProcesando = true;
    document.body.classList.add('processing');
    
    log('▶️ Iniciando procesamiento...', 'header');
    mostrarProgreso(true);
    
    // Generar nombres nuevos
    archivosSeleccionados.forEach(archivo => {
        const nombreSinExt = obtenerNombreSinExtension(archivo.nombreOriginal);
        const slug = convertirASlug(nombreSinExt, archivo.fechaModificacion);
        archivo.nombreNuevo = `${slug}.${archivo.extension}`;
    });
    
    const total = archivosSeleccionados.length;
    archivosRenombrados = [];
    
    for (let i = 0; i < archivosSeleccionados.length; i++) {
        const archivo = archivosSeleccionados[i];
        
        try {
            // Crear nuevo File con nombre modificado
            const nuevoFile = new File([archivo.file], archivo.nombreNuevo, {
                type: archivo.file.type,
                lastModified: archivo.file.lastModified
            });
            
            archivo.fileNuevo = nuevoFile;
            archivo.procesado = true;
            archivosRenombrados.push(archivo);
            
            actualizarProgreso((i + 1) / total * 100, `Procesado: ${i + 1}/${total} archivos`);
            
            if (archivo.nombreOriginal !== archivo.nombreNuevo) {
                log(`  ✓ ${archivo.nombreOriginal} → ${archivo.nombreNuevo}`, 'success');
            }
            
        } catch (error) {
            log(`  ⚠️ Error procesando ${archivo.nombreOriginal}: ${error.message}`, 'error');
        }
    }
    
    log(`✅ Procesamiento completado: ${archivosRenombrados.length}/${total} archivos`, 'success');
    
    // Habilitar botón de descarga
    document.getElementById('btnDownloadAll').disabled = false;
    
    estaProcesando = false;
    document.body.classList.remove('processing');
    
    // Organizar por extensión si está habilitado
    if (document.getElementById('organizeByExtension').checked) {
        mostrarOrganizacionPorExtension();
    }
}

function mostrarOrganizacionPorExtension() {
    const porExtension = {};
    
    archivosRenombrados.forEach(archivo => {
        if (!porExtension[archivo.extension]) {
            porExtension[archivo.extension] = [];
        }
        porExtension[archivo.extension].push(archivo);
    });
    
    log('', 'normal');
    log('📂 Organización por extensión:', 'header');
    
    Object.keys(porExtension).sort().forEach(ext => {
        const archivos = porExtension[ext];
        log(`   📁 ${ext}/ - ${archivos.length} archivo(s)`, 'info');
    });
}

// ==================== DESCARGA ====================
async function descargarTodos() {
    if (archivosRenombrados.length === 0) {
        alert('⚠️ No hay archivos procesados para descargar');
        return;
    }
    
    log('💾 Descargando archivos...', 'header');
    
    const organizarPorExt = document.getElementById('organizeByExtension').checked;
    
    if (organizarPorExt) {
        await descargarOrganizadoPorExtension();
    } else {
        await descargarTodosSueltos();
    }
    
    log('✅ Descarga completada', 'success');
}

async function descargarTodosSueltos() {
    for (let i = 0; i < archivosRenombrados.length; i++) {
        const archivo = archivosRenombrados[i];
        descargarArchivo(archivo.fileNuevo || archivo.file, archivo.nombreNuevo);
        
        // Pequeña pausa para no saturar el navegador
        if (i < archivosRenombrados.length - 1) {
            await esperar(100);
        }
    }
}

async function descargarOrganizadoPorExtension() {
    // Verificar si JSZip está disponible
    if (typeof JSZip === 'undefined') {
        alert('⚠️ La función de organizar por carpetas requiere descargas individuales.\nSe descargarán los archivos uno por uno.');
        await descargarTodosSueltos();
        return;
    }
    
    const zip = new JSZip();
    const porExtension = {};
    
    // Agrupar por extensión
    archivosRenombrados.forEach(archivo => {
        if (!porExtension[archivo.extension]) {
            porExtension[archivo.extension] = [];
        }
        porExtension[archivo.extension].push(archivo);
    });
    
    // Agregar archivos al ZIP organizados por carpetas
    for (const ext in porExtension) {
        const folder = zip.folder(ext);
        for (const archivo of porExtension[ext]) {
            folder.file(archivo.nombreNuevo, archivo.fileNuevo || archivo.file);
        }
    }
    
    log('📦 Generando archivo ZIP...', 'info');
    
    // Generar y descargar ZIP
    const contenido = await zip.generateAsync({ type: 'blob' });
    const fecha = obtenerFechaHora();
    descargarArchivo(contenido, `archivos_organizados_${fecha}.zip`);
    
    log('✅ ZIP generado y descargado', 'success');
}

function descargarArchivo(blob, nombreArchivo) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    link.click();
    URL.revokeObjectURL(url);
}

function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== PROGRESO ====================
function mostrarProgreso(mostrar) {
    document.getElementById('progressSection').style.display = mostrar ? 'block' : 'none';
    if (!mostrar) {
        actualizarProgreso(0, 'Listo para procesar');
    }
}

function actualizarProgreso(porcentaje, mensaje) {
    const fill = document.getElementById('progressBarFill');
    const text = document.getElementById('progressText');
    
    fill.style.width = `${porcentaje}%`;
    text.textContent = mensaje;
}

// ==================== LOG ====================
function log(mensaje, tipo = 'normal') {
    const logArea = document.getElementById('logArea');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${tipo}`;
    entry.textContent = mensaje;
    logArea.appendChild(entry);
    logArea.scrollTop = logArea.scrollHeight;
}

function limpiarLog() {
    document.getElementById('logArea').innerHTML = '';
    log('🗑️ Log limpiado', 'info');
}

// ==================== EXPORTACIÓN ====================
function exportarJSON(datos, nombreArchivo = null) {
    if (!datos || datos.length === 0) {
        alert('No hay datos para exportar');
        return;
    }
    
    const datosExportar = datos.map(a => ({
        nombreOriginal: a.nombreOriginal,
        nombreNuevo: a.nombreNuevo,
        extension: a.extension,
        fechaModificacion: a.fechaModificacion.toISOString(),
        tamanio: a.tamanio,
        procesado: a.procesado
    }));
    
    const json = JSON.stringify(datosExportar, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo || `archivos_${obtenerFechaHora()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    log('📄 Datos exportados a JSON', 'success');
}

function exportarCSV(datos, nombreArchivo = null) {
    if (!datos || datos.length === 0) {
        alert('No hay datos para exportar');
        return;
    }
    
    // Encabezados
    let csv = 'Nombre Original,Nombre Nuevo,Extensión,Fecha Modificación,Tamaño (bytes),Procesado\n';
    
    // Datos
    datos.forEach(a => {
        csv += `"${a.nombreOriginal}","${a.nombreNuevo}","${a.extension}","${a.fechaModificacion.toISOString()}",${a.tamanio},${a.procesado}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo || `archivos_${obtenerFechaHora()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    log('📊 Datos exportados a CSV', 'success');
}

function exportarHTML(datos, nombreArchivo = null) {
    if (!datos || datos.length === 0) {
        alert('No hay datos para exportar');
        return;
    }
    
    let html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Archivos Organizados</title>
    <style>
        body {
            font-family: system-ui, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        h1 {
            color: #007bff;
            border-bottom: 3px solid #007bff;
            padding-bottom: 10px;
        }
        .info {
            background: white;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-radius: 6px;
            overflow: hidden;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        th {
            background-color: #007bff;
            color: white;
            font-weight: 600;
        }
        tr:hover {
            background-color: #f8f9fa;
        }
        .procesado {
            color: #28a745;
            font-weight: bold;
        }
        .no-procesado {
            color: #dc3545;
        }
        .extension-badge {
            display: inline-block;
            padding: 2px 8px;
            background-color: #17a2b8;
            color: white;
            border-radius: 3px;
            font-size: 11px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h1>📁 Reporte de Archivos Organizados</h1>
    <div class="info">
        <p><strong>Fecha del reporte:</strong> ${new Date().toLocaleString('es-ES')}</p>
        <p><strong>Total de archivos:</strong> ${datos.length}</p>
        <p><strong>Archivos procesados:</strong> ${datos.filter(a => a.procesado).length}</p>
        <p><strong>Generado por:</strong> ${CONFIG.autor}</p>
        <p><strong>ID de aplicación:</strong> ${CONFIG.id}</p>
    </div>
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Nombre Original</th>
                <th>Nombre Nuevo</th>
                <th>Ext.</th>
                <th>Tamaño</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>`;
    
    datos.forEach((a, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${a.nombreOriginal}</td>
                <td>${a.nombreNuevo}</td>
                <td><span class="extension-badge">${a.extension}</span></td>
                <td>${formatearTamanio(a.tamanio)}</td>
                <td class="${a.procesado ? 'procesado' : 'no-procesado'}">${a.procesado ? '✓ Procesado' : '✗ Pendiente'}</td>
            </tr>`;
    });
    
    html += `
        </tbody>
    </table>
</body>
</html>`;
    
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo || `reporte_archivos_${obtenerFechaHora()}.html`;
    link.click();
    URL.revokeObjectURL(url);
    
    log('🌐 Reporte exportado a HTML', 'success');
}

function escaparXML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[<>&"']/g, function(match) {
        switch (match) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '"': return '&quot;';
            case "'": return '&apos;';
            default: return match;
        }
    });
}

function exportarXML(datos, nombreArchivo = null) {
    if (!datos || datos.length === 0) {
        alert('No hay datos para exportar');
        return;
    }
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<archivos>\n';
    
    datos.forEach(a => {
        xml += '  <archivo>\n';
        xml += `    <nombreOriginal>${escaparXML(a.nombreOriginal)}</nombreOriginal>\n`;
        xml += `    <nombreNuevo>${escaparXML(a.nombreNuevo)}</nombreNuevo>\n`;
        xml += `    <extension>${escaparXML(a.extension)}</extension>\n`;
        xml += `    <fechaModificacion>${escaparXML(a.fechaModificacion.toISOString())}</fechaModificacion>\n`;
        xml += `    <tamanio>${a.tamanio}</tamanio>\n`;
        xml += `    <procesado>${a.procesado}</procesado>\n`;
        xml += '  </archivo>\n';
    });
    
    xml += '</archivos>';
    
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo || `archivos_${obtenerFechaHora()}.xml`;
    link.click();
    URL.revokeObjectURL(url);
    
    log('📋 Datos exportados a XML', 'success');
}

// ==================== UTILIDADES ====================
function obtenerFechaHora() {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    return `${año}${mes}${dia}_${horas}${minutos}`;
}

function formatearTamanio(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
