// Portfolio and Team heroes: the "At a glance" statistics. One statistic shows at a time and
// they cycle every four seconds, counted down by a ring drawn around the next arrow. The number
// rolls up out of view as the next one rolls in from below (down when stepping back), and the
// caption only fades: out quickly, then the new one in. Needs GSAP, loaded before this file.
(function () {
  // Seconds each statistic stays up, and the length of the number roll.
  const DELAY = 4;
  const ROLL = 0.45;
  const NUMBER = '[data-wf--typography-plain--variant="h2"]';

  function setupMetrics(root) {
    const gsap = window.gsap;
    const viewport = root.querySelector('.metrics-data');
    const counter = root.querySelector('.swiper-pagination-number');
    const prev = root.querySelector('.metrics-swiper-navigator .is-prev');
    const next = root.querySelector('.metrics-swiper-navigator .is-next');
    if (!gsap || !viewport || viewport.dataset.metricsReady || !counter || !prev || !next) return;

    const wrapper = viewport.querySelector(':scope > .metrics-data-wrapper, :scope > .swiper-wrapper') || viewport;
    const slides = [...wrapper.children].filter((slide) => slide.querySelector(NUMBER));
    if (slides.length < 2) return;
    viewport.dataset.metricsReady = 'true';
    viewport.setAttribute('aria-label', 'At a glance statistics');
    const labels = slides.map((slide) => slide.querySelector(`${NUMBER} span`)?.textContent.trim() || '');

    // The slides share one grid cell, so the block keeps the height of the tallest caption and
    // nothing below it moves. Each slide's own number only holds its space: the visible number is
    // a copy in a clipped window over that spot, where it rolls.
    if (!document.getElementById('portfolio-metrics-style')) {
      const style = document.createElement('style');
      style.id = 'portfolio-metrics-style';
      style.textContent = `
        .metrics_wrap_outer { min-width: 0; max-width: 100%; }
        .metrics-data[data-metrics-ready] { position: relative; }
        .metrics-data[data-metrics-ready] > .metrics-data-wrapper,
        .metrics-data[data-metrics-ready] > .swiper-wrapper { display: grid; }
        .metrics-data[data-metrics-ready] [data-metric-slide] { grid-area: 1 / 1; width: 100%; }
        .metrics-data[data-metrics-ready] [data-metric-slide] ${NUMBER} { visibility: hidden; }
        .metrics-roll { position: absolute; left: 0; right: 0; overflow: clip; pointer-events: none; }
        .metrics-roll > div { position: relative; }
        .metrics-roll ${NUMBER} { margin: 0; }
        .metrics-swiper-navigator .is-next { position: relative; }
        .metrics-swiper-navigator .metrics-progress-ring { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; transform: rotate(-90deg) scaleY(-1); }
        .metrics-swiper-navigator .metrics-progress-ring circle { fill: none; stroke: var(--swatch--deep-blue, #153138); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 100; stroke-dashoffset: 100; }
      `;
      document.head.appendChild(style);
    }
    slides.forEach((slide) => slide.setAttribute('data-metric-slide', ''));

    const template = slides[0].querySelector(NUMBER);
    const roll = document.createElement('div');
    roll.className = 'metrics-roll';
    roll.setAttribute('aria-hidden', 'true');
    const track = document.createElement('div');
    roll.appendChild(track);
    viewport.appendChild(roll);
    const makeNumber = (label) => {
      const copy = template.cloneNode(true);
      const span = copy.querySelector('span');
      if (span) span.textContent = label;
      return copy;
    };
    let shown = makeNumber(labels[0]);
    track.appendChild(shown);
    // The window sits exactly over the slides' number and is one line tall.
    const placeRoll = () => {
      roll.style.top = `${template.offsetTop}px`;
      roll.style.height = `${template.offsetHeight}px`;
    };
    placeRoll();
    window.addEventListener('resize', placeRoll);
    if (document.fonts) document.fonts.ready.then(placeRoll);

    const numbers = counter.querySelectorAll('.pagination-num');
    const current = numbers[0];
    const total = numbers[2];
    const digits = Math.max(2, String(slides.length).length);
    const format = (n) => String(n).padStart(digits, '0');
    counter.setAttribute('aria-live', 'polite');
    if (total) total.textContent = format(slides.length);
    if (current) current.textContent = format(1);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    // The countdown ring: it closes clockwise from the top over DELAY seconds.
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ring.setAttribute('class', 'metrics-progress-ring');
    ring.setAttribute('viewBox', '0 0 100 100');
    ring.setAttribute('aria-hidden', 'true');
    ring.innerHTML = '<circle cx="50" cy="50" r="48" pathLength="100" />';
    next.appendChild(ring);
    const circle = ring.querySelector('circle');

    let index = 0;
    let rollTween = null;
    gsap.set(slides.slice(1), { autoAlpha: 0 });

    function rollTo(label, direction) {
      // A roll still running finishes at once, so quick clicks stay in step.
      rollTween?.progress(1);
      if (reducedMotion.matches) {
        const span = shown.querySelector('span');
        if (span) span.textContent = label;
        return;
      }
      const incoming = makeNumber(label);
      Object.assign(incoming.style, { position: 'absolute', left: '0', top: direction > 0 ? '100%' : '-100%' });
      track.appendChild(incoming);
      rollTween = gsap.to(track, {
        yPercent: -100 * direction,
        duration: ROLL,
        ease: 'power2.inOut',
        onComplete: () => {
          shown.remove();
          shown = incoming;
          incoming.style.position = incoming.style.left = incoming.style.top = '';
          gsap.set(track, { yPercent: 0 });
          rollTween = null;
        },
      });
    }

    function fadeTo(from, to) {
      gsap.killTweensOf(slides);
      slides.forEach((slide) => { if (slide !== from && slide !== to) gsap.set(slide, { autoAlpha: 0 }); });
      if (reducedMotion.matches) {
        gsap.set(from, { autoAlpha: 0 });
        gsap.set(to, { autoAlpha: 1 });
        return;
      }
      gsap.to(from, { autoAlpha: 0, duration: 0.12, ease: 'power1.in' });
      gsap.fromTo(to, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, delay: 0.12, ease: 'power1.out' });
    }

    // The countdown: the ring closes over DELAY seconds, then the next statistic comes up.
    let timer = null;
    function restartTimer() {
      timer?.kill();
      gsap.set(circle, { strokeDashoffset: 100 });
      if (reducedMotion.matches) return;
      timer = gsap.to(circle, { strokeDashoffset: 0, duration: DELAY, ease: 'none', onComplete: () => go(1) });
      if (!visible) timer.pause();
    }

    function go(direction) {
      const from = slides[index];
      index = (index + direction + slides.length) % slides.length;
      if (current) current.textContent = format(index + 1);
      rollTo(labels[index], direction);
      fadeTo(from, slides[index]);
      restartTimer();
    }

    // The countdown holds while the block is off screen.
    let visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) timer?.resume();
        else timer?.pause();
      }).observe(root);
    }
    restartTimer();

    // A manual step starts a fresh countdown on the new statistic.
    [[prev, 'Previous statistic', () => go(-1)],
      [next, 'Next statistic', () => go(1)]].forEach(([arrow, label, navigate]) => {
      arrow.setAttribute('role', 'button');
      arrow.setAttribute('tabindex', '0');
      arrow.setAttribute('aria-label', label);
      arrow.addEventListener('click', navigate);
      arrow.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        navigate();
      });
    });
  }

  function start() {
    document.querySelectorAll('.metrics_wrap_outer').forEach(setupMetrics);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

// Spotlight ticker, phones only (479px and below): the spotlight cards drift left in a seamless
// loop like the Home portfolio marquee, and can be dragged or flicked. It eases to a stop while a
// card's details are open and picks up again once they close.
(function () {
  const ROOT_SELECTOR = '.spotlight-card-wrap-outer';
  const PHONE = '(max-width: 479px)';
  // Cruising speed in px per second; the cards drift left.
  const SPEED = 40;
  // How quickly a flick, drag release or stop eases to the target speed (higher = sooner).
  const SETTLE = 2.5;
  // Pointer travel (px) after which a press counts as a drag rather than a tap.
  const DRAG_THRESHOLD = 5;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Copies of the cards get the same tap behaviour the card component's own script gives the
  // originals: a tap opens the details, the + (turned into the x) or the close button shuts
  // them, a tap elsewhere closes.
  function wireCopy(card, signal) {
    const toggle = card.querySelector('.spotlight_card_toggle');
    const setOpen = (open) => {
      card.classList.toggle('is-open', open);
      toggle?.setAttribute('aria-expanded', String(open));
      toggle?.setAttribute('aria-label', open ? 'Hide details' : 'Show details');
    };
    card.addEventListener('click', (event) => {
      if (event.target.closest('a, .spotlight_card_close')) return;
      setOpen(!(event.target.closest('.spotlight_card_toggle') && card.classList.contains('is-open')));
    }, { signal });
    card.querySelector('.spotlight_card_close')?.addEventListener('click', (event) => {
      event.stopPropagation();
      setOpen(false);
    }, { signal });
    document.addEventListener('click', (event) => {
      if (!card.contains(event.target)) setOpen(false);
    }, { signal });
  }

  function setupTicker(root) {
    const track = root.querySelector('.spotlight-card-wrap');
    const originals = track ? [...track.children] : [];
    if (originals.length < 2) return null;

    const listeners = new AbortController();
    const { signal } = listeners;
    const state = { offset: 0, velocity: 0, setWidth: 0, dragging: false };
    const setX = gsap.quickSetter(track, 'x', 'px');
    let wrap = gsap.utils.wrap(-1, 0);
    const clones = [];

    function appendCopy() {
      originals.forEach((item) => {
        const clone = item.cloneNode(true);
        // Screen readers get the originals once; the copies are for looks and taps.
        clone.setAttribute('aria-hidden', 'true');
        clone.querySelectorAll('a, button').forEach((el) => el.setAttribute('tabindex', '-1'));
        clone.querySelectorAll('.spotlight_card').forEach((card) => {
          card.classList.remove('is-open', 'is-dismissed');
          wireCopy(card, signal);
        });
        track.append(clone);
        clones.push(clone);
      });
    }

    function render() {
      setX(wrap(state.offset));
    }

    // Clone the card set until one full set can scroll out of view with the track still reaching
    // the right edge of the screen. Wrapping by exactly one measured set keeps the loop seamless.
    function layout() {
      if (!clones.length) appendCopy();
      state.setWidth = track.children[originals.length].offsetLeft - originals[0].offsetLeft;
      if (!state.setWidth) return;
      const sets = Math.ceil((window.innerWidth - Math.max(root.getBoundingClientRect().left, 0)) / state.setWidth) + 1;
      while (clones.length / originals.length + 1 < sets) appendCopy();
      wrap = gsap.utils.wrap(-state.setWidth, 0);
      render();
    }

    function tick(time, deltaTime) {
      if (state.dragging) return;
      const dt = Math.min(deltaTime, 64) / 1000;
      const reading = track.querySelector('.spotlight_card.is-open');
      const cruise = reducedMotion.matches || reading ? 0 : -SPEED;
      state.velocity += (cruise - state.velocity) * (1 - Math.exp(-SETTLE * dt));
      state.offset += state.velocity * dt;
      render();
    }

    // Drag with touch or mouse. touch-action: pan-y keeps vertical page scrolling.
    let startX = 0;
    let lastX = 0;
    let lastTime = 0;
    let moved = 0;
    root.style.touchAction = 'pan-y';

    root.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      state.dragging = true;
      state.velocity = 0;
      moved = 0;
      startX = lastX = event.clientX;
      lastTime = event.timeStamp;
      root.setPointerCapture(event.pointerId);
    }, { signal });

    root.addEventListener('pointermove', (event) => {
      if (!state.dragging) return;
      const dx = event.clientX - lastX;
      const dt = Math.max(event.timeStamp - lastTime, 1) / 1000;
      state.offset += dx;
      // Smooth the release velocity over the last few moves.
      state.velocity = state.velocity * 0.6 + (dx / dt) * 0.4;
      moved = Math.max(moved, Math.abs(event.clientX - startX));
      lastX = event.clientX;
      lastTime = event.timeStamp;
      render();
    }, { signal });

    function release(event) {
      if (!state.dragging) return;
      state.dragging = false;
      // Held still before letting go: no flick.
      if (event.timeStamp - lastTime > 100) state.velocity = 0;
      state.velocity = gsap.utils.clamp(-3000, 3000, state.velocity);
    }
    root.addEventListener('pointerup', release, { signal });
    root.addEventListener('pointercancel', release, { signal });
    // A drag shouldn't also open the card it started on.
    root.addEventListener('click', (event) => {
      if (moved > DRAG_THRESHOLD) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, { capture: true, signal });

    // Pause while the cards are out of view.
    let playing = false;
    const play = () => { if (!playing) { playing = true; gsap.ticker.add(tick); } };
    const pause = () => { if (playing) { playing = false; gsap.ticker.remove(tick); } };
    let resizeFrame = 0;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(layout);
    }, { signal });

    track.style.willChange = 'transform';
    layout();
    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => (entry.isIntersecting ? play() : pause()), { rootMargin: '100px 0px' })
      : null;
    if (observer) observer.observe(root);
    else play();

    // Leaving phone width puts everything back as it was.
    return () => {
      pause();
      observer?.disconnect();
      listeners.abort();
      cancelAnimationFrame(resizeFrame);
      clones.forEach((clone) => clone.remove());
      gsap.set(track, { clearProps: 'transform,willChange' });
      root.style.touchAction = '';
    };
  }

  function start() {
    if (!window.gsap) return;
    gsap.matchMedia().add(PHONE, () => {
      const teardowns = [...document.querySelectorAll(ROOT_SELECTOR)].map(setupTicker).filter(Boolean);
      return () => teardowns.forEach((teardown) => teardown());
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
