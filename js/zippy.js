/* Zippy — index.html
   Cero dependencias: ni librerías ni CDN. Los iconos son <symbol> dentro del
   propio HTML y la maqueta la resuelve css/zippy.css entera. */

(function () {
    'use strict';

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- header al hacer scroll ---------- */
    var header = document.getElementById('header');
    var onScroll = function () {
        header.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ---------- reveal ---------- */
    var reveals = document.querySelectorAll('.z-reveal');
    if (reduce || !('IntersectionObserver' in window)) {
        reveals.forEach(function (el) { el.classList.add('is-visible'); });
    } else {
        var revealObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) return;
                e.target.classList.add('is-visible');
                revealObs.unobserve(e.target);
            });
        }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
        reveals.forEach(function (el) { revealObs.observe(el); });
    }

    /* ---------- recorrido: la escena se queda fija y avanza con el scroll ----------
       La sección es un carril alto (.z-journey) con el escenario pegado
       dentro (.z-journey__stage, position: sticky). Lo único que manda es el
       progreso del scroll DENTRO de ese carril: 0 cuando el carril toca el
       borde de arriba de la pantalla, 1 cuando termina de despegarse.

       De ese progreso salen dos cosas:
       - el paso activo, que es el cuarto de recorrido en el que estás;
       - la posición del carro, que es CONTINUA: si bajas despacio el carro
         avanza despacio, y si subes, retrocede. No son cuatro posiciones
         fijas con saltos entre medias.

       El gesto no se secuestra nunca: no hay preventDefault ni scroll
       forzado. El usuario baja normal y, cuando el carril se acaba, la
       sección se despega sola y la página sigue.

       El evento scroll SOLO LEE (un getBoundingClientRect) y pide un cuadro.
       Todo lo que escribe estilos vive dentro del requestAnimationFrame, que
       es lo que evita los tirones. */

    var track = document.getElementById('journey');
    var stage = document.getElementById('journeyStage');
    var scene = document.getElementById('scene');
    if (!track || !stage || !scene) return;

    var rail = document.getElementById('rail');
    var cab = document.getElementById('journeyCab');
    var car = document.getElementById('journeyCar');
    var panel = document.getElementById('stepPanel');
    var steps = Array.prototype.slice.call(document.querySelectorAll('[data-step]'));
    var casa = scene.querySelector('.z-scene__place--home');
    var taller = scene.querySelector('.z-scene__place--shop');
    if (!rail || !cab || !car || !panel || !steps.length) return;

    // Puntos de control del carro sobre el riel: [progreso, fracción del riel].
    // Entre dos puntos se interpola, de ahí el movimiento continuo. Los tramos
    // planos son los pasos en los que el carro no viaja: en tu puerta mientras
    // se firma el acta, y en el taller mientras trabajan.
    var PASO = [[0, 0], [.22, 0], [.50, 1], [.72, 1], [.95, 0], [1, 0]];

    var largo = 0;      // px que puede recorrer el carro sobre el riel
    var vuelta = 0;     // grados de giro de rueda por px recorrido
    var altoEscena = 0; // alto del escenario pegado, cacheado
    var caja = null;    // último rect del carril, leído en el evento scroll
    var cuadro = 0;
    var activo = -1;

    // Todas las lecturas de layout viven aquí, y aquí no se pinta nada.
    function medir() {
        var ancho = car.getBoundingClientRect().width;
        largo = Math.max(0, rail.clientWidth - ancho);
        altoEscena = stage.offsetHeight;
        // La rueda rueda de verdad: una vuelta por cada 2πr de asfalto. El
        // radio es 9 en un viewBox de 140 de ancho, escalado al tamaño real.
        var radio = 9 * (ancho / 140);
        vuelta = radio > 0 ? 360 / (2 * Math.PI * radio) : 0;
    }

    function fraccion(p) {
        for (var i = 1; i < PASO.length; i++) {
            if (p <= PASO[i][0]) {
                var a = PASO[i - 1], b = PASO[i];
                var t = b[0] === a[0] ? 1 : (p - a[0]) / (b[0] - a[0]);
                return a[1] + (b[1] - a[1]) * t;
            }
        }
        return PASO[PASO.length - 1][1];
    }

    // Asfalto recorrido hasta p, en fracciones de riel y SIN signo: la ida y
    // la vuelta suman. La rueda tiene que girar con esto y no con la posición,
    // porque al volver el carro va volteado (scaleX(-1)) y ese espejo invierte
    // el sentido del giro: con la posición a secas, las ruedas patinarían
    // hacia atrás durante todo el regreso.
    function camino(p) {
        var s = 0;
        for (var i = 1; i < PASO.length; i++) {
            var a = PASO[i - 1], b = PASO[i];
            if (p >= b[0]) { s += Math.abs(b[1] - a[1]); continue; }
            var t = b[0] === a[0] ? 1 : (p - a[0]) / (b[0] - a[0]);
            return s + Math.abs(b[1] - a[1]) * t;
        }
        return s;
    }

    function pintar(p) {
        var x = largo * fraccion(p);

        cab.style.setProperty('--car-x', x + 'px');
        car.style.setProperty('--car-dir', p < .5 ? '1' : '-1');
        car.style.setProperty('--wheel', (camino(p) * largo * vuelta) + 'deg');

        var i = Math.floor(p * steps.length);
        if (i > steps.length - 1) i = steps.length - 1;
        if (i < 0) i = 0;
        if (i === activo) return;   // el resto solo se toca cuando cambia el paso
        activo = i;

        steps.forEach(function (b, n) {
            b.classList.toggle('is-active', n === i);
            b.setAttribute('aria-selected', n === i ? 'true' : 'false');
        });

        var enTaller = i === 1 || i === 2;
        casa.classList.toggle('is-active', !enTaller);
        taller.classList.toggle('is-active', enTaller);

        var texto = steps[i].querySelector('.z-step__c');
        var linea = document.createElement('p');
        linea.className = 'z-lead';
        linea.textContent = texto ? texto.textContent : '';
        panel.innerHTML = '';
        panel.appendChild(linea);
    }

    function calcular() {
        cuadro = 0;
        if (!caja) return;
        var recorrido = caja.height - altoEscena;
        var p = recorrido > 0 ? (-caja.top) / recorrido : 0;
        pintar(p < 0 ? 0 : (p > 1 ? 1 : p));
    }

    function alScroll() {
        caja = track.getBoundingClientRect();          // leer
        if (!cuadro) cuadro = requestAnimationFrame(calcular);   // escribir después
    }

    // Con movimiento reducido no hay sección pegajosa (lo quita el CSS) ni
    // escucha de scroll: la escena se deja en su estado final, el carro de
    // vuelta en tu puerta, y los cuatro pasos se leen uno debajo del otro con
    // su propia frase. Ningún paso queda marcado como activo porque ya no hay
    // uno "actual": están los cuatro a la vista.
    if (reduce) {
        medir();
        cab.style.setProperty('--car-x', '0px');
        car.style.setProperty('--car-dir', '-1');
        casa.classList.add('is-active');
        steps.forEach(function (b) { b.setAttribute('aria-selected', 'false'); });
        return;
    }

    window.addEventListener('scroll', alScroll, { passive: true });

    function remedir() {
        medir();
        alScroll();
    }

    window.addEventListener('resize', remedir);
    window.addEventListener('orientationchange', remedir);
    // Las tipografías llegan tarde y pueden cambiar el alto del escenario.
    window.addEventListener('load', remedir);

    // Los pasos siguen siendo tocables, pero ya no cambian de escena a mano:
    // llevan el scroll al punto del carril donde ese paso está activo, y de
    // ahí en adelante manda el scroll otra vez. Es un atajo, no un mando.
    steps.forEach(function (b, i) {
        b.addEventListener('click', function () {
            var r = track.getBoundingClientRect();
            var recorrido = r.height - altoEscena;
            if (recorrido <= 0) return;
            var y = (window.pageYOffset || 0) + r.top + recorrido * ((i + .5) / steps.length);
            if ('scrollBehavior' in document.documentElement.style) {
                window.scrollTo({ top: y, behavior: 'smooth' });
            } else {
                window.scrollTo(0, y);
            }
        });
    });

    medir();
    alScroll();
})();

