/* =========================================================
   SAFEBITE — BASE SCRIPT
   Provides safe fallbacks so the page still looks correct
   even when illustration/appy/footer-prop image files are
   missing, plus a couple of small always-on touches.
   ========================================================= */

(function () {
  "use strict";

  /* ---------- emoji fallback lookup ---------- */
  function fallbackEmoji(el) {
    var hint = ((el.id || "") + " " + (el.alt || "") + " " + (el.getAttribute("src") || "")).toLowerCase();
    var table = [
      ["vase", "💐"], ["wineglass", "🍷"], ["bottle", "🍾"], ["fork", "🍴"],
      ["knife", "🔪"], ["spoon", "🥄"], ["sausage", "🌭"], ["candle", "🕯️"],
      ["saltpepper", "🧂"], ["cheese", "🧀"], ["olives", "🫒"], ["jar", "🍯"],
      ["bread", "🍞"], ["charcuterie", "🍽️"], ["hat", "🎩"],
      ["think", "🤔"], ["read", "📖"], ["eat", "🍽️"], ["sit", "🪑"], ["meditate", "🧘"],
      ["dirty", "🚫"], ["appy", "👻"]
    ];
    for (var i = 0; i < table.length; i++) {
      if (hint.indexOf(table[i][0]) !== -1) return table[i][1];
    }
    return "🎨";
  }

  /* ---------- <img> fallback: swap broken images for a themed chip ---------- */
  function wireImgFallback(img) {
    if (img.dataset.fallbackWired) return;
    img.dataset.fallbackWired = "1";
    img.addEventListener("error", function onErr() {
      img.removeEventListener("error", onErr);
      img.classList.add("img-fallback");
      img.textContent = fallbackEmoji(img);
      // textContent doesn't render on <img>, so use alt + a data attr consumed by CSS-less inline emoji via title
      img.alt = fallbackEmoji(img);
      img.removeAttribute("src");
      img.style.display = "flex";
      img.style.alignItems = "center";
      img.style.justifyContent = "center";
      img.after(makeEmojiSpan(img));
      img.style.opacity = "0"; // hide the now-srcless broken img box itself
      img.style.width = "0";
      img.style.height = "0";
    });
  }

  function makeEmojiSpan(img) {
    var span = document.createElement("span");
    span.textContent = fallbackEmoji(img);
    span.style.display = "inline-flex";
    span.style.alignItems = "center";
    span.style.justifyContent = "center";
    span.style.fontSize = "1.8rem";
    span.style.width = getComputedStyle(img).width;
    span.style.height = getComputedStyle(img).height;
    span.style.minWidth = "40px";
    span.style.minHeight = "40px";
    span.style.background = "#fff";
    span.style.border = "2px solid #171717";
    span.style.borderRadius = "10px";
    span.className = img.className;
    return span;
  }

  /* ---------- background-image sprite fallback (verdict panels etc) ---------- */
  function wireSpriteFallback(el) {
    var bg = el.style.backgroundImage;
    var match = bg && bg.match(/url\(["']?(.*?)["']?\)/);
    if (!match) return;
    var url = match[1];
    var test = new Image();
    test.onload = function () {};
    test.onerror = function () {
      el.classList.add("sprite-fallback");
      el.setAttribute("data-fallback", fallbackEmoji(el));
      el.style.backgroundImage = "none";
    };
    test.src = url;
  }

  function init() {
    document.querySelectorAll("img").forEach(wireImgFallback);
    document.querySelectorAll("[style*='background-image']").forEach(wireSpriteFallback);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* Re-check any images added later (e.g. Swiper loop clones) */
  var mo = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (!(node instanceof HTMLElement)) return;
        if (node.tagName === "IMG") wireImgFallback(node);
        node.querySelectorAll && node.querySelectorAll("img").forEach(wireImgFallback);
      });
    });
  });
  mo.observe(document.body || document.documentElement, { childList: true, subtree: true });
})();