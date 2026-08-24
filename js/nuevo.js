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

/* ---------- encuesta flotante: cuánto tiempo se te va en el taller ----------
   Se abre y cierra sin recargar. Cierra con Escape, tocando fuera o en la X.
   El resultado se calcula solo con lo que el usuario respondió; si no da una
   cifra creíble, se muestra un mensaje simple en vez de inventarla. */

(function () {
    'use strict';

    var WA = 'https://wa.me/573117055495';

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

    /* --- lectura de cada deslizador --- */

    function nf(n) {
        return n.toLocaleString('es-CO', { maximumFractionDigits: 1 });
    }

    function paint(i) {
        var input = sliders[i];
        var min = parseFloat(input.min), max = parseFloat(input.max);
        var val = parseFloat(input.value);
        input.style.setProperty('--fill', ((val - min) / (max - min) * 100) + '%');

        var out = questions[i].querySelector('[data-out]');
        var words = input.dataset.words;
        out.textContent = words
            ? words.split('|')[Math.round(val / (max / (words.split('|').length - 1)))]
            : nf(val);
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
        var veces = parseFloat(sliders[0].value);      // viajes redondos al año
        var porViaje = parseFloat(sliders[1].value);   // horas de una ida
        var pct = parseFloat(sliders[2].value);        // % en horario laboral
        var aplaza = parseFloat(sliders[3].value);

        var horas = veces * 2 * porViaje;              // ida y vuelta

        var big = document.getElementById('wizBig');
        var bigUnit = document.getElementById('wizBigUnit');
        var title = document.getElementById('wizTitle');
        var note = document.getElementById('wizNote');
        var wa = document.getElementById('wizWa');

        // Menos de dos horas al año no da para un titular: mejor decirlo así.
        if (horas < 2) {
            big.textContent = '';
            bigUnit.textContent = '';
            title.textContent = 'Con eso casi no pierdes tiempo.';
            note.textContent = 'Lo que respondiste no llega ni a dos horas al año. No te vamos a inflar la cifra. Cuando el taller te quede lejos o te coja la semana, escríbenos.';
            wa.href = WA + '?text=' + encodeURIComponent('Hola Zippy, quiero cotizar un traslado.');
            return;
        }

        big.textContent = nf(horas);
        bigUnit.textContent = 'horas al año';
        title.textContent = 'Eso es lo que se te va llevando y trayendo el carro.';

        var lines = [veces + ' idas y ' + veces + ' vueltas al año, a ' + nf(porViaje) + ' h cada viaje.'];
        var enTrabajo = horas * pct / 100;
        if (enTrabajo >= 1) lines.push('Unas ' + nf(enTrabajo) + ' h de esas caen en tu horario de trabajo.');
        if (aplaza >= 50) lines.push('Y ya has aplazado un mantenimiento por no tener cuándo.');
        note.textContent = lines.join(' ');

        wa.href = WA + '?text=' + encodeURIComponent(
            'Hola Zippy, calculé que se me van unas ' + nf(horas) +
            ' horas al año llevando y trayendo el carro. Quiero cotizar un traslado.');
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

    // El botón flotante aparece cuando el hero ya pasó.
    var revealFab = function () { fab.classList.toggle('is-ready', window.scrollY > 420); };
    window.addEventListener('scroll', revealFab, { passive: true });
    revealFab();
})();
