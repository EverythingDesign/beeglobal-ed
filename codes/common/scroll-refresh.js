// Coalesce layout measurements made while the home preloader covers the page.
// On pages without a preloader, requests run on the next animation frame.
(function () {
  let pending = false;

  window.requestHomeScrollRefresh = function () {
    if (pending || !window.ScrollTrigger) return;
    pending = true;
    Promise.resolve(window.preloaderHidden).then(() => {
      requestAnimationFrame(() => {
        pending = false;
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      });
    });
  };
})();
