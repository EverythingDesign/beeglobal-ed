// Portfolio hero: turn the four existing "At a glance" blocks into one Swiper.
// Load swiper-bundle.min.js before this file in the Webflow page footer.
(function () {
  function setupMetrics(root) {
    const viewport = root.querySelector('.metrics-data');
    const counter = root.querySelector('.swiper-pagination-number');
    const prev = root.querySelector('.metrics-swiper-navigator .is-prev');
    const next = root.querySelector('.metrics-swiper-navigator .is-next');
    if (!viewport || viewport.swiper || !counter || !prev || !next) return;

    const existingWrapper = viewport.querySelector(':scope > .swiper-wrapper');
    const slides = [...(existingWrapper || viewport).children];
    if (slides.length < 2) return;
    if (typeof window.Swiper !== 'function') {
      console.warn('Portfolio metrics: load the Swiper bundle before portfolio-animations.js.');
      return;
    }

    const numberSelector = '[data-wf--typography-plain--variant="h2"] span';
    const metrics = slides.map((slide) => {
      const label = slide.querySelector(numberSelector)?.textContent.trim() || '';
      const match = label.match(/^([\d,]+)(.*)$/);
      return { label, value: match ? Number(match[1].replaceAll(',', '')) : null, suffix: match?.[2] || '' };
    });
    const number = slides[0].querySelector('[data-wf--typography-plain--variant="h2"]')?.cloneNode(true);
    if (!number) return;
    number.classList.add('metrics-number-display');

    // Use Webflow's Swiper wrapper when present; support the earlier flat markup too.
    const wrapper = existingWrapper || document.createElement('div');
    if (!existingWrapper) {
      wrapper.className = 'swiper-wrapper';
      viewport.appendChild(wrapper);
    }
    slides.forEach((slide) => {
      slide.classList.add('swiper-slide');
      if (!existingWrapper) wrapper.appendChild(slide);
    });
    viewport.appendChild(number);
    viewport.classList.add('swiper');
    viewport.setAttribute('aria-label', 'At a glance statistics');

    // Scope the essential Swiper layout here: the page currently loads the JS bundle without
    // Swiper's stylesheet, and Webflow's general .swiper class allows overflow.
    if (!document.getElementById('portfolio-metrics-swiper-style')) {
      const style = document.createElement('style');
      style.id = 'portfolio-metrics-swiper-style';
      style.textContent = `
        .metrics_wrap_outer { min-width: 0; max-width: 100%; }
        .metrics-data.swiper { position: relative; display: block; width: 100%; min-width: 0; max-width: 100%; overflow: hidden; }
        .metrics-data .swiper-wrapper { position: relative; z-index: 1; display: flex; width: 100%; height: 100%; box-sizing: content-box; transition-property: transform; }
        .metrics-data .swiper-slide { position: relative; display: block; width: 100%; height: auto; flex-shrink: 0; transition-property: transform; }
        .metrics-data .swiper-slide [data-wf--typography-plain--variant="h2"] { visibility: hidden; }
        .metrics-data .metrics-number-display { position: absolute; top: 0; left: 0; z-index: 2; margin: 0; pointer-events: none; }
        .metrics-swiper-navigator .is-next { position: relative; }
        .metrics-swiper-navigator .metrics-progress-ring { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; transform: rotate(-90deg) scaleY(-1); }
        .metrics-swiper-navigator .metrics-progress-ring circle { fill: none; stroke: var(--swatch--deep-blue, #153138); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 100; stroke-dashoffset: 100; }
      `;
      document.head.appendChild(style);
    }

    const numbers = counter.querySelectorAll('.pagination-num');
    const current = numbers[0];
    const total = numbers[2];
    const digits = Math.max(2, String(slides.length).length);
    const format = (number) => String(number).padStart(digits, '0');
    counter.setAttribute('aria-live', 'polite');
    if (total) total.textContent = format(slides.length);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const progressRing = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    progressRing.setAttribute('class', 'metrics-progress-ring');
    progressRing.setAttribute('viewBox', '0 0 100 100');
    progressRing.setAttribute('aria-hidden', 'true');
    progressRing.innerHTML = '<circle cx="50" cy="50" r="48" pathLength="100" />';
    next.appendChild(progressRing);
    const progressCircle = progressRing.querySelector('circle');
    let displayedValue = metrics[0].value;
    let numberTween = null;

    function updateMetric(instance, animate) {
      const index = instance.realIndex;
      if (current) current.textContent = format(index + 1);

      const metric = metrics[index];
      numberTween?.kill();

      const from = displayedValue;
      const valueDisplay = number.querySelector('span');
      if (!valueDisplay || metric.value === null) return;
      if (!animate || reducedMotion.matches || !window.gsap || from === null) {
        valueDisplay.textContent = metric.label;
        displayedValue = metric.value;
        return;
      }

      // The value stays in place and counts while the description slides sideways.
      const state = { value: from };
      const render = () => {
        displayedValue = state.value;
        valueDisplay.textContent = `${Math.round(state.value)}${metric.suffix}`;
      };
      render();
      numberTween = window.gsap.to(state, {
        value: metric.value,
        duration: .7,
        ease: 'power2.out',
        onUpdate: render,
        onComplete: () => {
          displayedValue = metric.value;
          valueDisplay.textContent = metric.label;
          numberTween = null;
        },
      });
    }

    const swiper = new window.Swiper(viewport, {
      slidesPerView: 1,
      speed: 650,
      loop: true,
      autoplay: reducedMotion.matches ? false : {
        delay: 3000,
        disableOnInteraction: false,
      },
      on: {
        init(instance) {
          updateMetric(instance, false);
        },
        realIndexChange(instance) {
          updateMetric(instance, true);
        },
        autoplayTimeLeft(_instance, _timeLeft, percentage) {
          progressCircle.style.strokeDashoffset = String(Math.max(0, Math.min(1, percentage)) * 100);
        },
      },
    });

    // A manual step starts a fresh three-second countdown on the new metric.
    const move = (direction) => {
      swiper[direction]();
      if (swiper.autoplay?.running) {
        swiper.autoplay.stop();
        swiper.autoplay.start();
      }
    };
    [[prev, 'Previous statistic', () => move('slidePrev')],
      [next, 'Next statistic', () => move('slideNext')]].forEach(([arrow, label, navigate]) => {
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
  // originals: a tap opens the details, the close button shuts them, a tap elsewhere closes.
  function wireCopy(card, signal) {
    const toggle = card.querySelector('.spotlight_card_toggle');
    const setOpen = (open) => {
      card.classList.toggle('is-open', open);
      toggle?.setAttribute('aria-expanded', String(open));
    };
    card.addEventListener('click', (event) => {
      if (event.target.closest('a, .spotlight_card_close')) return;
      setOpen(true);
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
