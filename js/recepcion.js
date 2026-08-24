/* Zippy — Acta de recogida de vehículo.
   Flujo: datos -> fotos con marcas -> inventario -> PDF.
   Sin backend: el PDF se descarga y el operador lo sube a Drive y lo reenvía por WhatsApp. */

const ANGULOS = [
    { id: 'frontal', label: 'Frontal' },
    { id: 'trasero', label: 'Trasero' },
    { id: 'izquierdo', label: 'Lateral izquierdo' },
    { id: 'derecho', label: 'Lateral derecho' },
    { id: 'techo', label: 'Techo y capó' },
    { id: 'interior', label: 'Interior y tablero' },
];

const INVENTARIO = [
    'Llanta de repuesto', 'Gato', 'Cruceta', 'Kit de carretera',
    'Extintor', 'Botiquín', 'Herramientas', 'Tapetes',
    'Radio o pantalla', 'Control de alarma', 'Tapacubos', 'Antena',
    'Tarjeta de propiedad', 'SOAT', 'Tecnomecánica', 'Cargador o accesorios',
];

const MARCAS = [
    'Chevrolet', 'Renault', 'Mazda', 'Kia', 'Nissan', 'Toyota', 'Hyundai', 'Suzuki', 'Ford',
    'Volkswagen', 'Fiat', 'Peugeot', 'Citroën', 'Honda', 'Mitsubishi', 'Jeep', 'Dodge', 'RAM',
    'BMW', 'Mercedes-Benz', 'Audi', 'Volvo', 'Land Rover', 'Mini', 'Porsche', 'Lexus', 'Subaru',
    'Chery', 'JAC', 'Changan', 'BYD', 'Great Wall', 'MG', 'DFSK', 'Foton', 'Isuzu', 'Škoda', 'Seat',
];

/* Modelos frecuentes en Colombia. Es sugerencia: el campo admite cualquier texto. */
const MODELOS = {
    'Chevrolet': ['Spark GT', 'Beat', 'Onix', 'Sail', 'Aveo', 'Tracker', 'Captiva', 'Groove', 'Joy', 'D-Max', 'N300'],
    'Renault': ['Sandero', 'Logan', 'Stepway', 'Duster', 'Kwid', 'Captur', 'Koleos', 'Oroch', 'Clio', 'Twingo'],
    'Mazda': ['Mazda 2', 'Mazda 3', 'Mazda 6', 'CX-3', 'CX-30', 'CX-5', 'CX-50', 'CX-9', 'BT-50'],
    'Kia': ['Picanto', 'Rio', 'Cerato', 'Sportage', 'Seltos', 'Sonet', 'Soul', 'Carens', 'Niro'],
    'Nissan': ['March', 'Versa', 'Sentra', 'Kicks', 'Qashqai', 'X-Trail', 'Frontier', 'Navara'],
    'Toyota': ['Yaris', 'Corolla', 'Corolla Cross', 'RAV4', 'Hilux', 'Fortuner', 'Prado', 'Land Cruiser', 'Rush'],
    'Hyundai': ['i10', 'Accent', 'Elantra', 'Tucson', 'Creta', 'Venue', 'Santa Fe', 'Kona'],
    'Suzuki': ['Swift', 'Baleno', 'Vitara', 'S-Cross', 'Jimny', 'Ertiga', 'Celerio'],
    'Ford': ['Fiesta', 'Focus', 'EcoSport', 'Escape', 'Explorer', 'Ranger', 'Bronco Sport', 'Territory'],
    'Volkswagen': ['Gol', 'Polo', 'Virtus', 'Jetta', 'T-Cross', 'Nivus', 'Tiguan', 'Amarok'],
    'Fiat': ['Palio', 'Uno', 'Argo', 'Cronos', 'Mobi', 'Pulse', 'Toro'],
    'Jeep': ['Renegade', 'Compass', 'Wrangler', 'Grand Cherokee', 'Commander'],
    'Mitsubishi': ['L200', 'Outlander', 'Montero', 'ASX', 'Xpander'],
};

const ASEGURADORAS = [
    'Sura', 'Seguros Bolívar', 'Allianz', 'Mapfre', 'Seguros del Estado', 'AXA Colpatria',
    'HDI Seguros', 'La Previsora', 'La Equidad', 'Solidaria', 'Zurich', 'Chubb', 'Mundial',
    'Liberty', 'SBS Seguros',
];

const TALLERES = ['Zippy Norte', 'Zippy Centro', 'Zippy Sur', 'Otro aliado'];
const SERVICIOS = ['Mecánica general', 'Latonería y pintura', 'Lavado', 'Detailing', 'Lujos y accesorios', 'Diagnóstico', 'Revisión pre-compra'];

/* Nivel de combustible en octavos: el índice del arreglo es el valor del deslizador. */
const FRACCIONES = ['Vacío', '1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8', 'Lleno'];

const CLAVE_BORRADOR = 'zippy_acta_borrador';
const CAMPOS_TEXTO = [
    'cliente-nombre', 'cliente-telefono', 'recogida-direccion', 'recogida-fecha',
    'placa', 'marca', 'modelo', 'anio', 'color', 'kilometraje', 'combustible',
    'taller', 'taller-otro', 'servicio', 'servicio-detalle', 'notas',
    'operador-nombre', 'operador-cedula', 'aseguradora', 'vence-soat', 'vence-tecno',
];

/* Estado. Las fotos viven solo en memoria: en localStorage no caben. */
const estado = {
    fotos: {},        // { [anguloId]: { src, marcas: [{ x, y, nota, foto }] } }
    inventario: {},   // { [item]: true }
    itemsExtra: [],   // ítems que escribe el operador en el momento
    terminos: false,  // el cliente aceptó los términos / recibió a conformidad
    poliza: false,    // el operador verificó la póliza todo riesgo
    documentos: false, // SOAT y tecnomecánica vigentes
    firma: null,      // dataURL de la firma del cliente
    tipo: 'recogida', // 'recogida' | 'devolucion'
};

