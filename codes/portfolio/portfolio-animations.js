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
