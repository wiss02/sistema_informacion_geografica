// ============================================================
// 1. CONFIGURACIÓN DE LA API
// ============================================================
const API_BASE = "http://138.197.115.242";

// ============================================================
// 2. ÍCONOS PERSONALIZADOS SVG POR TIPO
// ============================================================
function crearIcono(tipo) {
    const esUniversidad = tipo === 'Instituto Superior';

    const colorFondo   = esUniversidad ? '#f59e0b' : '#10b981';
    const colorSombra  = esUniversidad ? 'rgba(245,158,11,0.5)' : 'rgba(16,185,129,0.5)';
    const emoji        = esUniversidad ? '🎓' : '📚';

    const svg = `
        <div style="
            width: 36px;
            height: 36px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            background: linear-gradient(135deg, ${colorFondo}, ${colorFondo}cc);
            border: 2px solid white;
            box-shadow: 0 4px 14px ${colorSombra}, 0 0 0 3px ${colorFondo}33;
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <span style="transform: rotate(45deg); font-size: 16px; line-height: 1;">${emoji}</span>
        </div>
    `;

    return L.divIcon({
        html: svg,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -38]
    });
}

// ============================================================
// 3. INICIALIZAR MAPA Y AGREGAR MODO SATÉLITE
// ============================================================
const map = L.map('map', {
    center: [-16.4914, -68.1931],
    zoom: 13,
    zoomControl: true,
    attributionControl: true,
});

// Capa de mapa claro y moderno (CartoDB Voyager)
const mapaClaro = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    subdomains: 'abcd',
    maxZoom: 20
});

// Capa de mapa satelital híbrido (Satélite + Calles y Avenidas)
const mapaSatelite = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps'
});

// Agregar el mapa claro por defecto
mapaClaro.addTo(map);

// Crear el control para cambiar entre vistas
const baseMaps = {
    "Mapa Estándar": mapaClaro,
    "Modo Satélite": mapaSatelite
};
L.control.layers(baseMaps).addTo(map);

// Grupo de marcadores
let capaMarcadores = L.layerGroup().addTo(map);

// ============================================================
// 4. ACTUALIZAR ESTADÍSTICAS EN EL PANEL
// ============================================================
function actualizarEstadisticas(instituciones) {
    const total      = instituciones.length;
    const unidades   = instituciones.filter(i => i.tipo === 'Unidad Educativa').length;
    const institutos = instituciones.filter(i => i.tipo === 'Instituto Superior').length;
    const distritos  = new Set(instituciones.map(i => i.distrito)).size;

    const animarNumero = (el, valor) => {
        let inicio = 0;
        const pasos = 30;
        const incremento = valor / pasos;
        const timer = setInterval(() => {
            inicio += incremento;
            if (inicio >= valor) { el.textContent = valor; clearInterval(timer); }
            else el.textContent = Math.floor(inicio);
        }, 30);
    };

    animarNumero(document.getElementById('num-total'),      total);
    animarNumero(document.getElementById('num-unidades'),   unidades);
    animarNumero(document.getElementById('num-institutos'), institutos);
    animarNumero(document.getElementById('num-distritos'),  distritos);
}

// ============================================================
// 5. CREAR CONTENIDO DEL POPUP PERSONALIZADO
// ============================================================
function crearPopupHTML(inst) {
    const esUniversidad = inst.tipo === 'Instituto Superior';
    const badgeClass    = esUniversidad ? 'badge-universidad' : 'badge-colegio';
    const badgeText     = esUniversidad ? '🎓 Instituto Superior' : '📚 Unidad Educativa';

    return `
        <div class="popup-wrapper">
            <div class="popup-header">
                <div class="popup-tipo-badge ${badgeClass}">${badgeText}</div>
                <p class="popup-nombre">${inst.nombre}</p>
            </div>
            <div class="popup-body">
                <div class="popup-fila">
                    <span class="popup-fila-icono">📍</span>
                    <span class="popup-fila-texto"><strong>Distrito:</strong> ${inst.distrito}</span>
                </div>
                <div class="popup-fila">
                    <span class="popup-fila-icono">📖</span>
                    <span class="popup-fila-texto"><strong>Oferta:</strong> ${inst.oferta_academica || 'No especificada'}</span>
                </div>
                <div class="popup-fila">
                    <span class="popup-fila-icono">🌐</span>
                    <span class="popup-fila-texto">${inst.latitud.toFixed(4)}, ${inst.longitud.toFixed(4)}</span>
                </div>
            </div>
            <div class="popup-footer">EL ALTO, BOLIVIA · SIG EDUCACIÓN</div>
        </div>
    `;
}

