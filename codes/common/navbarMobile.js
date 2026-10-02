document.addEventListener("DOMContentLoaded", () => {

  const menuBtn = document.querySelector(".nav_menu_btn");
  const menu = document.querySelector(".nav_links_component");

  const menuLinks = document.querySelectorAll(".nav_links_item");

  const pathwayElements = document.querySelectorAll(
    ".nav_pathways_rule, .nav_pathways_label, .nav_pathways_links"
  );

  const copyright = document.querySelector(".nav_pathways_copyright");

  const backdrop = document.querySelector(".nav_menu_backdrop");

  if (!menuBtn || !menu || !window.gsap) return;


  /* -----------------------------
     MOBILE ONLY (≤ 767px)
     gsap.matchMedia builds everything below only at this width. Leaving the
     breakpoint reverts the timeline's inline styles and runs the cleanup;
     coming back sets it all up again.
  ----------------------------- */

  // Closing replays the open timeline backwards this many times faster.
  const CLOSE_SPEED = 2.5;

  // Backdrop fade in/out, in seconds.
  const BACKDROP_DURATION = 0.4;

  const mm = gsap.matchMedia();

  mm.add("(max-width: 767px)", (context) => {

    let menuOpen = false;


    /* -----------------------------
       INITIAL STATES
       Safe to set here: they only apply on mobile and are reverted on desktop.
    ----------------------------- */

    gsap.set(menu, {
      autoAlpha: 0,
      y: -22,
      scaleY: 0.94,
      transformOrigin: "top center",
      pointerEvents: "none"
    });

    gsap.set(menuLinks, {
      autoAlpha: 0,
      y: 14
    });

    gsap.set(pathwayElements, {
      autoAlpha: 0,
      y: 10
    });

    gsap.set(copyright, {
      autoAlpha: 0,
      y: 10
    });

    if (backdrop) {
      gsap.set(backdrop, {
        autoAlpha: 0
      });
    }


    /* -----------------------------
       OPEN TIMELINE
    ----------------------------- */

    const openTL = gsap.timeline({
      paused: true,
      defaults: {
        ease: "power3.out"
      }
    });

    openTL

      // Menu panel drops in
      .to(menu, {
        autoAlpha: 1,
        y: 0,
        scaleY: 1,
        duration: 0.48,
        pointerEvents: "auto"
      })

      // Main nav links
      .to(menuLinks, {
        autoAlpha: 1,
        y: 0,
        duration: 0.42,
        stagger: 0.05
      }, "-=0.28")

      // Pathways
      .to(pathwayElements, {
        autoAlpha: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.06
      }, "-=0.18")

      // Copyright
      .to(copyright, {
        autoAlpha: 1,
        y: 0,
        duration: 0.35
      }, "-=0.20");


    /* -----------------------------
       BACKDROP
       Its own tween rather than part of the timeline, so it eases over the whole
       open and close instead of snapping at the end of the faster reverse.
       Adding it to the context by name (an unnamed context.add runs immediately)
       lets matchMedia revert it on desktop too.
    ----------------------------- */

    const fadeBackdrop = context.add("fadeBackdrop", (show, delay = 0) => {
      if (!backdrop) return;
      gsap.to(backdrop, {
        autoAlpha: show ? 1 : 0,
        // GSAP applies display: "block" at the start and display: "none" at the end.
        display: show ? "block" : "none",
        duration: BACKDROP_DURATION,
        delay,
        ease: "power2.out",
        // Also cancels a pending delayed fade-out if the menu reopens first.
        overwrite: true
      });
    });


    /* -----------------------------
       MENU CLICK
    ----------------------------- */

    function toggleMenu() {

      if (!menuOpen) {

        openTL.timeScale(1).play();
        fadeBackdrop(true);

        // hamburger → X
        menuBtn.classList.add("is-open");

        menuOpen = true;

      } else {

        openTL.timeScale(CLOSE_SPEED).reverse();
        // Backdrop goes last: start its fade so it overlaps the end of the close and
        // finishes half a fade after the menu has fully gone.
        const closeLeft = openTL.time() / CLOSE_SPEED;
        fadeBackdrop(false, Math.max(0, closeLeft - BACKDROP_DURATION / 2));

        // X → hamburger
        menuBtn.classList.remove("is-open");

        menuOpen = false;

      }

    }

    menuBtn.addEventListener("click", toggleMenu);


    /* -----------------------------
       CLEANUP (leaving mobile)
    ----------------------------- */

    return () => {
      menuBtn.removeEventListener("click", toggleMenu);
      menuBtn.classList.remove("is-open");
    };

  });

});
