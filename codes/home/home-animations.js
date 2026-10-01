
// Hero heading: reveal the words word by word. Webflow splits the heading with SplitText and
// gsap.sets each .word to { opacity: 0, yPercent: 100 } once fonts load, so wait for those words first.
// Once .home-hero_anim_trigger scrolls into view, the heading plays its reveal in reverse and the
// hero paragraph fades in; scrolling back above the trigger swaps them back.
(function () {
  const HEADING_SELECTOR = '.home-hero-heading';
  const TRIGGER_SELECTOR = '.home-hero_anim_trigger';
  const PARA_SELECTOR = '.home-hero-para';
  // The trigger counts as "in view" once its top rises above this fraction of the viewport height.
  const TRIGGER_LINE = .8;
  // Scroll swaps replay the heading intro this many times faster than on page load.
  const SWAP_SPEED = 2.5;
  // Paragraph fade in/out, in seconds.
  const PARA_DURATION = .4;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // The split runs after document.fonts.ready, which can land after DOMContentLoaded.
  function whenSplit(heading) {
    return new Promise((resolve) => {
      const words = () => heading.querySelectorAll('.word');
      if (words().length) return resolve(words());
      const observer = new MutationObserver(() => {
        if (!words().length) return;
        observer.disconnect();
        resolve(words());
      });
      observer.observe(heading, { childList: true, subtree: true });
    });
  }

  function setupHero() {
    const heading = document.querySelector(HEADING_SELECTOR);
    if (!heading || !window.gsap) return;

    const paras = document.querySelectorAll(PARA_SELECTOR);
    const trigger = document.querySelector(TRIGGER_SELECTOR);
    let intro = null;
    // true once the trigger is in view (or scrolled past): heading out, paragraph in.
    let swapped = false;

    gsap.set(paras, { opacity: 0 });

    // Reduced motion jumps straight to each end state instead of animating.
    function playHeading(speed = 1) {
      if (!intro) return;
      intro.timeScale(speed);
      if (reducedMotion.matches) intro.progress(swapped ? 0 : 1).pause();
      else if (swapped) intro.reverse();
      else intro.play();
    }

    function showPara(visible) {
      gsap.to(paras, {
        opacity: visible ? 1 : 0,
        duration: reducedMotion.matches ? 0 : PARA_DURATION,
        ease: 'power2.out',
        overwrite: true,
      });
    }

    // The paragraph only comes in once the heading has fully gone (see onReverseComplete below);
    // it leaves straight away when the heading comes back.
    function setSwapped(next) {
      if (next === swapped) return;
      swapped = next;
      playHeading(SWAP_SPEED);
      if (!swapped) showPara(false);
      else if (!intro || intro.progress() === 0) showPara(true);
    }

    whenSplit(heading).then((words) => {
      intro = gsap.to(words, {
        opacity: 1,
        yPercent: 0,
        duration: 1.25,
        ease: 'power3.out',
        stagger: .05,
        paused: true,
        onReverseComplete: () => {
          if (swapped) showPara(true);
        },
      });
      playHeading();
    });

    if (!trigger) return;
    // Compare positions on scroll rather than using IntersectionObserver: a fast jump from below
    // the trigger to above it (or back) never "intersects", so an observer would miss the swap.
    let frame = 0;
    function check() {
      frame = 0;
      setSwapped(trigger.getBoundingClientRect().top < window.innerHeight * TRIGGER_LINE);
    }
    const queueCheck = () => { frame ||= requestAnimationFrame(check); };
    window.addEventListener('scroll', queueCheck, { passive: true });
    window.addEventListener('resize', queueCheck);
    check();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupHero, { once: true });
  } else {
    setupHero();
  }
})();