// ============================================================
// 6. FUNCIÓN PRINCIPAL — CARGAR DATOS Y PINTAR EL MAPA
// ============================================================
async function cargarDatos() {
    // Mostrar estado de carga
    const estadoEl  = document.getElementById('estado-conexion');
    const estadoTxt = document.getElementById('estado-texto');
    estadoEl.className = 'estado-cargando';
    estadoTxt.textContent = 'Consultando datos...';

    capaMarcadores.clearLayers();

    const tipo     = document.getElementById('select-tipo').value;
    const distrito = document.getElementById('select-distrito').value;

    let url = `${API_BASE}/api/instituciones?`;
    if (tipo)     url += `tipo=${encodeURIComponent(tipo)}&`;
    if (distrito) url += `distrito=${encodeURIComponent(distrito)}`;

    try {
        const respuesta = await fetch(url);
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

        const instituciones = await respuesta.json();

        // Actualizar panel de estadísticas
        actualizarEstadisticas(instituciones);

        // Pintar cada institución
        instituciones.forEach(inst => {
            // Icono personalizado
            const icono   = crearIcono(inst.tipo);
            const marcador = L.marker([inst.latitud, inst.longitud], { icon: icono });

            // Popup premium
            marcador.bindPopup(crearPopupHTML(inst), {
                maxWidth: 300,
                className: ''
            });

            // Tooltip rápido al pasar el mouse
            marcador.bindTooltip(`<b>${inst.nombre}</b>`, {
                direction: 'top',
                offset: [0, -38],
                className: 'leaflet-dark-tooltip'
            });

            capaMarcadores.addLayer(marcador);

            // Área de cobertura (500m)
            const colorCobertura = inst.tipo === 'Instituto Superior'
                ? { color: '#f59e0b', fill: '#f59e0b' }
                : { color: '#8b5cf6', fill: '#8b5cf6' };

            const area = L.circle([inst.latitud, inst.longitud], {
                color:       colorCobertura.color,
                fillColor:   colorCobertura.fill,
                fillOpacity: 0.08,
                weight:      1.5,
                dashArray:   '4 4',
                radius:      500
            });
            capaMarcadores.addLayer(area);
        });

        // Estado OK
        estadoEl.className = 'estado-ok';
        estadoTxt.textContent = `${instituciones.length} institución${instituciones.length !== 1 ? 'es' : ''} encontrada${instituciones.length !== 1 ? 's' : ''}`;

        // Ajustar vista si hay marcadores
        if (instituciones.length > 0) {
            const bounds = capaMarcadores.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
            }
        }

    } catch (error) {
        console.error('Error al conectar con la API:', error);
        estadoEl.className = 'estado-error';
        estadoTxt.textContent = 'Sin conexión con la API';

        // Resetear estadísticas
        ['num-total','num-unidades','num-institutos','num-distritos'].forEach(id => {
            document.getElementById(id).textContent = '—';
        });
    } finally {
        // Ocultar overlay de carga inicial
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.add('oculto');
    }
}

// ============================================================
// 7. ARRANCAR AL CARGAR LA PÁGINA
// ============================================================
window.addEventListener('load', () => {
    cargarDatos();
});