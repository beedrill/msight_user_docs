/*
 * Sliding top navigation tabs.
 *
 * Material renders the top-level nav as <ul class="md-tabs__list"> inside a
 * .md-grid capped at 61rem. That list is already a horizontal scroller with
 * its scrollbar hidden, so once the tabs are wider than the grid the last
 * ones are simply invisible -- nothing on screen says they exist, and the
 * only thing that ever scrolls the strip is Material bringing the active tab
 * into view on load.
 *
 * This adds the missing affordance: a chevron on each side, shown only when
 * there is more to reach that way. Hovering one glides the strip; clicking
 * jumps by most of a screenful.
 */
(function () {
  "use strict";

  /* Pixels per animation frame while the pointer rests on a chevron. Slow
     enough to read the labels going past, fast enough not to feel stuck. */
  var GLIDE_SPEED = 2.5;

  /* Fraction of the visible strip a click moves. Short of a full screenful
     so a tab or two carries over and the jump stays orientable. */
  var CLICK_FRACTION = 0.8;

  var CHEVRON = {
    prev: "M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z",
    next: "M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"
  };

  function buildArrow(direction) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "md-tabs__arrow md-tabs__arrow--" + direction;
    /* Decoration, and kept out of the tab order on purpose: every tab a
       chevron reveals is already a focusable link that tabbing reaches and
       the browser scrolls into view, so exposing the chevron itself would
       only add a control that does nothing a keyboard user needs. */
    button.setAttribute("aria-hidden", "true");
    button.tabIndex = -1;
    button.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' +
      CHEVRON[direction] +
      '"/></svg>';
    return button;
  }

  function setup() {
    var grid = document.querySelector(".md-tabs > .md-grid");
    var list = document.querySelector(".md-tabs__list");
    if (!grid || !list) return;

    /* Material re-runs this on instant navigation; never build twice. */
    if (grid.querySelector(".md-tabs__arrow")) return;

    var prev = buildArrow("prev");
    var next = buildArrow("next");
    grid.appendChild(prev);
    grid.appendChild(next);

    function refresh() {
      var furthest = list.scrollWidth - list.clientWidth;
      var at = list.scrollLeft;
      /* The 1px slack absorbs sub-pixel widths, which would otherwise leave
         an arrow showing with nothing left to scroll to. */
      prev.toggleAttribute("data-visible", at > 1);
      next.toggleAttribute("data-visible", at < furthest - 1);
    }

    var frame = null;

    function stopGliding() {
      if (frame === null) return;
      cancelAnimationFrame(frame);
      frame = null;
    }

    function startGliding(step) {
      stopGliding();
      (function tick() {
        var before = list.scrollLeft;
        list.scrollLeft = before + step;
        refresh();
        /* Stop at the end rather than burning frames against the edge. */
        if (list.scrollLeft === before) return stopGliding();
        frame = requestAnimationFrame(tick);
      })();
    }

    var reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    [[prev, -1], [next, 1]].forEach(function (pair) {
      var button = pair[0];
      var sign = pair[1];

      if (!reduceMotion) {
        button.addEventListener("mouseenter", function () {
          startGliding(sign * GLIDE_SPEED);
        });
        button.addEventListener("mouseleave", stopGliding);
      }

      button.addEventListener("click", function () {
        stopGliding();
        list.scrollBy({
          left: sign * list.clientWidth * CLICK_FRACTION,
          behavior: reduceMotion ? "auto" : "smooth"
        });
      });
    });

    list.addEventListener("scroll", refresh, { passive: true });
    window.addEventListener("resize", refresh, { passive: true });

    refresh();
    /* Material scrolls the active tab into view a moment after load, which
       moves the strip out from under the state we just computed. */
    setTimeout(refresh, 300);
  }

  /* document$ is Material's per-page observable; it fires again after an
     instant navigation, where DOMContentLoaded would not. */
  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(setup);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();