// Hero side panel pull tab.
(function () {
  // Drawer contents that trail the panel's slide and settle with a slight overshoot.
  // Legend rows are targeted directly because their wrappers are display: contents.
  const ITEM_SELECTOR = ':scope > p, :scope > .card-divider, .u-flex-horizontal-nowrap';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Grace period (ms) before a hover-opened legend closes after the pointer leaves it.
  const CLOSE_DELAY = 150;

  function setupHeroSidePanels() {
    const panels = document.querySelectorAll('.hero_side-panel_inner');
    if (!panels.length) return;

    panels.forEach((inner, index) => {
      if (inner.dataset.sidePanelReady === 'true') return;

      const heading = inner.querySelector('.hero_side-panel_heading');
      const box = inner.querySelector('.hero_side-panel_box');
      if (!heading) return;

      inner.dataset.sidePanelReady = 'true';
      heading.setAttribute('role', 'button');
      heading.setAttribute('tabindex', '0');
      heading.setAttribute('aria-expanded', 'false');

      if (box) {
        box.id ||= `hero-side-panel-content-${index + 1}`;
        heading.setAttribute('aria-controls', box.id);
      }

      const items = box ? box.querySelectorAll(ITEM_SELECTOR) : [];
      let itemsTween = null;

      // The panel's local y points along its slide, so a +y offset makes each item lag the drawer.
      function animateItems(open) {
        if (!window.gsap || !items.length) return;
        itemsTween?.progress(1).kill();
        if (!open || reducedMotion.matches) return;
        itemsTween = gsap.fromTo(items, { y: 28, autoAlpha: 0 }, {
          y: 0,
          autoAlpha: 1,
          duration: .6,
          delay: .1,
          ease: 'back.out(1.7)',
          stagger: .05,
          clearProps: 'transform,opacity,visibility',
        });
      }

      let closeTimer = 0;
      let lastPointerType = '';

      function setOpen(open) {
        clearTimeout(closeTimer);
        if (inner.classList.contains('is-open') === open) return;
        inner.classList.toggle('is-open', open);
        heading.setAttribute('aria-expanded', String(open));
        animateItems(open);
      }

      const isHoverPointer = (event) => event.pointerType === 'mouse' || event.pointerType === 'pen';

      // Mouse and pen: open on hover, close shortly after leaving so brushing an edge doesn't snap it shut.
      heading.addEventListener('pointerenter', (event) => {
        if (isHoverPointer(event)) setOpen(true);
      });

      inner.addEventListener('pointerenter', (event) => {
        if (isHoverPointer(event)) clearTimeout(closeTimer);
      });

      inner.addEventListener('pointerleave', (event) => {
        if (!isHoverPointer(event)) return;
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => setOpen(false), CLOSE_DELAY);
      });

      // Touch: tap the tab to open; while open, a tap inside the legend closes it.
      inner.addEventListener('pointerdown', (event) => {
        lastPointerType = event.pointerType;
      });

      inner.addEventListener('click', (event) => {
        if (lastPointerType !== 'touch') return;
        if (inner.classList.contains('is-open')) {
          setOpen(false);
        } else if (heading.contains(event.target)) {
          setOpen(true);
        }
      });

      // A tap or click anywhere outside the legend closes it. pointerdown rather than click,
      // because iOS Safari doesn't dispatch document clicks for taps on non-interactive areas.
      document.addEventListener('pointerdown', (event) => {
        if (inner.classList.contains('is-open') && !inner.contains(event.target)) setOpen(false);
      });

      heading.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setOpen(!inner.classList.contains('is-open'));
        }
      });

      inner.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && inner.classList.contains('is-open')) {
          setOpen(false);
          heading.focus();
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupHeroSidePanels, { once: true });
  } else {
    setupHeroSidePanels();
  }
})();

