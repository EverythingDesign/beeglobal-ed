// Hero side panel pull tab.
(function () {
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

      function setOpen(open) {
        inner.classList.toggle('is-open', open);
        heading.setAttribute('aria-expanded', String(open));
      }

      inner.addEventListener('click', (event) => {
        if (inner.classList.contains('is-open')) {
          setOpen(false);
        } else if (heading.contains(event.target)) {
          setOpen(true);
        }
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
