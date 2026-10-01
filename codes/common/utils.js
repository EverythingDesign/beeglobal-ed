// Add shared Webflow utilities here. This starter file has no runtime behavior.

/* Gooey hover shapes: Button Main (primary + secondary) and the swiper navigator. */
(() => {
  const buttonSelector = '.button_main_wrap:not([data-wf--button-main--variant="link"])';
  const navSelector = '.swiper-navigator';
  const arrowSelector = '.chevron-side-arrow_wrap';
  const buttonStates = new WeakMap();
  const navStates = new WeakMap();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canHover = window.matchMedia('(hover: hover)');
  const CAP_STEPS = 24;
  const SAMPLE_STEP = 2;
  // How far the circle slides out, as a fraction of height. Buttons rest with a .1 overlap, so their gap = TRAVEL - .1.
  const TRAVEL = .24;
  // The navigator's circles rest touching, so their gap is simply NAV_TRAVEL.
  const NAV_TRAVEL = .16;
  // Neck fillet, as a fraction of height. Pieces separate once their gap exceeds BLEND / 2.
  const BLEND = .18;

  function smoothMin(a, b, k) {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * .25;
  }

  // Traces the outline of a shape that is symmetric about y = height / 2, from its signed
  // distance function, and returns each separate piece left to right as an SVG path.
  // `inset` pulls the outline in by half the stroke so outlined shapes stay inside their box.
  function outlinePaths(minX, maxX, height, distance, inset) {
    const radius = height / 2;

    function inside(x, y) {
      return distance(x, y) <= -inset;
    }

    function edge(a, b) {
      const insideAtA = inside(a, radius);
      for (let i = 0; i < 12; i++) {
        const middle = (a + b) / 2;
        if (inside(middle, radius) === insideAtA) a = middle;
        else b = middle;
      }
      return (a + b) / 2;
    }

    function top(x) {
      if (inside(x, 0)) return 0;
      let low = 0;
      let high = radius;
      for (let i = 0; i < 12; i++) {
        const middle = (low + high) / 2;
        if (!inside(x, middle)) low = middle;
        else high = middle;
      }
      return (low + high) / 2;
    }

    // Subdivide steep or tightly curved steps (the neck as it pinches) so they don't facet.
    function refine([x0, y0], x1, y1, points, depth) {
      const xm = (x0 + x1) / 2;
      const ym = top(xm);
      if (depth < 8 && (Math.abs(y1 - y0) > 1 || Math.abs(ym - (y0 + y1) / 2) > .02)) {
        refine([x0, y0], xm, ym, points, depth + 1);
        refine([xm, ym], x1, y1, points, depth + 1);
      } else points.push([x1, y1]);
    }

    // Find each separate piece along the centre line (one while joined, two once a circle snaps free).
    const spans = [];
    const count = Math.ceil((maxX - minX) / SAMPLE_STEP);
    let start = null;
    let previousX = minX;
    for (let i = 0; i <= count; i++) {
      const x = minX + (maxX - minX) * i / count;
      const isInside = inside(x, radius);
      if (isInside && start === null) start = i ? edge(previousX, x) : x;
      else if (!isInside && start !== null) {
        spans.push([start, edge(previousX, x)]);
        start = null;
      }
      previousX = x;
    }
    if (start !== null) spans.push([start, maxX]);

    // Sample every piece's round ends by angle so they stay smooth instead of faceting.
    return spans.map(([a, b]) => {
      const cap = Math.min(radius, (b - a) / 2);
      const middle = b - a - 2 * cap;
      const middleCount = Math.ceil(middle / SAMPLE_STEP);
      const xs = [];
      for (let i = 0; i < CAP_STEPS; i++) xs.push(a + cap * (1 - Math.cos(Math.PI / 2 * i / CAP_STEPS)));
      for (let i = 0; i < middleCount; i++) xs.push(a + cap + middle * i / middleCount);
      for (let i = CAP_STEPS; i >= 0; i--) xs.push(b - cap * (1 - Math.cos(Math.PI / 2 * i / CAP_STEPS)));
      const points = [[xs[0], top(xs[0])]];
      for (let i = 1; i < xs.length; i++) refine(points[points.length - 1], xs[i], top(xs[i]), points, 0);
      return points;
    }).map(points => {
      const upper = points.map(([x, y]) => `L${x.toFixed(2)} ${y.toFixed(2)}`).join('');
      const lower = points.slice().reverse().map(([x, y]) => `L${x.toFixed(2)} ${(height - y).toFixed(2)}`).join('');
      return `M${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}${upper}${lower}Z`;
    });
  }

  function tweenProgress(state, onUpdate) {
    if (!window.gsap || reducedMotion.matches) {
      state.tween?.kill();
      state.progress = state.target;
      onUpdate();
      return;
    }
    state.tween = gsap.to(state, {
      progress: state.target,
      duration: .52,
      ease: 'power2.inOut',
      overwrite: true,
      onUpdate,
    });
  }

  function xSetter(element) {
    return window.gsap
      ? gsap.quickSetter(element, 'x', 'px')
      : x => { element.style.transform = `translate3d(${x}px, 0, 0)`; };
  }

  /* Button Main: a capsule joined to an arrow circle that slides out and separates. */

  function buttonPath(width, height, progress, inset) {
    const radius = height / 2;
    const travel = height * TRAVEL * progress;
    const bodyEnd = width - height * .9;
    const circleX = width - radius + travel;
    const blend = height * BLEND;

    function distance(x, y) {
      const bodyX = Math.max(radius, Math.min(x, bodyEnd - radius));
      const capsule = Math.hypot(x - bodyX, y - radius) - radius;
      const circle = Math.hypot(x - circleX, y - radius) - radius;
      return smoothMin(capsule, circle, blend);
    }

    return outlinePaths(0, width + travel, height, distance, inset).join('');
  }

  function measureButton(state) {
    const rect = state.button.getBoundingClientRect();
    state.width = rect.width;
    state.height = rect.height;
    const style = getComputedStyle(state.svg);
    state.inset = style.stroke === 'none' ? 0 : parseFloat(style.strokeWidth) / 2 || 0;
  }

  function drawButton(state) {
    const { width, height, progress } = state;
    if (!width || !height) return;
    const travel = height * TRAVEL * progress;
    state.svg.setAttribute('viewBox', `0 0 ${width + travel} ${height}`);
    state.svg.style.width = `${width + travel}px`;
    state.svg.style.height = `${height}px`;
    state.path.setAttribute('d', buttonPath(width, height, progress, state.inset));
    state.setIconX(travel);
    state.button.classList.add('is-ready');
  }

  function setupButton(root) {
    if (!root || buttonStates.has(root)) return buttonStates.get(root);
    const button = root.querySelector('.morph-button');
    const svg = button?.querySelector('.morph-button__background');
    const path = svg?.querySelector('path');
    const icon = button?.querySelector('.cta__icon');
    if (!button || !svg || !path || !icon) return null;
    // Webflow's base `svg { max-width: 100% }` would squash the widened viewBox on hover.
    svg.style.maxWidth = 'none';
    const state = { button, svg, path, icon, setIconX: xSetter(icon), progress: 0, target: 0, width: 0, height: 0, inset: 0, tween: null };
    buttonStates.set(root, state);
    measureButton(state);
    drawButton(state);
    resizeObserver?.observe(button);
    return state;
  }

  function setButtonTarget(root, active) {
    const state = setupButton(root);
    if (!state) return;
    const target = active ? 1 : 0;
    if (state.target !== target) {
      state.target = target;
      tweenProgress(state, () => drawButton(state));
    }
  }

  /* Swiper navigator: two touching arrow circles joined by a neck. The hovered one slides
     outward and separates, like the Button Main arrow. */

  function measureNav(nav) {
    const box = nav.root.getBoundingClientRect();
    for (const side of nav.sides) {
      const rect = side.wrap.getBoundingClientRect();
      side.center = rect.left + rect.width / 2 - box.left;
      side.radius = rect.height / 2;
      side.top = rect.top - box.top;
    }
  }

  function drawNav(nav) {
    const [left, right] = nav.sides;
    const height = left.radius * 2;
    if (!height) return;
    const blend = height * BLEND;
    const leftX = left.center - height * NAV_TRAVEL * left.progress;
    const rightX = right.center + height * NAV_TRAVEL * right.progress;
    const radius = left.radius;

    function distance(x, y) {
      return smoothMin(Math.hypot(x - leftX, y - radius) - radius, Math.hypot(x - rightX, y - radius) - radius, blend);
    }

    const minX = leftX - radius;
    const maxX = rightX + radius;
    const pieces = outlinePaths(minX, maxX, height, distance, 0);
    nav.svg.setAttribute('viewBox', `${minX} 0 ${maxX - minX} ${height}`);
    nav.svg.style.left = `${minX}px`;
    nav.svg.style.top = `${left.top}px`;
    nav.svg.style.width = `${maxX - minX}px`;
    nav.svg.style.height = `${height}px`;
    nav.path.setAttribute('d', pieces.join(''));
    nav.sides.forEach(side => side.setArrowX(side.direction * height * NAV_TRAVEL * side.progress));
  }

  function setupNav(root) {
    if (!root || navStates.has(root)) return navStates.get(root);
    const wraps = [...root.querySelectorAll(arrowSelector)];
    const prev = wraps.find(wrap => wrap.classList.contains('is-prev'));
    const next = wraps.find(wrap => wrap.classList.contains('is-next'));
    if (!prev || !next) return null;

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    // Fill with the arrows' own background colour, which the SVG takes over drawing.
    Object.assign(svg.style, { position: 'absolute', zIndex: '0', overflow: 'visible', pointerEvents: 'none', maxWidth: 'none', fill: getComputedStyle(prev).backgroundColor });
    const path = document.createElementNS(svgNS, 'path');
    svg.append(path);
    root.prepend(svg);

    const sides = [prev, next].map(wrap => {
      const chevron = wrap.querySelector('.chevron-side-arrow') || wrap.firstElementChild;
      // The next arrow is mirrored with rotateY(180deg), which flips its local x axis.
      const mirrored = new DOMMatrixReadOnly(getComputedStyle(wrap).transform).a < 0;
      const outward = wrap === prev ? -1 : 1;
      return { wrap, setArrowX: xSetter(chevron), direction: mirrored ? -outward : outward, progress: 0, target: 0, tween: null, center: 0, radius: 0, top: 0 };
    });

    const nav = { root, svg, path, sides };
    navStates.set(root, nav);
    measureNav(nav);
    drawNav(nav);
    // The SVG now draws the circles, so hide the wraps' own backgrounds.
    [prev, next].forEach(wrap => { wrap.style.backgroundColor = 'transparent'; });
    resizeObserver?.observe(root);
    return nav;
  }

  function setArrowTarget(wrap, active) {
    const nav = setupNav(wrap.closest(navSelector));
    const side = nav?.sides.find(item => item.wrap === wrap);
    if (!side) return;
    const target = active ? 1 : 0;
    if (side.target !== target) {
      side.target = target;
      tweenProgress(side, () => drawNav(nav));
    }
  }

  /* Shared resize and hover/focus wiring. */

  const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(entries => {
    for (const entry of entries) {
      const nav = navStates.get(entry.target);
      if (nav) {
        measureNav(nav);
        drawNav(nav);
        continue;
      }
      const root = entry.target.closest(buttonSelector);
      const state = root && buttonStates.get(root);
      if (state) {
        measureButton(state);
        drawButton(state);
      }
    }
  }) : null;

  if (!resizeObserver) window.addEventListener('resize', () => {
    document.querySelectorAll(buttonSelector).forEach(root => {
      const state = buttonStates.get(root);
      if (state) {
        measureButton(state);
        drawButton(state);
      }
    });
    document.querySelectorAll(navSelector).forEach(root => {
      const nav = navStates.get(root);
      if (nav) {
        measureNav(nav);
        drawNav(nav);
      }
    });
  });

  // Each hover target and how to switch it on or off.
  const targets = [
    [buttonSelector, setButtonTarget],
    [`${navSelector} ${arrowSelector}`, setArrowTarget],
  ];

  function handlePointer(event, active) {
    if (!canHover.matches || event.pointerType === 'touch') return;
    for (const [selector, setTarget] of targets) {
      const root = event.target.closest?.(selector);
      if (root && !root.contains(event.relatedTarget)) {
        setTarget(root, active || root.matches(':focus-within'));
      }
    }
  }

  function handleFocus(event, active) {
    for (const [selector, setTarget] of targets) {
      const root = event.target.closest?.(selector);
      if (!root) continue;
      if (active) setTarget(root, true);
      else requestAnimationFrame(() => {
        setTarget(root, root.matches(':focus-within') || (canHover.matches && root.matches(':hover')));
      });
    }
  }

  function start() {
    document.querySelectorAll(buttonSelector).forEach(setupButton);
    document.querySelectorAll(navSelector).forEach(setupNav);
    document.addEventListener('pointerover', event => handlePointer(event, true));
    document.addEventListener('pointerout', event => handlePointer(event, false));
    document.addEventListener('focusin', event => handleFocus(event, true));
    document.addEventListener('focusout', event => handleFocus(event, false));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

/* Portfolio marquee: the portfolio list autoscrolls in a seamless loop, can be dragged or flicked,
   and the swiper navigator in the same section steps it one card at a time. */
(() => {
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