let pasoActual = 1;
const TOTAL_PASOS = 4;
let objetivoFoto = null;   // { angulo } o { angulo, indiceMarca }

/* ---------- Utilidades ---------- */

const $ = (id) => document.getElementById(id);
const escapar = (t) => String(t).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const listaInventario = () => INVENTARIO.concat(estado.itemsExtra);
const valor = (id) => ($(id) ? $(id).value.trim() : '');

function normalizarTelefono(bruto) {
    const digitos = (bruto || '').replace(/\D/g, '');
    if (!digitos) return '';
    if (digitos.startsWith('57')) return digitos;
    if (digitos.length === 10) return '57' + digitos;
    return digitos;
}

function fechaLegible(iso) {
    if (!iso) return '—';
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
}

function consecutivo() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `ZP-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/* Numeración continua de marcas, en el orden de los ángulos. */
function marcasNumeradas() {
    const salida = [];
    ANGULOS.forEach((ang) => {
        const foto = estado.fotos[ang.id];
        if (!foto) return;
        foto.marcas.forEach((m, i) => {
            salida.push({ numero: salida.length + 1, angulo: ang.label, indice: i, ...m });
        });
    });
    return salida;
}

function numeroBaseDe(anguloId) {
    let n = 0;
    for (const ang of ANGULOS) {
        if (ang.id === anguloId) break;
        n += estado.fotos[ang.id] ? estado.fotos[ang.id].marcas.length : 0;
    }
    return n;
}

/* ---------- Borrador ---------- */

/* Hasta que el borrador no se haya leído, nadie escribe: el pintado inicial
   dispara guardados y borraría lo guardado en la visita anterior. */
let borradorListo = false;

function guardarBorrador() {
    if (!borradorListo) return;
    const datos = {};
    CAMPOS_TEXTO.forEach((c) => { datos[c] = valor(c); });
    datos._inventario = estado.inventario;
    datos._itemsExtra = estado.itemsExtra;
    datos._tipo = estado.tipo;
    datos._poliza = estado.poliza;
    datos._documentos = estado.documentos;
    try {
        localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(datos));
    } catch (e) {
        /* Sin espacio: seguimos sin borrador, no bloqueamos la recogida. */
    }
}

function cargarBorrador() {
    let datos;
    try {
        datos = JSON.parse(localStorage.getItem(CLAVE_BORRADOR) || 'null');
    } catch (e) {
        borradorListo = true;
        return;
    }
    if (!datos) {
        borradorListo = true;
        return;
    }
    CAMPOS_TEXTO.forEach((c) => {
        if ($(c) && datos[c]) $(c).value = datos[c];
    });
    estado.inventario = datos._inventario || {};
    estado.itemsExtra = datos._itemsExtra || [];
    estado.poliza = !!datos._poliza;
    estado.documentos = !!datos._documentos;
    $('fila-poliza').classList.toggle('activo', estado.poliza);
    $('fila-documentos').classList.toggle('activo', estado.documentos);
    pintarInventario();
    pintarCombustible();
    setTipoActa(datos._tipo === 'devolucion' ? 'devolucion' : 'recogida');
    alternarTallerOtro();
    borradorListo = true;
}

/* ---------- Navegación ---------- */

function irAPaso(n) {
    if (n > pasoActual && !validarPaso(pasoActual)) return;
    pasoActual = Math.min(Math.max(n, 1), TOTAL_PASOS);
    document.querySelectorAll('.paso').forEach((el, i) => {
        el.classList.toggle('oculto', i + 1 !== pasoActual);
    });
    $('barra-progreso').style.width = `${(pasoActual / TOTAL_PASOS) * 100}%`;
    $('etiqueta-paso').textContent = `Paso ${pasoActual} de ${TOTAL_PASOS}`;
    $('btn-atras').classList.toggle('invisible', pasoActual === 1);
    $('btn-siguiente').classList.toggle('hidden', pasoActual === TOTAL_PASOS);
    if (pasoActual === TOTAL_PASOS) { pintarResumen(); dimensionarFirma(); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    lucide.createIcons();
}

function validarPaso(n) {
    if (n !== 1) return true;
    const faltantes = [];
    if (!valor('cliente-nombre')) faltantes.push('nombre del cliente');
    if (!valor('cliente-telefono')) faltantes.push('teléfono');
    if (!valor('placa')) faltantes.push('placa');
    if (!valor('operador-nombre')) faltantes.push('nombre del operador');
    if (faltantes.length) {
        avisar(`Falta ${faltantes.join(', ')} para continuar.`);
        return false;
    }
    return true;
}

function avisar(texto) {
    const caja = $('aviso');
    caja.textContent = texto;
    caja.classList.remove('hidden');
    clearTimeout(avisar._t);
    avisar._t = setTimeout(() => caja.classList.add('hidden'), 4000);
}

/* ---------- Paso 1: datos ---------- */

function alternarTallerOtro() {
    const esOtro = valor('taller') === 'Otro aliado';
    $('campo-taller-otro').classList.toggle('hidden', !esOtro);
}

/* ---------- Paso 2: fotos y marcas ---------- */

function pintarSlots() {
    $('grid-fotos').innerHTML = ANGULOS.map((ang) => `
        <div>
            <p class="text-xs uppercase tracking-wider text-slate-500 mb-2">${ang.label}</p>
            <div class="slot-foto ${estado.fotos[ang.id] ? 'con-foto' : ''}" id="slot-${ang.id}"
                 onclick="tocarSlot('${ang.id}', event)">
                ${estado.fotos[ang.id]
            ? `<img src="${estado.fotos[ang.id].src}" alt="${ang.label}">` +
            estado.fotos[ang.id].marcas.map((m, i) =>
                `<span class="marca" style="left:${m.x * 100}%;top:${m.y * 100}%">${numeroBaseDe(ang.id) + i + 1}</span>`).join('')
            : `<span class="text-slate-500 text-sm flex flex-col items-center gap-2">
                       <i data-lucide="camera" class="w-7 h-7"></i> Tomar foto</span>`}
            </div>
            ${estado.fotos[ang.id]
            ? `<button type="button" onclick="repetirFoto('${ang.id}', event)"
                     class="text-xs text-slate-400 hover:text-white mt-2 transition-colors">Repetir foto</button>`
            : ''}
        </div>
    `).join('');
    pintarMarcas();
    lucide.createIcons();
}

function tocarSlot(anguloId, evento) {
    const foto = estado.fotos[anguloId];
    if (!foto) {
        objetivoFoto = { angulo: anguloId };
        $('entrada-foto').click();
        return;
    }
    // Con foto ya cargada: el toque marca un detalle.
    const caja = $(`slot-${anguloId}`).getBoundingClientRect();
    const x = (evento.clientX - caja.left) / caja.width;
    const y = (evento.clientY - caja.top) / caja.height;
    foto.marcas.push({ x, y, nota: '', foto: null });
    pintarSlots();
}

function repetirFoto(anguloId, evento) {
    evento.stopPropagation();
    objetivoFoto = { angulo: anguloId };
    $('entrada-foto').click();
}

function pintarMarcas() {
    const lista = marcasNumeradas();
    $('sin-marcas').classList.toggle('hidden', lista.length > 0);
    $('lista-marcas').innerHTML = lista.map((m) => {
        const ang = ANGULOS.find((a) => a.label === m.angulo).id;
        return `
        <div class="p-4 bg-white/5 rounded-2xl border border-white/5 flex gap-4 items-start">
            <span class="w-8 h-8 shrink-0 rounded-full bg-blue-500 text-white text-sm font-semibold flex items-center justify-center">${m.numero}</span>
            <div class="flex-1 space-y-3">
                <p class="text-xs uppercase tracking-wider text-slate-500">${m.angulo}</p>
                <input type="text" value="${(m.nota || '').replace(/"/g, '&quot;')}"
                       oninput="anotarMarca('${ang}', ${m.indice}, this.value)"
                       placeholder="Rayón, abolladura, vidrio..."
                       class="w-full bg-slate-950/50 border border-slate-500/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/40">
                <div class="flex items-center gap-3">
                    <button type="button" onclick="fotoDeDetalle('${ang}', ${m.indice})"
                            class="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors">
                        <i data-lucide="camera" class="w-4 h-4"></i>${m.foto ? 'Cambiar acercamiento' : 'Foto de acercamiento'}
                    </button>
                    ${m.foto ? `<img src="${m.foto}" class="w-12 h-12 rounded-lg object-cover border border-white/10">` : ''}
                    <button type="button" onclick="borrarMarca('${ang}', ${m.indice})"
                            class="text-sm text-slate-500 hover:text-slate-300 ml-auto transition-colors">Quitar</button>
                </div>
            </div>
        </div>`;
    }).join('');
    lucide.createIcons();
}

function anotarMarca(anguloId, indice, texto) {
    estado.fotos[anguloId].marcas[indice].nota = texto;
}

function borrarMarca(anguloId, indice) {
    estado.fotos[anguloId].marcas.splice(indice, 1);
    pintarSlots();
}

function fotoDeDetalle(anguloId, indice) {
    objetivoFoto = { angulo: anguloId, indiceMarca: indice };
    $('entrada-foto').click();
}

function recibirFoto(entrada) {
    const archivo = entrada.files && entrada.files[0];
    entrada.value = '';
    if (!archivo || !objetivoFoto) return;
    comprimir(archivo, (src) => {
        const destino = objetivoFoto;
        objetivoFoto = null;
        if (destino.indiceMarca === undefined) {
            const previas = estado.fotos[destino.angulo] ? estado.fotos[destino.angulo].marcas : [];
            estado.fotos[destino.angulo] = { src, marcas: previas };
        } else {
            estado.fotos[destino.angulo].marcas[destino.indiceMarca].foto = src;
        }
        pintarSlots();
    });
}

/* Bajamos la foto a 1400px y JPEG 0.72: el PDF pesa poco y viaja bien por WhatsApp. */
function comprimir(archivo, alTerminar) {
    const lector = new FileReader();
    lector.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const max = 1400;
            const escala = Math.min(1, max / Math.max(img.width, img.height));
            const lienzo = document.createElement('canvas');
            lienzo.width = Math.round(img.width * escala);
            lienzo.height = Math.round(img.height * escala);
            lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);
            alTerminar(lienzo.toDataURL('image/jpeg', 0.72));
        };
        img.src = e.target.result;
    };
    lector.readAsDataURL(archivo);
}

/* ---------- Paso 3: inventario ---------- */

function pintarInventario() {
    $('grid-inventario').innerHTML = listaInventario().map((item, i) => `
        <div class="item-inv ${estado.inventario[item] ? 'activo' : ''}" onclick="alternarItem(this, ${i})">
            <span class="caja-check">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5"
                     stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </span>
            <span class="text-[0.95rem] text-slate-300 flex-1">${escapar(item)}</span>
            ${i >= INVENTARIO.length
            ? `<button type="button" onclick="quitarItem(event, ${i})"
                     class="text-slate-500 hover:text-white text-lg leading-none px-1 transition-colors"
                     title="Quitar ítem">&times;</button>`
            : ''}
        </div>
    `).join('');
}

function alternarItem(el, indice) {
    const item = listaInventario()[indice];
    estado.inventario[item] = !estado.inventario[item];
    el.classList.toggle('activo', estado.inventario[item]);
    guardarBorrador();
}

/* Ítem escrito por el operador: entra ya marcado, porque lo añade justamente porque está. */
function agregarItem() {
    const texto = valor('nuevo-item');
    if (!texto) return;
    if (listaInventario().some((i) => i.toLowerCase() === texto.toLowerCase())) {
        avisar('Ese ítem ya está en la lista.');
        return;
    }
    estado.itemsExtra.push(texto);
    estado.inventario[texto] = true;
    $('nuevo-item').value = '';
    pintarInventario();
    guardarBorrador();
}

function quitarItem(evento, indice) {
    evento.stopPropagation();
    const item = listaInventario()[indice];
    delete estado.inventario[item];
    estado.itemsExtra.splice(indice - INVENTARIO.length, 1);
    pintarInventario();
    guardarBorrador();
}

/* ---------- Paso 4: resumen ---------- */

function tallerElegido() {
    const t = valor('taller');
    return t === 'Otro aliado' ? (valor('taller-otro') || 'Otro aliado') : t;
}

function pintarResumen() {
    const marcas = marcasNumeradas();
    const fotos = Object.keys(estado.fotos).length;
    const inventario = listaInventario();
    const presentes = inventario.filter((i) => estado.inventario[i]).length;
    const filas = [
        ['Tipo de acta', ES_DEVOLUCION() ? 'Devolución' : 'Recogida'],
        ['Operador', valor('operador-nombre') || '—'],
        ['Cliente', valor('cliente-nombre') || '—'],
        ['Vehículo', `${valor('marca')} ${valor('modelo')} ${valor('anio')}`.trim() || '—'],
        ['Placa', (valor('placa') || '—').toUpperCase()],
        ['Taller destino', tallerElegido() || '—'],
        ['Servicio', valor('servicio') || '—'],
        ['Fotos tomadas', `${fotos} de ${ANGULOS.length}`],
        ['Detalles señalados', String(marcas.length)],
        ['Inventario presente', `${presentes} de ${inventario.length}`],
        ['Combustible', FRACCIONES[nivelCombustible()]],
    ];
    $('tabla-resumen').innerHTML = filas.map(([k, v]) => `
        <div class="flex justify-between gap-4 py-3 border-b border-white/5">
            <span class="text-slate-500">${k}</span>
            <span class="text-white text-right font-medium">${v}</span>
        </div>`).join('');
}

function alternarTerminos(el) {
    estado.terminos = !estado.terminos;
    el.classList.toggle('activo', estado.terminos);
}

/* ---------- Tipo de acta ---------- */

const ES_DEVOLUCION = () => estado.tipo === 'devolucion';

function setTipoActa(tipo) {
    estado.tipo = tipo;
    const devolucion = ES_DEVOLUCION();
    $('indicador-tipo').style.transform = devolucion ? 'translateX(100%)' : 'translateX(0)';
    $('btn-tipo-recogida').classList.toggle('text-white', !devolucion);
    $('btn-tipo-recogida').classList.toggle('text-slate-400', devolucion);
    $('btn-tipo-devolucion').classList.toggle('text-white', devolucion);
    $('btn-tipo-devolucion').classList.toggle('text-slate-400', !devolucion);
    $('titulo-paso1').textContent = devolucion ? 'Datos de la devolución' : 'Datos de la recogida';
    $('texto-terminos').textContent = devolucion
        ? 'El cliente recibe el vehículo a conformidad, según el estado registrado en esta acta.'
        : 'El cliente entrega el vehículo y acepta los Términos y Condiciones de Zippy.';
    guardarBorrador();
}

/* ---------- Listas sugeridas ---------- */

function pintarListas() {
    $('lista-marcas').innerHTML = MARCAS.map((m) => `<option value="${m}">`).join('');
    $('lista-aseguradoras').innerHTML = ASEGURADORAS.map((a) => `<option value="${a}">`).join('');
    pintarModelos();
}

/* Los modelos siguen a la marca escrita; si la marca no está en la tabla, el campo queda libre. */
function pintarModelos() {
    const escrita = valor('marca').toLowerCase();
    const marca = Object.keys(MODELOS).find((m) => m.toLowerCase() === escrita);
    $('lista-modelos').innerHTML = (MODELOS[marca] || []).map((m) => `<option value="${m}">`).join('');
}

/* ---------- Medidor de combustible ---------- */

/* La aguja barre 140 grados, como el cluster de un tablero. */
const ANG_INICIO = 200;
const ANG_BARRIDO = 140;

function puntoArco(cx, cy, r, t) {
    const a = (ANG_INICIO + t * ANG_BARRIDO) * Math.PI / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function nivelCombustible() {
    return parseInt($('combustible').value, 10) || 0;
}

function pintarCombustible() {
    const nivel = nivelCombustible();
    const t = nivel / 8;
    $('texto-combustible').textContent = FRACCIONES[nivel];

    const cx = 110, cy = 104, r = 76;
    const ini = puntoArco(cx, cy, r, 0);
    const fin = puntoArco(cx, cy, r, 1);
    const hasta = puntoArco(cx, cy, r, t);
    const aguja = puntoArco(cx, cy, r - 22, t);

    const marcas = [0, 0.25, 0.5, 0.75, 1].map((v) => {
        const a = puntoArco(cx, cy, r - 3, v);
        const b = puntoArco(cx, cy, r - (v % 0.5 === 0 ? 16 : 11), v);
        return `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"
                      stroke="#64748b" stroke-width="2" stroke-linecap="round"/>`;
    }).join('');

    $('cluster').innerHTML = `
        <svg viewBox="0 0 220 118" class="w-full max-w-[230px]" xmlns="http://www.w3.org/2000/svg">
            <path d="M ${ini.x.toFixed(1)} ${ini.y.toFixed(1)} A ${r} ${r} 0 0 1 ${fin.x.toFixed(1)} ${fin.y.toFixed(1)}"
                  fill="none" stroke="rgba(148,163,184,0.25)" stroke-width="7" stroke-linecap="round"/>
            ${t > 0 ? `<path d="M ${ini.x.toFixed(1)} ${ini.y.toFixed(1)} A ${r} ${r} 0 0 1 ${hasta.x.toFixed(1)} ${hasta.y.toFixed(1)}"
                  fill="none" stroke="#3b82f6" stroke-width="7" stroke-linecap="round"/>` : ''}
            ${marcas}
            <text x="${(ini.x + 6).toFixed(1)}" y="${(ini.y + 18).toFixed(1)}" fill="#94a3b8"
                  font-size="15" font-weight="600" text-anchor="middle">E</text>
            <text x="${(fin.x - 6).toFixed(1)}" y="${(fin.y + 18).toFixed(1)}" fill="#94a3b8"
                  font-size="15" font-weight="600" text-anchor="middle">F</text>
            <line x1="${cx}" y1="${cy}" x2="${aguja.x.toFixed(1)}" y2="${aguja.y.toFixed(1)}"
                  stroke="#f8fafc" stroke-width="3" stroke-linecap="round"/>
            <circle cx="${cx}" cy="${cy}" r="6" fill="#f8fafc"/>
            <circle cx="${cx}" cy="${cy}" r="2.5" fill="#020617"/>
        </svg>`;
    guardarBorrador();
}

/* ---------- Firma del cliente ---------- */

let trazando = false;
let ctxFirma = null;

/* El lienzo vive en un paso oculto: solo se puede medir cuando el paso 4 está a la vista. */
function prepararFirma() {
    const lienzo = $('lienzo-firma');
    const punto = (e) => {
        const caja = lienzo.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return { x: t.clientX - caja.left, y: t.clientY - caja.top };
    };
    const empezar = (e) => {
        if (!ctxFirma) return;
        e.preventDefault(); trazando = true;
        const p = punto(e); ctxFirma.beginPath(); ctxFirma.moveTo(p.x, p.y);
    };
    const seguir = (e) => {
        if (!trazando) return;
        e.preventDefault();
        const p = punto(e); ctxFirma.lineTo(p.x, p.y); ctxFirma.stroke();
    };
    const soltar = () => {
        if (!trazando) return;
        trazando = false;
        estado.firma = lienzo.toDataURL('image/png');
    };
    ['mousedown', 'touchstart'].forEach((ev) => lienzo.addEventListener(ev, empezar, { passive: false }));
    ['mousemove', 'touchmove'].forEach((ev) => lienzo.addEventListener(ev, seguir, { passive: false }));
    ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach((ev) => lienzo.addEventListener(ev, soltar));
}

/* Redimensionar borra el lienzo, así que solo se hace si cambió de tamaño, y se repinta la firma. */
function dimensionarFirma() {
    const lienzo = $('lienzo-firma');
    const escala = window.devicePixelRatio || 1;
    const ancho = Math.round(lienzo.offsetWidth * escala);
    const alto = Math.round(lienzo.offsetHeight * escala);
    if (!ancho || !alto) return;
    const trazos = estado.firma;
    if (lienzo.width !== ancho || lienzo.height !== alto) {
        lienzo.width = ancho;
        lienzo.height = alto;
    }
    ctxFirma = lienzo.getContext('2d');
    ctxFirma.setTransform(escala, 0, 0, escala, 0, 0);
    ctxFirma.lineWidth = 2.2;
    ctxFirma.lineCap = 'round';
    ctxFirma.lineJoin = 'round';
    ctxFirma.strokeStyle = '#0f172a';
    if (trazos) {
        const img = new Image();
        img.onload = () => ctxFirma.drawImage(img, 0, 0, lienzo.offsetWidth, lienzo.offsetHeight);
        img.src = trazos;
    }
}

function limpiarFirma() {
    const lienzo = $('lienzo-firma');
    if (ctxFirma) ctxFirma.clearRect(0, 0, lienzo.width, lienzo.height);
    estado.firma = null;
}

function alternarDocumentos(el) {
    estado.documentos = !estado.documentos;
    el.classList.toggle('activo', estado.documentos);
    guardarBorrador();
}

function alternarPoliza(el) {
    estado.poliza = !estado.poliza;
    el.classList.toggle('activo', estado.poliza);
    guardarBorrador();
}

/* ---------- PDF ---------- */

/* El mismo medidor del formulario, trazado con segmentos porque jsPDF no dibuja arcos. */
function dibujarCluster(doc, cx, cy, r, t) {
    const PASOS = 28;
    const trazar = (desde, hasta, grosor) => {
        doc.setLineWidth(grosor);
        let previo = puntoArco(cx, cy, r, desde);
        for (let i = 1; i <= PASOS; i++) {
            const p = puntoArco(cx, cy, r, desde + (hasta - desde) * (i / PASOS));
            doc.line(previo.x, previo.y, p.x, p.y);
            previo = p;
        }
    };
    doc.setDrawColor(205, 211, 220);
    trazar(0, 1, 1.8);
    if (t > 0) {
        doc.setDrawColor(59, 130, 246);
        trazar(0, t, 1.8);
    }
    doc.setDrawColor(120, 130, 150);
    doc.setLineWidth(0.4);
    [0, 0.25, 0.5, 0.75, 1].forEach((v) => {
        const a = puntoArco(cx, cy, r - 1.5, v);
        const b = puntoArco(cx, cy, r - (v % 0.5 === 0 ? 4 : 3), v);
        doc.line(a.x, a.y, b.x, b.y);
    });
    doc.setFontSize(6);
    doc.setTextColor(120, 130, 150);
    const ini = puntoArco(cx, cy, r, 0);
    const fin = puntoArco(cx, cy, r, 1);
    doc.text('E', ini.x - 1, ini.y + 4);
    doc.text('F', fin.x - 1, fin.y + 4);
    const aguja = puntoArco(cx, cy, r - 3, t);
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.7);
    doc.line(cx, cy, aguja.x, aguja.y);
    doc.setFillColor(30, 41, 59);
    doc.circle(cx, cy, 1, 'F');
    doc.setLineWidth(0.2);
}

/* Devuelve la foto con los círculos numerados ya quemados en el pixel. */
function fotoConMarcas(anguloId) {
    const foto = estado.fotos[anguloId];
    return new Promise((resolver) => {
        const img = new Image();
        img.onload = () => {
            const lienzo = document.createElement('canvas');
            lienzo.width = img.width;
            lienzo.height = img.height;
            const ctx = lienzo.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const radio = Math.max(img.width, img.height) * 0.028;
            const base = numeroBaseDe(anguloId);
            foto.marcas.forEach((m, i) => {
                const x = m.x * img.width;
                const y = m.y * img.height;
                ctx.beginPath();
                ctx.arc(x, y, radio, 0, Math.PI * 2);
                ctx.fillStyle = '#3b82f6';
                ctx.fill();
                ctx.lineWidth = radio * 0.18;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${radio * 1.2}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(base + i + 1), x, y);
            });
            resolver({ src: lienzo.toDataURL('image/jpeg', 0.75), w: img.width, h: img.height });
        };
        img.src = foto.src;
    });
}

async function generarPDF() {
    if (!validarPaso(1)) { irAPaso(1); return; }
    if (!ES_DEVOLUCION() && !estado.documentos) {
        avisar('Falta confirmar SOAT y tecnomecánica vigentes.');
        irAPaso(1);
        return;
    }
    if (!ES_DEVOLUCION() && !estado.poliza) {
        avisar('Falta confirmar la póliza todo riesgo: sin ella no se presta el servicio.');
        irAPaso(1);
        return;
    }
    if (!estado.terminos) {
        avisar(ES_DEVOLUCION()
            ? 'Falta que el cliente confirme que recibe a conformidad.'
            : 'Falta que el cliente acepte los términos antes de generar el acta.');
        return;
    }
    if (!estado.firma) {
        avisar('Falta la firma del cliente.');
        return;
    }
    const boton = $('btn-pdf');
    boton.disabled = true;
    boton.textContent = 'Generando acta...';

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const M = 14, ANCHO = 210, ALTO = 297, UTIL = ANCHO - M * 2;
        let y = M;
        const folio = consecutivo();

        const espacio = (alto) => {
            if (y + alto > ALTO - M) { doc.addPage(); y = M; }
        };
        const titulo = (texto) => {
            espacio(14);
            doc.setFillColor(2, 6, 23);
            doc.rect(M, y, UTIL, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(texto.toUpperCase(), M + 3, y + 5.5);
            y += 12;
            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'normal');
        };
        const par = (etiqueta, dato, columna) => {
            const x = columna === 0 ? M : M + UTIL / 2;
            doc.setFontSize(8);
            doc.setTextColor(120, 130, 150);
            doc.text(etiqueta, x, y);
            doc.setFontSize(10.5);
            doc.setTextColor(30, 41, 59);
            doc.text(String(dato || '—').slice(0, 46), x, y + 5);
            if (columna === 1) y += 12;
        };

        // Encabezado
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(2, 6, 23);
        doc.text('ZIPPY', M, y + 6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(120, 130, 150);
        doc.text(`Acta de ${ES_DEVOLUCION() ? 'devolución' : 'recogida'} de vehículo`, M, y + 12);
        doc.text(folio, ANCHO - M, y + 6, { align: 'right' });
        doc.text(new Date().toLocaleString('es-CO'), ANCHO - M, y + 12, { align: 'right' });
        y += 18;
        doc.setDrawColor(220, 226, 235);
        doc.line(M, y, ANCHO - M, y);
        y += 8;

        titulo(ES_DEVOLUCION() ? 'Cliente y devolución' : 'Cliente y recogida');
        par('Nombre', valor('cliente-nombre'), 0);
        par('Teléfono', valor('cliente-telefono'), 1);
        par('Dirección', valor('recogida-direccion'), 0);
        par('Fecha y hora', valor('recogida-fecha'), 1);
        par('Operador Zippy', valor('operador-nombre'), 0);
        par('Cédula del operador', valor('operador-cedula'), 1);

        titulo('Vehículo');
        par('Placa', (valor('placa') || '').toUpperCase(), 0);
        par('Marca y modelo', `${valor('marca')} ${valor('modelo')}`.trim(), 1);
        par('Año', valor('anio'), 0);
        par('Color', valor('color'), 1);
        par('Kilometraje', valor('kilometraje'), 0);
        const nivel = nivelCombustible();
        const xMedidor = M + UTIL / 2;
        doc.setFontSize(8);
        doc.setTextColor(120, 130, 150);
        doc.text('Combustible', xMedidor, y);
        dibujarCluster(doc, xMedidor + 13, y + 18, 11, nivel / 8);
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text(FRACCIONES[nivel], xMedidor + 30, y + 16);
        y += 24;

        titulo('Seguro y documentos');
        par('Aseguradora (todo riesgo)', valor('aseguradora'), 0);
        par('Vence SOAT', fechaLegible(valor('vence-soat')), 1);
        par('Vence tecnomecánica', fechaLegible(valor('vence-tecno')), 0);
        y += 12;
        if (!ES_DEVOLUCION()) {
            doc.setDrawColor(150, 160, 175);
            doc.rect(M, y - 3, 4, 4);
            doc.setTextColor(22, 130, 90);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('X', M + 0.9, y + 0.4);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(60, 72, 90);
            doc.text('Póliza vigente y ampara conductores autorizados.', M + 7, y);
            y += 7;
            doc.setDrawColor(150, 160, 175);
            doc.rect(M, y - 3, 4, 4);
            doc.setTextColor(22, 130, 90);
            doc.setFont('helvetica', 'bold');
            doc.text('X', M + 0.9, y + 0.4);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(60, 72, 90);
            doc.text('SOAT y revisión tecnomecánica vigentes.', M + 7, y);
            y += 10;
        }

        titulo('Destino y servicio');
        par('Taller aliado', tallerElegido(), 0);
        par('Servicio', valor('servicio'), 1);
        if (valor('servicio-detalle')) {
            doc.setFontSize(8);
            doc.setTextColor(120, 130, 150);
            doc.text('Detalle del servicio', M, y);
            doc.setFontSize(10);
            doc.setTextColor(30, 41, 59);
            const lineas = doc.splitTextToSize(valor('servicio-detalle'), UTIL);
            espacio(lineas.length * 5 + 8);
            doc.text(lineas, M, y + 5);
            y += lineas.length * 5 + 8;
        }

        // Fotos por ángulo, dos por fila
        const conFoto = ANGULOS.filter((a) => estado.fotos[a.id]);
        if (conFoto.length) {
            espacio(62);   // que el título no quede huérfano al final de una página
            titulo('Registro fotográfico');
            const ancho = (UTIL - 6) / 2;
            for (let i = 0; i < conFoto.length; i += 2) {
                const bloque = conFoto.slice(i, i + 2);
                const pintadas = await Promise.all(bloque.map((a) => fotoConMarcas(a.id)));
                const alturas = pintadas.map((p) => ancho * (p.h / p.w));
                espacio(Math.max(...alturas) + 10);
                bloque.forEach((ang, j) => {
                    const x = M + j * (ancho + 6);
                    doc.setFontSize(8);
                    doc.setTextColor(120, 130, 150);
                    doc.text(ang.label, x, y);
                    doc.addImage(pintadas[j].src, 'JPEG', x, y + 2, ancho, alturas[j]);
                });
                y += Math.max(...alturas) + 10;
            }
        }

        // Detalles señalados
        const marcas = marcasNumeradas();
        if (marcas.length) {
            espacio(28);
            titulo('Detalles señalados');
            for (const m of marcas) {
                const alto = m.foto ? 32 : 12;
                espacio(alto + 4);
                doc.setFillColor(59, 130, 246);
                doc.circle(M + 3.5, y + 3, 3.5, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text(String(m.numero), M + 3.5, y + 4.2, { align: 'center' });
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(30, 41, 59);
                doc.setFontSize(10);
                doc.text(`${m.angulo}: ${m.nota || 'sin anotación'}`, M + 10, y + 4.2);
                if (m.foto) {
                    doc.addImage(m.foto, 'JPEG', M + 10, y + 7, 32, 24);
                }
                y += alto + 4;
            }
        }

        // Inventario en dos columnas
        const inventario = listaInventario();
        const mitad = Math.ceil(inventario.length / 2);
        espacio(mitad * 6 + 20);
        titulo('Inventario recibido');
        doc.setFontSize(10);
        const inicio = y;
        let maxY = y;
        inventario.forEach((item, i) => {
            const columna = i < mitad ? 0 : 1;
            const fila = columna === 0 ? i : i - mitad;
            const x = M + columna * (UTIL / 2);
            const fy = inicio + fila * 6;
            const presente = !!estado.inventario[item];
            doc.setTextColor(presente ? 22 : 190, presente ? 130 : 60, presente ? 90 : 60);
            doc.text(presente ? 'SI' : 'NO', x, fy);
            doc.setTextColor(30, 41, 59);
            doc.text(item, x + 9, fy);
            maxY = Math.max(maxY, fy);
        });
        y = maxY + 10;

        if (valor('notas')) {
            titulo('Observaciones');
            const lineas = doc.splitTextToSize(valor('notas'), UTIL);
            espacio(lineas.length * 5 + 6);
            doc.setFontSize(10);
            doc.text(lineas, M, y);
            y += lineas.length * 5 + 6;
        }

        // Aceptación y firmas
        espacio(50);
        y += 4;
        doc.setDrawColor(150, 160, 175);
        doc.rect(M, y - 3, 4, 4);
        doc.setTextColor(22, 130, 90);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('X', M + 0.9, y + 0.4);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 72, 90);
        doc.setFontSize(9);
        doc.text(ES_DEVOLUCION()
            ? 'El cliente recibe el vehículo a conformidad, según el estado registrado en esta acta.'
            : 'El cliente entrega el vehículo y acepta los Términos y Condiciones de Zippy.', M + 7, y);
        y += 6;

        if (estado.firma) {
            doc.addImage(estado.firma, 'PNG', M, y, 60, 20);
        }
        y += 22;
        doc.setDrawColor(150, 160, 175);
        doc.line(M, y, M + 70, y);
        doc.line(ANCHO - M - 70, y, ANCHO - M, y);
        doc.setFontSize(8);
        doc.setTextColor(120, 130, 150);
        doc.text(`Firma del cliente — ${valor('cliente-nombre') || ''}`.slice(0, 46), M, y + 5);
        doc.text(`Operador Zippy — ${valor('operador-nombre') || ''}`.slice(0, 46), ANCHO - M - 70, y + 5);

        const nombre = `Acta_Zippy_${ES_DEVOLUCION() ? 'devolucion' : 'recogida'}_${(valor('placa') || 'SINPLACA').toUpperCase()}_${folio}.pdf`;
        doc.save(nombre);
        $('acciones-envio').classList.remove('hidden');
        $('nombre-pdf').textContent = nombre;
    } catch (e) {
        avisar('No se pudo generar el PDF. Revisa las fotos e intenta de nuevo.');
        console.error(e);
    } finally {
        boton.disabled = false;
        boton.textContent = 'Generar acta en PDF';
        lucide.createIcons();
    }
}

function enviarPorWhatsApp() {
    const tel = normalizarTelefono(valor('cliente-telefono'));
    if (!tel) { avisar('Falta el teléfono del cliente.'); return; }
    const marcas = marcasNumeradas();
    const mensaje = [
        `Hola ${valor('cliente-nombre')}, aquí Zippy.`,
        '',
        ES_DEVOLUCION()
            ? `Te devolvimos tu ${valor('marca')} ${valor('modelo')} de placa ${(valor('placa') || '').toUpperCase()}.`
            : `Recogimos tu ${valor('marca')} ${valor('modelo')} de placa ${(valor('placa') || '').toUpperCase()}.`,
        ES_DEVOLUCION()
            ? `Viene de ${tallerElegido()} tras ${valor('servicio') || 'el servicio'}.`
            : `Va para ${tallerElegido()} por ${valor('servicio') || 'servicio'}.`,
        marcas.length ? `Dejamos registrados ${marcas.length} detalle(s) del estado del vehículo.` : 'El vehículo se recogió sin detalles por registrar.',
        '',
        `Te adjuntamos el acta de ${ES_DEVOLUCION() ? 'devolución' : 'recogida'} en PDF.`,
    ].join('\n');
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`, '_blank');
}

