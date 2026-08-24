/* Zippy — nuevo.html
   Sin dependencias: solo lucide (CDN) para los iconos. */

(function () {
    'use strict';

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- iconos ---------- */
    if (window.lucide) window.lucide.createIcons();

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

    /* ---------- recorrido: casa -> taller -> casa ----------
       Cada paso define dónde para el carro (fracción del riel), hacia dónde
       mira y qué lugar se resalta. Solo se anima `transform`. */

    var scene = document.getElementById('scene');
    if (!scene) return;

    var rail = document.getElementById('rail');
    var car = document.getElementById('journeyCar');
    var panel = document.getElementById('stepPanel');
    var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-step]'));
    var places = {
        home: document.querySelector('.z-scene__place--home'),
        shop: document.querySelector('.z-scene__place--shop')
    };

    var STEPS = [
        { at: 0, dir: 1, place: 'home' },  // en tu puerta
        { at: 1, dir: 1, place: 'shop' },  // en camino al taller
        { at: 1, dir: -1, place: 'shop' },  // el taller trabaja
        { at: 0, dir: -1, place: 'home' }   // de vuelta contigo
    ];

    var current = -1;
    var drivingTimer = null;
    var autoTimer = null;

    function place(index) {
        var step = STEPS[index];
        var span = rail.clientWidth - car.getBoundingClientRect().width;
        car.style.setProperty('--car-x', (span * step.at) + 'px');
        car.style.setProperty('--car-dir', step.dir);
    }

    function go(index, fromUser) {
        if (index === current) return;
        var prev = current;
        current = index;
        var step = STEPS[index];

        place(index);

        // Las ruedas y las líneas de la vía solo giran mientras el carro se desplaza.
        var moves = prev >= 0 && STEPS[prev].at !== step.at;
        clearTimeout(drivingTimer);
        if (moves && !reduce) {
            scene.dataset.dir = step.at > STEPS[prev].at ? '1' : '-1';
            scene.classList.add('is-driving');
            drivingTimer = setTimeout(function () {
                scene.classList.remove('is-driving');
            }, 1900);
        } else {
            scene.classList.remove('is-driving');
        }

        buttons.forEach(function (b, i) {
            b.classList.toggle('is-active', i === index);
            b.setAttribute('aria-selected', i === index ? 'true' : 'false');
        });
        places.home.classList.toggle('is-active', step.place === 'home');
        places.shop.classList.toggle('is-active', step.place === 'shop');

        panel.innerHTML = '<p class="z-lead">' + buttons[index].dataset.copy + '</p>';

        if (fromUser) stopAuto();
    }

    function stopAuto() {
        clearInterval(autoTimer);
        autoTimer = null;
    }

    function startAuto() {
        if (reduce || autoTimer) return;
        autoTimer = setInterval(function () {
            go((current + 1) % STEPS.length);
        }, 4600);
    }

    buttons.forEach(function (b, i) {
        b.addEventListener('click', function () { go(i, true); });
    });

    window.addEventListener('resize', function () { place(current); });

    go(0);

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            entries[0].isIntersecting ? startAuto() : stopAuto();
        }, { threshold: 0.35 }).observe(scene);
    } else {
        startAuto();
    }
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

    function open() {
        lastFocus = document.activeElement;
        wiz.classList.add('is-open');
        wiz.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        show(0);
        card.focus();
    }

    function close() {
        wiz.classList.remove('is-open');
        wiz.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
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
   herramienta de los operadores, no del cliente. Queda detrás de cinco
   toques seguidos sobre el logo del pie, con la cuenta reiniciándose si se
   demora más de 1,2 s entre toques, para que nadie llegue por accidente.
   Uno o dos toques no hacen nada visible. La URL directa recepcion.html
   sigue funcionando, que es como entra el equipo hoy. Esto es discreción,
   no seguridad: el acta tiene su propia clave. */

(function () {
    'use strict';

    var marca = document.getElementById('footmark');
    if (!marca) return;

    var TOQUES = 5;
    var VENTANA = 1200;
    var cuenta = 0;
    var ultimo = 0;

    marca.addEventListener('click', function () {
        var ahora = Date.now();
        cuenta = (ahora - ultimo > VENTANA) ? 1 : cuenta + 1;
        ultimo = ahora;
        if (cuenta >= TOQUES) {
            cuenta = 0;
            window.location.href = 'recepcion.html';
        }
    });

    // Mantener pulsado en el teléfono no debe abrir el menú del sistema.
    marca.addEventListener('contextmenu', function (e) { e.preventDefault(); });
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
