// Configuración
const CONFIG = {
    id: 'APP-2025-11-RCE001',
    version: '1.0.0',
    fecha: '2025-11-14',
    autor: 'Andry Sanabria Mata',
    fechaExpiracion: null
};

// Estado de la aplicación
let archivosOriginales = []; // Archivos ZIP originales
let archivosProcesados = []; // Información procesada de cada archivo
let logEntradas = [];

// Inicialización
document.addEventListener('DOMContentLoaded', inicializar);

function inicializar() {
    console.log(`Iniciando ${CONFIG.id} v${CONFIG.version}`);
    document.getElementById('versionId').textContent = CONFIG.id;
    configurarDragDrop();
    agregarLog('Aplicación iniciada correctamente', 'info');
}

// Configurar Drag & Drop
function configurarDragDrop() {
    const zonaDrop = document.getElementById('zonaDrop');
    
    zonaDrop.addEventListener('dragover', (e) => {
        e.preventDefault();
        zonaDrop.classList.add('drag-over');
    });
    
    zonaDrop.addEventListener('dragleave', () => {
        zonaDrop.classList.remove('drag-over');
    });
    
    zonaDrop.addEventListener('drop', (e) => {
        e.preventDefault();
        zonaDrop.classList.remove('drag-over');
        const archivos = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.zip'));
        if (archivos.length > 0) {
            procesarArchivosSubidos(archivos);
        } else {
            agregarLog('No se encontraron archivos ZIP válidos', 'warning');
        }
    });
}

// Manejar archivos seleccionados desde el input
function manejarArchivosSeleccionados(event) {
    const archivos = Array.from(event.target.files);
    if (archivos.length > 0) {
        procesarArchivosSubidos(archivos);
    }
    event.target.value = ''; // Reset input
}

// Procesar archivos subidos
async function procesarArchivosSubidos(archivos) {
    agregarLog(`Procesando ${archivos.length} archivo(s) ZIP...`, 'info');
    
    archivosOriginales = archivos;
    archivosProcesados = [];
    
    for (const archivo of archivos) {
        agregarLog(`Analizando: ${archivo.name}`, 'info');
        const resultado = await extraerNumeroConsecutivo(archivo);
        archivosProcesados.push(resultado);
    }
    
    // Detectar duplicados
    detectarDuplicados();
    
    // Actualizar interfaz
    actualizarResumen();
    actualizarTabla();
    mostrarSecciones();
    
    agregarLog('Análisis completado', 'exito');
}

// Extraer NumeroConsecutivo del ZIP
async function extraerNumeroConsecutivo(archivo) {
    const resultado = {
        archivoOriginal: archivo,
        nombreOriginal: archivo.name,
        numeroConsecutivo: null,
        nuevoNombre: null,
        estado: 'error',
        mensaje: ''
    };
    
    try {
        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip no está disponible');
        }
        
        const zip = await JSZip.loadAsync(archivo);
        
        // Buscar archivos XML (excluyendo Respuesta)
        const archivosXML = Object.keys(zip.files).filter(
            nombre => nombre.endsWith('.xml') && !nombre.includes('Respuesta')
        );
        
        if (archivosXML.length === 0) {
            resultado.mensaje = 'No se encontró XML en el archivo';
            agregarLog(`⚠️ ${archivo.name}: No se encontró XML`, 'warning');
            return resultado;
        }
        
        // Leer el primer XML encontrado
        for (const nombreXML of archivosXML) {
            const contenidoXML = await zip.files[nombreXML].async('text');
            
            // Buscar NumeroConsecutivo usando regex (más robusto para namespaces)
            const regex = /<(?:\w+:)?NumeroConsecutivo>([^<]+)<\/(?:\w+:)?NumeroConsecutivo>/;
            const match = contenidoXML.match(regex);
            
            if (match && match[1]) {
                resultado.numeroConsecutivo = match[1].trim();
                resultado.nuevoNombre = `${resultado.numeroConsecutivo}.zip`;
                resultado.estado = 'ok';
                resultado.mensaje = 'Procesado correctamente';
                agregarLog(`✓ ${archivo.name} → ${resultado.nuevoNombre}`, 'exito');
                return resultado;
            }
        }
        
        resultado.mensaje = 'No se encontró NumeroConsecutivo en el XML';
        agregarLog(`⚠️ ${archivo.name}: No se encontró NumeroConsecutivo`, 'warning');
        
    } catch (error) {
        resultado.mensaje = `Error: ${error.message}`;
        agregarLog(`❌ ${archivo.name}: ${error.message}`, 'error');
    }
    
    return resultado;
}