// Portfolio marquee: the portfolio list autoscrolls in a seamless loop, can be dragged or flicked,
// and the swiper navigator in the same section steps it one card at a time.
(function () {
  const listSelector = '.portfolio-list-wrapper';
  // Cruising speed in px per second; the list drifts left.
  const SPEED = 40;
  // How quickly a flick or drag release eases back to cruising speed (higher = sooner).
  const SETTLE = 2.5;
  // Pointer travel (px) after which a press counts as a drag rather than a click.
  const DRAG_THRESHOLD = 5;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setupMarquee(root) {
    const track = root.querySelector('.swiper-wrapper') || root.firstElementChild;
    const originals = track ? [...track.children] : [];
    if (!window.gsap || originals.length < 2) return;

    const state = { offset: 0, velocity: 0, setWidth: 0, edges: [], dragging: false, tween: null, tweenTarget: 0 };
    const setX = gsap.quickSetter(track, 'x', 'px');
    let wrap = gsap.utils.wrap(-1, 0);
    let copies = 0;

    function appendCopy() {
      originals.forEach(slide => {
        const clone = slide.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.inert = true;
        track.append(clone);
      });
      copies++;
    }

    function render() {
      setX(wrap(state.offset));
    }

    // Clone the slide set until one full set can scroll out of view with the track still reaching
    // the right edge of the viewport. Wrapping by exactly one measured set keeps the loop seamless.
    function layout() {
      if (!copies) appendCopy();
      state.setWidth = track.children[originals.length].offsetLeft - originals[0].offsetLeft;
      // Card left edges within one set; cards can differ in width, so arrows snap to these.
      state.edges = originals.map(slide => slide.offsetLeft - originals[0].offsetLeft);
      if (!state.setWidth) return;
      const sets = Math.ceil((window.innerWidth - Math.max(root.getBoundingClientRect().left, 0)) / state.setWidth) + 1;
      while (copies + 1 < sets) appendCopy();
      wrap = gsap.utils.wrap(-state.setWidth, 0);
      render();
    }

    function tick(time, deltaTime) {
      if (state.dragging || state.tween) return;
      const dt = Math.min(deltaTime, 64) / 1000;
      const cruise = reducedMotion.matches ? 0 : -SPEED;
      state.velocity += (cruise - state.velocity) * (1 - Math.exp(-SETTLE * dt));
      state.offset += state.velocity * dt;
      render();
    }

    // Card index n sits at -cardEdge(n); indexes run on through the clones, so they never wrap.
    function cardEdge(index) {
      const count = state.edges.length;
      const set = Math.floor(index / count);
      return set * state.setWidth + state.edges[index - set * count];
    }

    function nearestCard(offset) {
      const position = -offset;
      const set = Math.floor(position / state.setWidth);
      const within = position - set * state.setWidth;
      // The next set's first card is a candidate too, for positions near the end of a set.
      const edges = [...state.edges, state.setWidth];
      let best = 0;
      edges.forEach((edge, i) => {
        if (Math.abs(edge - within) < Math.abs(edges[best] - within)) best = i;
      });
      return set * state.edges.length + best;
    }

    // Arrows: snap to the neighbouring card's edge; rapid clicks queue up from the last target.
    function stepBy(direction) {
      const from = state.tween ? state.tweenTarget : state.offset;
      state.tweenTarget = -cardEdge(nearestCard(from) + direction);
      state.velocity = 0;
      state.tween?.kill();
      const done = () => { state.tween = null; };
      state.tween = gsap.to(state, { offset: state.tweenTarget, duration: .7, ease: 'power3.out', onUpdate: render, onComplete: done, onInterrupt: done });
    }

    // Drag with mouse or touch. touch-action: pan-y keeps vertical page scrolling on touch screens.
    let startX = 0;
    let lastX = 0;
    let lastTime = 0;
    let moved = 0;
    root.style.touchAction = 'pan-y';
    root.style.cursor = 'grab';

    root.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      state.tween?.kill();
      state.dragging = true;
      state.velocity = 0;
      moved = 0;
      startX = lastX = event.clientX;
      lastTime = event.timeStamp;
      root.setPointerCapture(event.pointerId);
      root.style.cursor = 'grabbing';
      if (event.pointerType === 'mouse') event.preventDefault();
    });

    root.addEventListener('pointermove', event => {
      if (!state.dragging) return;
      const dx = event.clientX - lastX;
      const dt = Math.max(event.timeStamp - lastTime, 1) / 1000;
      state.offset += dx;
      // Smooth the release velocity over the last few moves.
      state.velocity = state.velocity * .6 + dx / dt * .4;
      moved = Math.max(moved, Math.abs(event.clientX - startX));
      lastX = event.clientX;
      lastTime = event.timeStamp;
      render();
    });

    function release(event) {
      if (!state.dragging) return;
      state.dragging = false;
      root.style.cursor = 'grab';
      // Held still before letting go: no flick.
      if (event.timeStamp - lastTime > 100) state.velocity = 0;
      state.velocity = gsap.utils.clamp(-3000, 3000, state.velocity);
    }

    root.addEventListener('pointerup', release);
    root.addEventListener('pointercancel', release);
    // A drag shouldn't also count as a click on whatever is under the pointer.
    root.addEventListener('click', event => {
      if (moved > DRAG_THRESHOLD) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);

    const nav = root.closest('section')?.querySelector('.swiper-navigator');
    nav?.querySelectorAll('.chevron-side-arrow_wrap').forEach(arrow => {
      const next = arrow.classList.contains('is-next');
      arrow.setAttribute('role', 'button');
      arrow.setAttribute('tabindex', '0');
      arrow.setAttribute('aria-label', next ? 'Next' : 'Previous');
      const go = () => stepBy(next ? 1 : -1);
      arrow.addEventListener('click', go);
      arrow.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          go();
        }
      });
    });

    // Pause while the list is out of view: the tick comes off GSAP's ticker entirely, and any
    // arrow tween is paused. The margin restarts it just before it scrolls back into view.
    let playing = false;

    function play() {
      if (playing) return;
      playing = true;
      gsap.ticker.add(tick);
      state.tween?.resume();
    }

    function pause() {
      if (!playing) return;
      playing = false;
      gsap.ticker.remove(tick);
      state.tween?.pause();
    }

    let resizeFrame = 0;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(layout);
    });

    track.style.willChange = 'transform';
    layout();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => (entry.isIntersecting ? play() : pause()), { rootMargin: '100px 0px' }).observe(root);
    } else {
      play();
    }
  }

  function start() {
    document.querySelectorAll(listSelector).forEach(setupMarquee);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
