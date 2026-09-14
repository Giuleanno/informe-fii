/* ============================================================
   FII — Fundación Instituto de Ingeniería
   main.js — Comportamiento compartido de todas las páginas del sitio.

   Cada init* busca sus propios elementos con getElementById/querySelector
   y no hace nada si no los encuentra. Por eso este mismo archivo sirve sin
   cambios para cualquier página nueva del menú (Biblioteca, Dr. Humberto
   Fernández Morán, Olimpiadas E.T., Comuna o Nada, Semillero, FORMATEC...),
   tenga o no hero, carrusel, contadores, etc. — basta con incluir:

     <script src="assets/js/main.js" defer></script>

   El único script que NO vive aquí es el de modo claro/oscuro que va
   inline en el <head> de cada página: ese debe ejecutarse antes del
   primer pintado para evitar parpadeo de color, algo que un script
   externo con `defer` no puede garantizar.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Año del footer ---------- */
  function initYear() {
    var el = document.getElementById('year');
    if (!el) return;
    el.textContent = new Date().getFullYear();
  }

  /* ---------- Modo claro / oscuro (botón + persistencia) ----------
     El <html data-theme> ya lo fija el script inline del <head> antes de
     pintar; esto solo conecta el botón una vez que el DOM está listo. */
  var THEME_KEY = 'fii-theme';

  function initTheme() {
    var toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    function applyTheme(isLight) {
      if (isLight) {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      toggle.setAttribute('aria-pressed', String(isLight));
      toggle.setAttribute('aria-label', isLight ? 'Activar modo oscuro' : 'Activar modo claro');
    }

    applyTheme(document.documentElement.getAttribute('data-theme') === 'light');

    toggle.addEventListener('click', function () {
      var isLight = document.documentElement.getAttribute('data-theme') !== 'light';
      applyTheme(isLight);
      try { localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark'); } catch (e) {}
    });
  }

  /* ---------- Precargador ---------- */
  // Debe superar --dur-hero (0.8s, ver styles.css) para que el ícono termine
  // de aparecer antes de que la cortina empiece a deslizarse.
  var PRELOADER_HOLD_MS = 1150;

  function initPreloader() {
    var preloader = document.getElementById('preloader');
    if (!preloader) return;

    window.addEventListener('load', function () {
      var delay = reduceMotion ? 0 : PRELOADER_HOLD_MS;
      setTimeout(function () {
        preloader.classList.add('is-hidden');
        preloader.addEventListener('transitionend', function () {
          preloader.style.display = 'none';
        }, { once: true });
      }, delay);
    });
  }

  /* ---------- Header: estado al hacer scroll + menú mobile ---------- */
  function initHeader() {
    var header = document.getElementById('header');
    if (!header) return;

    window.addEventListener('scroll', function () {
      header.classList.toggle('header--scrolled', window.scrollY > 8);
    }, { passive: true });

    var navToggle = document.getElementById('navToggle');
    var navMenu = document.getElementById('navMenu');
    if (!navToggle || !navMenu) return;

    navToggle.addEventListener('click', function () {
      var isOpen = navMenu.classList.toggle('header__nav--open');
      navToggle.setAttribute('aria-expanded', isOpen);
      navToggle.classList.toggle('header__toggle--active');
    });

    navMenu.querySelectorAll('.header__menu-link').forEach(function (link) {
      link.addEventListener('click', function () {
        navMenu.classList.remove('header__nav--open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.classList.remove('header__toggle--active');
      });
    });
  }

  /* ---------- Botones magnéticos ----------
     El rebote (duración/curva) vive en CSS como --transition-spring; este
     código solo calcula la posición y alterna .is-tracking. */
  var MAGNETIC_PULL = 0.18; // fracción de la distancia al cursor que el botón recorre (sutil, no "persecución")

  function initMagneticButtons() {
    if (reduceMotion) return;
    document.querySelectorAll('.btn--magnetic').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var relX = e.clientX - (r.left + r.width / 2);
        var relY = e.clientY - (r.top + r.height / 2);
        el.classList.add('is-tracking');
        el.style.transform = 'translate(' + relX * MAGNETIC_PULL + 'px,' + relY * MAGNETIC_PULL + 'px)';
      });
      el.addEventListener('mouseleave', function () {
        el.classList.remove('is-tracking');
        el.style.transform = 'translate(0,0)';
      });
    });
  }

  /* ---------- Parallax del hero ---------- */
  var HERO_PARALLAX_FACTOR = 0.15;
  var HERO_PARALLAX_MAX_PX = 90;

  function initHeroParallax() {
    if (reduceMotion) return;
    var heroBg = document.getElementById('heroBg');
    if (!heroBg) return;

    window.addEventListener('scroll', function () {
      requestAnimationFrame(function () {
        var y = Math.min(window.scrollY * HERO_PARALLAX_FACTOR, HERO_PARALLAX_MAX_PX);
        heroBg.style.transform = 'translate3d(0,' + y + 'px,0) scale(1.08)';
      });
    }, { passive: true });
  }

  /* ---------- Revelado en cascada al hacer scroll ---------- */
  var REVEAL_THRESHOLD = 0.18;
  var REVEAL_ROOT_MARGIN = '0px 0px -8% 0px';

  function initScrollReveal() {
    var revealEls = document.querySelectorAll('[data-reveal]');
    if (!revealEls.length) return;

    if (!('IntersectionObserver' in window) || reduceMotion) {
      revealEls.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: REVEAL_THRESHOLD, rootMargin: REVEAL_ROOT_MARGIN });

    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Contadores de cifras ---------- */
  var COUNTER_THRESHOLD = 0.6;
  var COUNTER_DURATION_MS = 1100;

  function countUp(el) {
    var target = parseFloat(el.dataset.count);
    var suffix = el.dataset.suffix || '';
    var start = null;

    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / COUNTER_DURATION_MS, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function initCounters() {
    var statEls = document.querySelectorAll('[data-count]');
    if (!statEls.length || !('IntersectionObserver' in window) || reduceMotion) return;

    var statIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.textContent = '0' + (entry.target.dataset.suffix || '');
          countUp(entry.target);
          statIo.unobserve(entry.target);
        }
      });
    }, { threshold: COUNTER_THRESHOLD });

    statEls.forEach(function (el) { statIo.observe(el); });
  }

  /* ---------- Carrusel de noticias ---------- */
  function initCarousel() {
    var track = document.getElementById('noticiasTrack');
    var prevBtn = document.getElementById('noticiasPrev');
    var nextBtn = document.getElementById('noticiasNext');
    if (!track || !prevBtn || !nextBtn) return;

    function cardStep() {
      var card = track.querySelector('.noticia');
      if (!card) return 0;
      var style = getComputedStyle(track);
      var gap = parseFloat(style.columnGap || style.gap || 0);
      return card.getBoundingClientRect().width + gap;
    }

    function updateArrows() {
      var max = track.scrollWidth - track.clientWidth;
      prevBtn.disabled = track.scrollLeft <= 4;
      nextBtn.disabled = track.scrollLeft >= max - 4;
    }

    prevBtn.addEventListener('click', function () {
      track.scrollBy({ left: -cardStep(), behavior: 'smooth' });
    });
    nextBtn.addEventListener('click', function () {
      track.scrollBy({ left: cardStep(), behavior: 'smooth' });
    });
    track.addEventListener('scroll', function () {
      window.requestAnimationFrame(updateArrows);
    });
    window.addEventListener('resize', updateArrows);
    updateArrows();
  }

  initYear();
  initTheme();
  initPreloader();
  initHeader();
  initMagneticButtons();
  initHeroParallax();
  initScrollReveal();
  initCounters();
  initCarousel();
})();
