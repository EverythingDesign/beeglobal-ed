// Section text reveals as each element scrolls into view and reverses on scroll back.
// [section-heading]: each word fades in, one after another. The words come from the
// page's splitText() call (SplitText, wordsClass 'word'); a heading that wasn't split
// fades in as a whole instead.
// [section-para]: the paragraph fades in. Opacity only, no movement.
// Needs GSAP and its ScrollTrigger plugin. Without them nothing is hidden.
(function () {
  const HEADING_SELECTOR = '[section-heading]';
  const PARA_SELECTOR = '[section-para]';
  // Plays when the element's top rises above this point of the viewport.
  const START = 'top 85%';
  const WORD_DURATION = .5;
  const WORD_STAGGER = .08;
  const PARA_DURATION = .8;
  const START_OPACITY = .1;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // The page splits headings once fonts are loaded and the preloader has started to lift.
  // Waiting for the same two things, then one more task, means the split has already run.
  function whenSplitSettled() {
    return Promise.all([document.fonts.ready, window.preloaderDone])
      .then(() => new Promise((resolve) => setTimeout(resolve)));
  }

  function reveal(element, targets, vars) {
    const tween = gsap.to(targets, { opacity: 1, ease: 'power1.out', ...vars, paused: true });
    ScrollTrigger.create({
      trigger: element,
      start: START,
      animation: tween,
      toggleActions: 'play none none reverse',
    });
  }

  function setup() {
    // The home page's Trans-Pacific heading has its own word opacity reveal.
    const headings = [...document.querySelectorAll(HEADING_SELECTOR)]
      .filter((heading) => !heading.closest('.transpacific-heading'));
    const paras = document.querySelectorAll(PARA_SELECTOR);
    if ((!headings.length && !paras.length) || !window.gsap || !window.ScrollTrigger) return;
    if (reducedMotion.matches) return;
    gsap.registerPlugin(ScrollTrigger);

    paras.forEach((para) => {
      gsap.set(para, { opacity: START_OPACITY });
      reveal(para, para, { duration: PARA_DURATION });
    });

    if (!headings.length) return;
    // Keep the same starting opacity while waiting for the heading to split into words.
    gsap.set(headings, { opacity: START_OPACITY });
    whenSplitSettled().then(() => {
      headings.forEach((heading) => {
        const words = heading.querySelectorAll('.word');
        if (!words.length) {
          reveal(heading, heading, { duration: PARA_DURATION });
          return;
        }
        gsap.set(words, { opacity: START_OPACITY });
        gsap.set(heading, { opacity: 1 });
        reveal(heading, words, { duration: WORD_DURATION, stagger: WORD_STAGGER });
      });
      // Split text can change line heights, so measure trigger positions again.
      ScrollTrigger.refresh();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, { once: true });
  } else {
    setup();
  }
})();
