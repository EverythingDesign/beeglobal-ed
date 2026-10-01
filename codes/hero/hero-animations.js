
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