/* ---------- encuesta flotante: cuánto te cuesta llevar y traer el carro ----------
   Se abre y cierra sin recargar. Cierra con Escape, tocando fuera o en la X.
   Todo lo que sale en pantalla se calcula con lo que el usuario respondió, y
   la cuenta se muestra paso a paso para que cualquiera la rehaga. Si no da
   una cifra creíble, se dice y no se infla. Nada se guarda ni se envía. */

(function () {
    'use strict';

    var WA = 'https://wa.me/573117055495';

    // Jornada legal en Colombia: 8 horas al día × 30 días = 240 horas al mes.
    // Es el divisor que convierte el sueldo mensual en valor de la hora.
    var HORAS_DIA = 8;
    var DIAS_MES = 30;
    var HORAS_MES = HORAS_DIA * DIAS_MES;   // 240

    var fab = document.getElementById('fab');
    var wiz = document.getElementById('wiz');
    if (!fab || !wiz) return;

    var card = document.getElementById('wizCard');
    var nav = document.getElementById('wizNav');
    var prev = document.getElementById('wizPrev');
    var next = document.getElementById('wizNext');
    var dots = document.getElementById('wizDots').children;
    var result = wiz.querySelector('[data-result]');
    var questions = Array.prototype.slice.call(wiz.querySelectorAll('[data-q]'));
    var sliders = questions.map(function (q) { return q.querySelector('input'); });

    var step = 0;              // índice de pregunta; questions.length = pantalla final
    var lastFocus = null;

    /* --- formato --- */

    var fmt = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

    function pesos(n) {
        return '$' + fmt.format(Math.round(n));
    }

    function nf(n) {
        return n.toLocaleString('es-CO', { maximumFractionDigits: 1 });
    }

    /* --- lectura de cada deslizador --- */

    function paint(i) {
        var input = sliders[i];
        var min = parseFloat(input.min), max = parseFloat(input.max);
        var val = parseFloat(input.value);
        input.style.setProperty('--fill', ((val - min) / (max - min) * 100) + '%');

        var out = questions[i].querySelector('[data-out]');
        var words = input.dataset.words;
        if (words) {
            var lista = words.split('|');
            out.textContent = lista[Math.round(val / (max / (lista.length - 1)))];
        } else if (input.hasAttribute('data-money')) {
            out.textContent = pesos(val);
        } else {
            out.textContent = nf(val);
        }
    }

    sliders.forEach(function (input, i) {
        input.addEventListener('input', function () { paint(i); });
        paint(i);
    });

    /* --- navegación --- */

    function show(n) {
        step = n;
        questions.forEach(function (q, i) { q.classList.toggle('is-on', i === n); });
        result.classList.toggle('is-on', n === questions.length);
        nav.hidden = n === questions.length;
        prev.hidden = n === 0;
        next.textContent = n === questions.length - 1 ? 'Ver el estimado' : 'Siguiente';
        for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('is-on', i === n);
        if (n === questions.length) compute();
    }

    /* --- el cálculo --- */

    function compute() {
        var veces = parseFloat(sliders[0].value);      // visitas al taller en el año
        var viaje = parseFloat(sliders[1].value);      // horas de una ida
        var espera = parseFloat(sliders[2].value);     // horas de una espera
        var aplaza = parseFloat(sliders[3].value);
        var sueldo = parseFloat(sliders[4].value);

        // Cada visita son dos idas y dos esperas: dejarlo y recogerlo.
        var horas = veces * 2 * (viaje + espera);
        var valorHora = sueldo / HORAS_MES;
        var costo = horas * valorHora;

        var big = document.getElementById('wizBig');
        var bigUnit = document.getElementById('wizBigUnit');
        var title = document.getElementById('wizTitle');
        var math = document.getElementById('wizMath');
        var note = document.getElementById('wizNote');
        var wa = document.getElementById('wizWa');

        // Menos de dos horas al año no da para un titular: mejor decirlo así.
        if (horas < 2) {
            big.textContent = '';
            bigUnit.textContent = '';
            math.innerHTML = '';
            title.textContent = 'Con eso casi no pierdes tiempo.';
            note.textContent = 'Lo que respondiste no llega ni a dos horas al año. No te vamos a inflar la cifra. Cuando el taller te quede lejos o te coja la semana, escríbenos.';
            wa.href = WA + '?text=' + encodeURIComponent('Hola Zippy, quiero cotizar un traslado.');
            return;
        }

        big.textContent = pesos(costo);
        bigUnit.textContent = 'al año en tiempo perdido';
        title.textContent = 'Eso te cuesta llevar y traer el carro.';

        // La cuenta, a la vista: quien quiera la rehace con una calculadora.
        math.innerHTML =
            '<li>' + veces + ' visitas al año, ida y vuelta, entre viaje y espera: <strong>' + nf(horas) + ' h</strong></li>' +
            '<li>' + HORAS_DIA + ' horas al día × ' + DIAS_MES + ' días = <strong>' + HORAS_MES + ' horas al mes</strong></li>' +
            '<li>' + pesos(sueldo) + ' ÷ ' + HORAS_MES + ' h = <strong>' + pesos(valorHora) + ' la hora</strong></li>' +
            '<li>' + nf(horas) + ' h × ' + pesos(valorHora) + ' = <strong>' + pesos(costo) + '</strong></li>';

        note.textContent = aplaza >= 50
            ? 'Y ya has aplazado un mantenimiento por no tener cuándo. Ese también sale caro.'
            : 'Ese tiempo se va en el trancón, en la espera y en la vuelta.';

        wa.href = WA + '?text=' + encodeURIComponent(
            'Hola Zippy, calculé que llevar y traer el carro me cuesta unos ' + pesos(costo) +
            ' al año. Quiero cotizar un traslado.');
    }

    /* --- abrir y cerrar --- */

    /* En iOS, overflow:hidden en el body NO frena el scroll de fondo: la
       página sigue corriendo detrás del diálogo. Lo único que funciona es
       fijar el body y devolverlo a su sitio exacto al cerrar. */
    var yGuardada = 0;

    function open() {
        lastFocus = document.activeElement;
        yGuardada = window.pageYOffset || 0;
        wiz.classList.add('is-open');
        wiz.setAttribute('aria-hidden', 'false');
        document.body.style.position = 'fixed';
        document.body.style.top = (-yGuardada) + 'px';
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.overflow = 'hidden';
        show(0);
        card.focus();
    }

    function close() {
        wiz.classList.remove('is-open');
        wiz.setAttribute('aria-hidden', 'true');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        // Volver seco: con el scroll-behavior suave del CSS, recolocar la
        // página sería un viaje visible de vuelta al sitio.
        var suave = document.documentElement.style.scrollBehavior;
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, yGuardada);
        document.documentElement.style.scrollBehavior = suave;
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    fab.addEventListener('click', open);
    next.addEventListener('click', function () { show(Math.min(step + 1, questions.length)); });
    prev.addEventListener('click', function () { show(Math.max(step - 1, 0)); });

    wiz.querySelectorAll('[data-wiz-close]').forEach(function (el) {
        el.addEventListener('click', close);
    });

    document.addEventListener('keydown', function (e) {
        if (!wiz.classList.contains('is-open')) return;
        if (e.key === 'Escape') { close(); return; }
        if (e.key !== 'Tab') return;

        // El foco no se sale de la tarjeta mientras el diálogo está abierto.
        var focusable = card.querySelectorAll('button:not([hidden]), a[href], input');
        var visible = Array.prototype.filter.call(focusable, function (el) { return el.offsetParent !== null; });
        if (!visible.length) return;
        var first = visible[0], last = visible[visible.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // El botón flotante aparece cuando el hero ya pasó, y se retira al llegar
    // al pie para no taparle los enlaces de términos y contacto.
    var revealFab = function () {
        var y = window.scrollY;
        var alFinal = y + window.innerHeight > document.body.scrollHeight - 140;
        fab.classList.toggle('is-ready', y > 420 && !alFinal);
    };
    window.addEventListener('scroll', revealFab, { passive: true });
    revealFab();
})();

/* ---------- tarjetas de la red: animar solo lo que está en pantalla ----------
   Seis tarjetas animándose a la vez es trabajo de más para un teléfono
   modesto. Cada una arranca al entrar en pantalla, escalonada, y se apaga al
   salir. Con prefers-reduced-motion no se enciende ninguna: el CSS ya deja
   cada dibujo legible en reposo. */

(function () {
    'use strict';

    var tiles = document.querySelectorAll('[data-svc]');
    if (!tiles.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        !('IntersectionObserver' in window)) return;

    var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            var i = Array.prototype.indexOf.call(tiles, e.target);
            if (e.isIntersecting) {
                setTimeout(function () { e.target.classList.add('is-live'); }, i * 180);
            } else {
                e.target.classList.remove('is-live');
            }
        });
    }, { threshold: 0.3 });

    Array.prototype.forEach.call(tiles, function (t) { obs.observe(t); });
})();