// Detectar duplicados
function detectarDuplicados() {
    const conteoConsecutivos = {};
    
    // Contar ocurrencias de cada NumeroConsecutivo
    archivosProcesados.forEach(archivo => {
        if (archivo.numeroConsecutivo) {
            if (!conteoConsecutivos[archivo.numeroConsecutivo]) {
                conteoConsecutivos[archivo.numeroConsecutivo] = [];
            }
            conteoConsecutivos[archivo.numeroConsecutivo].push(archivo);
        }
    });
    
    // Marcar duplicados (conservar solo el primero)
    Object.keys(conteoConsecutivos).forEach(consecutivo => {
        const archivos = conteoConsecutivos[consecutivo];
        if (archivos.length > 1) {
            agregarLog(`⚠️ Duplicado detectado: ${consecutivo} (${archivos.length} archivos)`, 'warning');
            // El primero se mantiene como 'ok', los demás como 'duplicado'
            for (let i = 1; i < archivos.length; i++) {
                archivos[i].estado = 'duplicado';
                archivos[i].mensaje = `Duplicado de ${archivos[0].nombreOriginal}`;
            }
        }
    });
}

// Actualizar resumen de estadísticas
function actualizarResumen() {
    const total = archivosProcesados.length;
    const unicos = archivosProcesados.filter(a => a.estado === 'ok').length;
    const duplicados = archivosProcesados.filter(a => a.estado === 'duplicado').length;
    const errores = archivosProcesados.filter(a => a.estado === 'error').length;
    
    document.getElementById('totalArchivos').textContent = total;
    document.getElementById('archivosUnicos').textContent = unicos;
    document.getElementById('archivosDuplicados').textContent = duplicados;
    document.getElementById('archivosError').textContent = errores;
}