function abrirDrive() {
    window.open('https://drive.google.com/drive/my-drive', '_blank');
}

function nuevaActa() {
    if (!confirm('¿Empezar un acta nueva? Se borran los datos y las fotos de esta.')) return;
    localStorage.removeItem(CLAVE_BORRADOR);
    location.reload();
}

/* ---------- Compuerta de acceso ----------
   Candado de cortesía: la página es estática, así que el hash viaja en el código.
   Esconde el acta de un visitante casual, no de alguien que lea el fuente.
   Para cambiar la clave: printf '%s' 'NUEVA' | shasum -a 256  ->  pega el resultado aquí. */

const HASH_CLAVE = '77fe9a9670cf93d0f96c4281ec37d4ef0412133ebb77f9692dd0baae7b65ca82';
const CLAVE_SESION = 'zippy_acta_acceso';

/* SHA-256 en JS puro: crypto.subtle no existe al abrir el archivo con file://. */
function sha256(texto) {
    const K = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    let h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

    const bytes = [];
    for (const cp of unescape(encodeURIComponent(texto))) bytes.push(cp.charCodeAt(0));
    const bits = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push((i < 4 ? Math.floor(bits / Math.pow(2, i * 8)) : 0) & 0xff);

    const rotar = (x, n) => (x >>> n) | (x << (32 - n));
    for (let bloque = 0; bloque < bytes.length; bloque += 64) {
        const w = new Array(64);
        for (let i = 0; i < 16; i++) {
            const o = bloque + i * 4;
            w[i] = (bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3];
        }
        for (let i = 16; i < 64; i++) {
            const s0 = rotar(w[i - 15], 7) ^ rotar(w[i - 15], 18) ^ (w[i - 15] >>> 3);
            const s1 = rotar(w[i - 2], 17) ^ rotar(w[i - 2], 19) ^ (w[i - 2] >>> 10);
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
        }
        let [a, b, c, d, e, f, g, hh] = h;
        for (let i = 0; i < 64; i++) {
            const S1 = rotar(e, 6) ^ rotar(e, 11) ^ rotar(e, 25);
            const ch = (e & f) ^ (~e & g);
            const t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
            const S0 = rotar(a, 2) ^ rotar(a, 13) ^ rotar(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const t2 = (S0 + maj) | 0;
            hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
        }
        h = h.map((v, i) => (v + [a, b, c, d, e, f, g, hh][i]) | 0);
    }
    return h.map((v) => (v >>> 0).toString(16).padStart(8, '0')).join('');
}

function intentarEntrar() {
    const clave = $('clave').value;
    if (!clave) return;
    if (sha256(clave) !== HASH_CLAVE) {
        $('error-clave').classList.remove('hidden');
        $('clave').value = '';
        return;
    }
    try { sessionStorage.setItem(CLAVE_SESION, '1'); } catch (e) { /* modo privado */ }
    abrirActa();
}

function abrirActa() {
    $('compuerta').classList.add('hidden');
    $('app').classList.remove('hidden');
    $('btn-cerrar-sesion').classList.remove('hidden');
    lucide.createIcons();
}

function cerrarSesion() {
    try { sessionStorage.removeItem(CLAVE_SESION); } catch (e) { /* nada */ }
    location.reload();
}

/* ---------- Arranque ---------- */

document.addEventListener('DOMContentLoaded', () => {
    let abierta = false;
    try { abierta = sessionStorage.getItem(CLAVE_SESION) === '1'; } catch (e) { /* modo privado */ }
    if (abierta) abrirActa();
    $('clave').addEventListener('keydown', (e) => { if (e.key === 'Enter') intentarEntrar(); });
    $('clave').addEventListener('input', () => $('error-clave').classList.add('hidden'));
    $('taller').innerHTML = TALLERES.map((t) => `<option value="${t}">${t}</option>`).join('');
    $('servicio').innerHTML = SERVICIOS.map((s) => `<option value="${s}">${s}</option>`).join('');
    pintarSlots();
    pintarInventario();
    pintarListas();
    prepararFirma();
    pintarCombustible();
    setTipoActa('recogida');
    cargarBorrador();
    CAMPOS_TEXTO.forEach((c) => {
        if ($(c)) $(c).addEventListener('input', guardarBorrador);
    });
    $('taller').addEventListener('change', alternarTallerOtro);
    $('marca').addEventListener('input', pintarModelos);
    $('nuevo-item').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); agregarItem(); } });
    irAPaso(1);
});