/* ---------- acceso interno al acta ----------
   El enlace público al formulario de recepción se retiró del pie: es una
   herramienta de los operadores, no del cliente. Queda detrás de UNA
   pulsación sostenida de cinco segundos sobre el logo del pie.

   No hay pista antes de tocar, ni en el marcado ni a la vista. A los 1,5 s,
   cuando el dedo ya lleva un rato encima y nadie llega ahí por accidente, el
   logo empieza a subir de opacidad y llega al máximo justo al cumplirse los
   cinco: lo único que delata que está pasando algo, y solo a quien ya está
   pulsando.

   Se cancela al soltar, al salirse del logo, si el navegador se lleva el
   puntero (pointercancel: en iOS pasa en cuanto el gesto se convierte en
   desplazamiento) o si el dedo se corre más de 10 px. Arrastrar o hacer
   scroll con el dedo apoyado ahí no abre nada.

   La URL directa recepcion.html sigue funcionando, que es como entra el
   equipo hoy. Esto es discreción, no seguridad: el acta tiene su propia
   clave. */

(function () {
    'use strict';

    var marca = document.getElementById('footmark');
    if (!marca) return;

    var MANTENER = 5000;    // ms de pulsación sostenida
    var PISTA = 1500;       // ms antes de dar la primera señal
    var TOLERANCIA = 10;    // px de desplazamiento admitidos

    var abrir = null, pista = null, x0 = 0, y0 = 0;

    function cancelar() {
        if (abrir) clearTimeout(abrir);
        if (pista) clearTimeout(pista);
        abrir = pista = null;
        marca.classList.remove('is-holding');
    }

    marca.addEventListener('pointerdown', function (e) {
        if (e.button > 0) return;          // clic derecho o secundario, no
        cancelar();
        x0 = e.clientX;
        y0 = e.clientY;
        pista = setTimeout(function () { marca.classList.add('is-holding'); }, PISTA);
        abrir = setTimeout(function () {
            cancelar();
            window.location.href = 'recepcion.html';
        }, MANTENER);
    });

    marca.addEventListener('pointermove', function (e) {
        if (!abrir) return;
        if (Math.abs(e.clientX - x0) > TOLERANCIA || Math.abs(e.clientY - y0) > TOLERANCIA) cancelar();
    });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
        marca.addEventListener(ev, cancelar);
    });

    // Si la página se mueve con el dedo apoyado, no era una pulsación.
    window.addEventListener('scroll', function () { if (abrir) cancelar(); }, { passive: true });

    // Mantener pulsado en el teléfono no debe abrir el menú del sistema.
    marca.addEventListener('contextmenu', function (e) { e.preventDefault(); });
})();

