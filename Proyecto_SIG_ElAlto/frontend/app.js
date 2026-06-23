// ============================================================
// 1. CONFIGURACIÓN DE LA API (DINÁMICA)
// ============================================================
const API_BASE = window.location.protocol === "file:" ? "http://localhost:8000" : window.location.origin;

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

const mapaClaro = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    subdomains: 'abcd',
    maxZoom: 20
});

const mapaSatelite = L.tileLayer('https://{s}.google.com/vt/lyrs=y&apistyle=s.t:2|p.v:off,s.t:4|p.v:off&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps'
});

mapaClaro.addTo(map);

const baseMaps = {
    "Mapa Estándar": mapaClaro,
    "Modo Satélite": mapaSatelite
};
L.control.layers(baseMaps).addTo(map);

let capaMarcadores = L.featureGroup().addTo(map);

// ============================================================
// 4. ACTUALIZAR ESTADÍSTICAS EN EL PANEL
// ============================================================
function actualizarEstadisticas(instituciones) {
    const total      = instituciones.length;
    const unidades   = instituciones.filter(i => i.tipo === 'Unidad Educativa').length;
    const institutos = instituciones.filter(i => i.tipo === 'Instituto Superior').length;
    const distritos  = new Set(instituciones.map(i => i.distrito)).size;

    const animarNumero = (el, valor) => {
        if (!el) return;
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
    const estadoEl  = document.getElementById('estado-conexion');
    const estadoTxt = document.getElementById('estado-texto');
    
    if (estadoEl && estadoTxt) {
        estadoEl.className = 'estado-cargando';
        estadoTxt.textContent = 'Consultando datos...';
    }

    capaMarcadores.clearLayers();

    const tipoEl = document.getElementById('select-tipo');
    const distritoEl = document.getElementById('select-distrito');
    
    const tipo     = tipoEl ? tipoEl.value : '';
    const distrito = distritoEl ? distritoEl.value : '';

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
            const icono   = crearIcono(inst.tipo);
            const marcador = L.marker([inst.latitud, inst.longitud], { icon: icono });

            marcador.bindPopup(crearPopupHTML(inst), { maxWidth: 300, className: '' });

            marcador.bindTooltip(`<b>${inst.nombre}</b>`, {
                direction: 'top',
                offset: [0, -38],
                className: 'leaflet-dark-tooltip'
            });

            capaMarcadores.addLayer(marcador);

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

        // CONTROL VISUAL: Forzamos el estado OK únicamente si la red respondió con éxito
        if (estadoEl && estadoTxt) {
            estadoEl.className = 'estado-ok';
            estadoTxt.textContent = `${instituciones.length} institución${instituciones.length !== 1 ? 'es' : ''} encontrada${instituciones.length !== 1 ? 's' : ''}`;
        }

        // Ajustar el zoom automático
        if (instituciones.length > 0) {
            const bounds = capaMarcadores.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
            }
        }

    } catch (error) {
        console.error('Error al conectar con la API:', error);
        
        if (estadoEl && estadoTxt) {
            estadoEl.className = 'estado-error';
            estadoTxt.textContent = 'Sin conexión con la API';
        }

        ['num-total','num-unidades','num-institutos','num-distritos'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '—';
        });
    } finally {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.add('oculto');
    }
}

// ============================================================
// 7. ARRANCAR AL CARGAR LA PÁGINA
// ============================================================
window.addEventListener('load', () => {
    cargarDatos();
    inicializarAdmin();
});

// ============================================================
// 8. FUNCIONALIDAD DE ADMINISTRACIÓN (NUEVO)
// ============================================================
let modoRegistroActivo = false;
let marcadorTemporal = null;

