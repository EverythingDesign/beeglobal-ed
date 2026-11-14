// Start smooth scrolling after the deferred GSAP and Lenis scripts have run.
// DOMContentLoaded fires after deferred scripts, so their globals are available.
(function () {
  function start() {
    if (!window.Lenis || window.Webflow?.env?.('editor')) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Touch-only devices already use native scrolling. Avoid Lenis layout
    // measurements and its animation-frame loop when it cannot help scrolling.
    if (matchMedia('(hover: none) and (pointer: coarse)').matches) return;

    const lenis = new Lenis({ autoRaf: !window.gsap, autoToggle: true });
    window.lenis = lenis;
    if (window.gsap) {
      if (window.ScrollTrigger) lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