/* ---------- onda al tocar el botón de Silky ----------
   pointerdown cubre dedo y ratón con un solo escuchador. Se reutiliza el
   mismo <span> en cada toque, reiniciando la animación, en vez de ir
   añadiendo nodos. Con prefers-reduced-motion no se engancha nada: el CSS
   deja el cambio de tono al pulsar y la onda oculta. */

(function () {
    'use strict';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.querySelectorAll('.z-btn--silky').forEach(function (boton) {
        var onda = boton.querySelector('.z-ripple');
        if (!onda) return;

        boton.addEventListener('pointerdown', function (e) {
            var caja = boton.getBoundingClientRect();
            onda.style.setProperty('--rx', (e.clientX - caja.left) + 'px');
            onda.style.setProperty('--ry', (e.clientY - caja.top) + 'px');
            onda.classList.remove('is-on');
            void onda.offsetWidth;   // fuerza el reinicio de la animación
            onda.classList.add('is-on');
        });
    });
})();

/* ---------- el botón de Silky del header ----------
   Depende del botón de Silky del hero, así que se observa ese elemento en vez
   de escuchar scroll y comparar pixeles en cada cuadro. Mientras el del hero
   se vea, el del header está oculto e inerte; cuando sale de pantalla, entra. */

(function () {
    'use strict';

    var hero = document.getElementById('silkyHero');
    var header = document.getElementById('silkyHeader');
    if (!hero || !header) return;

    function mostrar(si) {
        header.classList.toggle('is-in', si);
        if (si) header.removeAttribute('inert');
        else header.setAttribute('inert', '');
    }

    // Sin IntersectionObserver es preferible que se vea siempre a que no se vea nunca.
    if (!('IntersectionObserver' in window)) { mostrar(true); return; }

    new IntersectionObserver(function (entries) {
        mostrar(!entries[0].isIntersecting);
    }, { threshold: 0 }).observe(hero);
})();