// Actualizar tabla de archivos
function actualizarTabla() {
    const tbody = document.getElementById('tablaBody');
    tbody.innerHTML = '';
    
    archivosProcesados.forEach(archivo => {
        const tr = document.createElement('tr');
        
        let estadoClase = 'estado-error';
        let estadoTexto = 'Error';
        
        if (archivo.estado === 'ok') {
            estadoClase = 'estado-ok';
            estadoTexto = 'OK';
        } else if (archivo.estado === 'duplicado') {
            estadoClase = 'estado-duplicado';
            estadoTexto = 'Duplicado';
        }
        
        tr.innerHTML = `
            <td>${archivo.nombreOriginal}</td>
            <td>${archivo.numeroConsecutivo || 'N/A'}</td>
            <td>${archivo.nuevoNombre || 'N/A'}</td>
            <td><span class="estado ${estadoClase}">${estadoTexto}</span></td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Mostrar secciones ocultas
function mostrarSecciones() {
    document.getElementById('seccionResumen').style.display = 'block';
    document.getElementById('seccionTabla').style.display = 'block';
    document.getElementById('seccionAcciones').style.display = 'flex';
    document.getElementById('seccionLog').style.display = 'block';
}

// Procesar y descargar archivos
async function procesarYDescargar() {
    const archivosADescargar = archivosProcesados.filter(a => a.estado === 'ok');
    
    if (archivosADescargar.length === 0) {
        alert('No hay archivos válidos para descargar');
        return;
    }
    
    agregarLog(`Generando ZIP con ${archivosADescargar.length} archivo(s)...`, 'info');
    
    try {
        const zipFinal = new JSZip();
        
        for (const archivo of archivosADescargar) {
            const contenido = await archivo.archivoOriginal.arrayBuffer();
            zipFinal.file(archivo.nuevoNombre, contenido);
            agregarLog(`Añadido: ${archivo.nuevoNombre}`, 'info');
        }
        
        const contenidoZip = await zipFinal.generateAsync({ 
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });
        
        // Descargar usando método alternativo para evitar bloqueo de Windows
        const url = URL.createObjectURL(contenidoZip);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Comprobantes.zip`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        // Limpiar después de un momento
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
        
        agregarLog(`✓ ZIP descargado: ${link.download}`, 'exito');
        agregarLog(`Archivos procesados: ${archivosADescargar.length}`, 'exito');
        agregarLog(`Duplicados eliminados: ${archivosProcesados.filter(a => a.estado === 'duplicado').length}`, 'info');
        
    } catch (error) {
        agregarLog(`❌ Error al generar ZIP: ${error.message}`, 'error');
        alert('Error al generar el archivo ZIP');
    }
}

// Exportar reporte JSON
function exportarReporteJSON() {
    const reporte = {
        fecha: new Date().toISOString(),
        version: CONFIG.id,
        resumen: {
            total: archivosProcesados.length,
            unicos: archivosProcesados.filter(a => a.estado === 'ok').length,
            duplicados: archivosProcesados.filter(a => a.estado === 'duplicado').length,
            errores: archivosProcesados.filter(a => a.estado === 'error').length
        },
        archivos: archivosProcesados.map(a => ({
            nombreOriginal: a.nombreOriginal,
            numeroConsecutivo: a.numeroConsecutivo,
            nuevoNombre: a.nuevoNombre,
            estado: a.estado,
            mensaje: a.mensaje
        })),
        log: logEntradas
    };
    
    const blob = new Blob([JSON.stringify(reporte, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Comprobantes.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    agregarLog('Reporte JSON exportado', 'exito');
}

// Exportar reporte CSV
function exportarReporteCSV() {
    let csv = 'Archivo Original,NumeroConsecutivo,Nuevo Nombre,Estado,Mensaje\n';
    
    archivosProcesados.forEach(archivo => {
        csv += `"${archivo.nombreOriginal}","${archivo.numeroConsecutivo || ''}","${archivo.nuevoNombre || ''}","${archivo.estado}","${archivo.mensaje}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Comprobantes.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    agregarLog('Reporte CSV exportado', 'exito');
}

// Limpiar todo
function limpiarTodo() {
    if (!confirm('¿Está seguro de limpiar todos los archivos cargados?')) {
        return;
    }
    
    archivosOriginales = [];
    archivosProcesados = [];
    logEntradas = [];
    
    document.getElementById('tablaBody').innerHTML = '';
    document.getElementById('logContenedor').innerHTML = '';
    document.getElementById('seccionResumen').style.display = 'none';
    document.getElementById('seccionTabla').style.display = 'none';
    document.getElementById('seccionAcciones').style.display = 'none';
    document.getElementById('seccionLog').style.display = 'none';
    
    agregarLog('Aplicación reiniciada', 'info');
    document.getElementById('seccionLog').style.display = 'block';
}

// Agregar entrada al log
function agregarLog(mensaje, tipo = 'info') {
    const ahora = new Date();
    const tiempo = ahora.toLocaleTimeString('es-CR');
    
    const entrada = {
        tiempo: tiempo,
        mensaje: mensaje,
        tipo: tipo
    };
    
    logEntradas.push(entrada);
    
    const logContenedor = document.getElementById('logContenedor');
    const entradaHTML = document.createElement('div');
    entradaHTML.className = 'log-entrada';
    entradaHTML.innerHTML = `<span class="log-tiempo">[${tiempo}]</span> <span class="log-${tipo}">${mensaje}</span>`;
    logContenedor.appendChild(entradaHTML);
    
    // Auto-scroll al final
    logContenedor.scrollTop = logContenedor.scrollHeight;
}