// Icono pulsante para el registro
const pulsarIcono = L.divIcon({
    html: '<div class="pulsar-dot"></div>',
    className: 'marcador-temporal-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

function inicializarAdmin() {
    // 8.1. Controles de Menú Móvil
    const btnToggleMenu = document.getElementById('btn-toggle-menu');
    const panelLateral = document.getElementById('panel-lateral');
    const mobileOverlay = document.getElementById('mobile-overlay');

    if (btnToggleMenu && panelLateral && mobileOverlay) {
        const toggleMenu = () => {
            const activo = panelLateral.classList.toggle('activo');
            mobileOverlay.classList.toggle('activo');
            btnToggleMenu.querySelector('span').textContent = activo ? '✕' : '☰';
        };

        btnToggleMenu.addEventListener('click', toggleMenu);
        mobileOverlay.addEventListener('click', toggleMenu);
        
        // Cerrar menú móvil al hacer clic en filtros en pantallas pequeñas
        const selectTipo = document.getElementById('select-tipo');
        const selectDistrito = document.getElementById('select-distrito');
        [selectTipo, selectDistrito].forEach(select => {
            if (select) {
                select.addEventListener('change', () => {
                    if (window.innerWidth <= 768 && panelLateral.classList.contains('activo')) {
                        toggleMenu();
                    }
                });
            }
        });
    }

    // 8.2. Modales (Inicio de sesión y Registro)
    const modalLogin = document.getElementById('modal-login');
    const modalRegistro = document.getElementById('modal-registro');
    
    const btnLoginTrigger = document.getElementById('btn-login-trigger');
    const btnCerrarLogin = document.getElementById('btn-cerrar-login');
    const btnSubmitLogin = document.getElementById('btn-submit-login');
    const inputPassword = document.getElementById('input-password');
    const loginError = document.getElementById('login-error');
    
    const controlesAdmin = document.getElementById('controles-admin');
    const btnLogout = document.getElementById('btn-logout');
    
    const btnRegistrarTrigger = document.getElementById('btn-registrar-trigger');
    const btnCerrarRegistro = document.getElementById('btn-cerrar-registro');
    const btnCancelarRegistro = document.getElementById('btn-cancelar-registro');
    const btnGuardarRegistro = document.getElementById('btn-guardar-registro');
    const btnCancelarModoReg = document.getElementById('btn-cancelar-modo-registro');
    const bannerRegistro = document.getElementById('banner-registro');

    // Campos de registro
    const regNombre = document.getElementById('reg-nombre');
    const regTipo = document.getElementById('reg-tipo');
    const regDistrito = document.getElementById('reg-distrito');
    const regOferta = document.getElementById('reg-oferta');
    const regLatitud = document.getElementById('reg-latitud');
    const regLongitud = document.getElementById('reg-longitud');
    const registroError = document.getElementById('registro-error');

    // Verificar si ya tiene sesión iniciada
    const token = localStorage.getItem('admin_token');
    if (token) {
        actualizarUIAutenticado(true);
    }

    // Eventos de Login
    if (btnLoginTrigger) {
        btnLoginTrigger.addEventListener('click', () => {
            if (loginError) loginError.classList.add('oculto');
            if (inputPassword) inputPassword.value = '';
            if (modalLogin) modalLogin.classList.remove('oculto');
            if (inputPassword) inputPassword.focus();
        });
    }

    if (btnCerrarLogin) {
        btnCerrarLogin.addEventListener('click', () => {
            if (modalLogin) modalLogin.classList.add('oculto');
        });
    }

    // Cerrar modales haciendo clic fuera del contenido
    window.addEventListener('click', (e) => {
        if (e.target === modalLogin) {
            modalLogin.classList.add('oculto');
        }
        if (e.target === modalRegistro) {
            cancelarRegistroCompleto();
        }
    });

    if (btnSubmitLogin) {
        btnSubmitLogin.addEventListener('click', procesarLogin);
    }
    if (inputPassword) {
        inputPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') procesarLogin();
        });
    }

    async function procesarLogin() {
        const password = inputPassword.value.trim();
        if (!password) {
            mostrarErrorLogin("Por favor ingrese la contraseña.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || "Contraseña incorrecta.");
            }

            const data = await response.json();
            localStorage.setItem('admin_token', data.access_token);
            actualizarUIAutenticado(true);
            if (modalLogin) modalLogin.classList.add('oculto');
            clearFormLogin();
        } catch (err) {
            mostrarErrorLogin(err.message);
        }
    }

    function mostrarErrorLogin(msg) {
        if (loginError) {
            loginError.textContent = msg;
            loginError.classList.remove('oculto');
        }
    }

    function clearFormLogin() {
        if (inputPassword) inputPassword.value = '';
        if (loginError) loginError.classList.add('oculto');
    }

    function actualizarUIAutenticado(autenticado) {
        if (autenticado) {
            if (btnLoginTrigger) btnLoginTrigger.classList.add('oculto');
            if (controlesAdmin) controlesAdmin.classList.remove('oculto');
        } else {
            if (btnLoginTrigger) btnLoginTrigger.classList.remove('oculto');
            if (controlesAdmin) controlesAdmin.classList.add('oculto');
        }
    }

    // Evento Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('admin_token');
            actualizarUIAutenticado(false);
            desactivarModoRegistro();
        });
    }

    // 8.3. Registro de Nueva Institución (Mapa click & Formulario)
    if (btnRegistrarTrigger) {
        btnRegistrarTrigger.addEventListener('click', () => {
            if (modoRegistroActivo) {
                desactivarModoRegistro();
            } else {
                activarModoRegistro();
            }
        });
    }

    if (btnCancelarModoReg) {
        btnCancelarModoReg.addEventListener('click', desactivarModoRegistro);
    }

    function toggleMenu() {
        if (panelLateral && mobileOverlay && btnToggleMenu) {
            const activo = panelLateral.classList.toggle('activo');
            mobileOverlay.classList.toggle('activo');
            btnToggleMenu.querySelector('span').textContent = activo ? '✕' : '☰';
        }
    }

    function activarModoRegistro() {
        modoRegistroActivo = true;
        if (btnRegistrarTrigger) {
            btnRegistrarTrigger.innerHTML = '<span class="btn-icon">✕</span> Cancelar Registro';
        }
        if (bannerRegistro) bannerRegistro.classList.remove('oculto');
        
        // Cambiar cursor del mapa
        const mapContainer = map.getContainer();
        if (mapContainer) mapContainer.style.cursor = 'crosshair';

        // Si estamos en móvil, cerramos el menú para dejar ver el mapa
        if (window.innerWidth <= 768 && panelLateral && panelLateral.classList.contains('activo')) {
            toggleMenu();
        }
    }

    function desactivarModoRegistro() {
        modoRegistroActivo = false;
        if (btnRegistrarTrigger) {
            btnRegistrarTrigger.innerHTML = '<span class="btn-icon">➕</span> Registrar Institución';
        }
        if (bannerRegistro) bannerRegistro.classList.add('oculto');
        
        const mapContainer = map.getContainer();
        if (mapContainer) mapContainer.style.cursor = '';

        if (marcadorTemporal) {
            map.removeLayer(marcadorTemporal);
            marcadorTemporal = null;
        }
    }

    // Clic en el mapa para capturar coordenadas
    map.on('click', (e) => {
        if (!modoRegistroActivo) return;

        // Colocar o mover el marcador temporal rojo pulsante
        if (marcadorTemporal) {
            map.removeLayer(marcadorTemporal);
        }
        marcadorTemporal = L.marker(e.latlng, { icon: pulsarIcono }).addTo(map);

        // Pre-llenar formulario y abrir modal
        if (regLatitud) regLatitud.value = e.latlng.lat.toFixed(6);
        if (regLongitud) regLongitud.value = e.latlng.lng.toFixed(6);
        if (registroError) registroError.classList.add('oculto');
        
        // Limpiar otros campos
        if (regNombre) regNombre.value = '';
        if (regOferta) regOferta.value = '';

        if (modalRegistro) modalRegistro.classList.remove('oculto');
        if (regNombre) regNombre.focus();
    });

    // Cerrar / Cancelar en formulario modal
    const cancelarRegistroCompleto = () => {
        if (modalRegistro) modalRegistro.classList.add('oculto');
        if (marcadorTemporal) {
            map.removeLayer(marcadorTemporal);
            marcadorTemporal = null;
        }
        desactivarModoRegistro();
    };

    if (btnCerrarRegistro) btnCerrarRegistro.addEventListener('click', cancelarRegistroCompleto);
    if (btnCancelarRegistro) btnCancelarRegistro.addEventListener('click', cancelarRegistroCompleto);

    // Guardar Institución
    if (btnGuardarRegistro) {
        btnGuardarRegistro.addEventListener('click', async () => {
            const nombre = regNombre.value.trim();
            const tipo = regTipo.value;
            const distrito = regDistrito.value;
            const oferta = regOferta.value.trim();
            const lat = parseFloat(regLatitud.value);
            const lng = parseFloat(regLongitud.value);

            if (!nombre) {
                mostrarErrorRegistro("El nombre es requerido.");
                return;
            }

            const tokenAdmin = localStorage.getItem('admin_token');
            if (!tokenAdmin) {
                mostrarErrorRegistro("Sesión inválida. Inicie sesión de nuevo.");
                return;
            }

            try {
                if (registroError) registroError.classList.add('oculto');
                
                const response = await fetch(`${API_BASE}/api/instituciones`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${tokenAdmin}`
                    },
                    body: JSON.stringify({
                        nombre: nombre,
                        tipo: tipo,
                        distrito: parseInt(distrito),
                        oferta_academica: oferta,
                        longitud: lng,
                        latitud: lat
                    })
                });

                if (response.status === 401 || response.status === 403) {
                    throw new Error("Su sesión ha expirado o no tiene permisos. Por favor inicie sesión.");
                }

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.detail || "Error al registrar la institución.");
                }

                // Éxito
                alert("¡Institución registrada exitosamente!");
                cancelarRegistroCompleto();
                cargarDatos(); // Recargar mapa
            } catch (err) {
                mostrarErrorRegistro(err.message);
            }
        });
    }

    function mostrarErrorRegistro(msg) {
        if (registroError) {
            registroError.textContent = msg;
            registroError.classList.remove('oculto');
        }
    }
}