/* ---------- interruptor de tema: claro / oscuro / según el sistema ----------
   Sin elección guardada manda prefers-color-scheme (ya resuelto por CSS,
   incluso en vivo si el sistema cambia). Si el usuario toca el botón, su
   elección se guarda en localStorage y gana siempre, en los dos sentidos. */

(function () {
    'use strict';

    var STORAGE_KEY = 'zippy-tema';
    var root = document.documentElement;
    var btn = document.getElementById('temaToggle');
    if (!btn) return;

    var mql = window.matchMedia('(prefers-color-scheme: light)');
    var metaColor = document.querySelector('meta[name="theme-color"]');

    function temaActual() {
        var explicito = root.getAttribute('data-tema');
        if (explicito === 'claro' || explicito === 'oscuro') return explicito;
        return mql.matches ? 'claro' : 'oscuro';
    }

    function pintar() {
        var esClaro = temaActual() === 'claro';
        if (metaColor) metaColor.setAttribute('content', esClaro ? '#f3f6fb' : '#020617');
        btn.setAttribute('aria-label', esClaro
            ? 'Modo claro activo. Cambiar a modo oscuro.'
            : 'Modo oscuro activo. Cambiar a modo claro.');
    }

    btn.addEventListener('click', function () {
        var siguiente = temaActual() === 'claro' ? 'oscuro' : 'claro';
        root.setAttribute('data-tema', siguiente);
        try { localStorage.setItem(STORAGE_KEY, siguiente); } catch (e) {}
        pintar();
    });

    // Sin elección guardada, si el sistema cambia en vivo lo seguimos.
    mql.addEventListener('change', function () {
        if (!root.hasAttribute('data-tema')) pintar();
    });

    pintar();
})();
