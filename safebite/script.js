// =========================================================
// SPRITE ENGINE — steps through a 5x5 (25-frame) sprite sheet
// via background-position percentages. Works for any element
// sized independently of the native 256px frame.
// =========================================================
function createSprite(el, { cols = 5, rows = 5, fps = 12, autoplay = true } = {}){
  const frameCount = cols * rows;
  let frame = 0;
  let raf = null;
  let last = 0;
  const interval = 1000 / fps;

  function paint(){
    const col = frame % cols;
    const row = Math.floor(frame / cols) % rows;
    const x = cols === 1 ? 0 : (col / (cols - 1)) * 100;
    const y = rows === 1 ? 0 : (row / (rows - 1)) * 100;
    el.style.backgroundPosition = `${x}% ${y}%`;
  }

  function tick(ts){
    if (!last) last = ts;
    if (ts - last >= interval){
      frame = (frame + 1) % frameCount;
      paint();
      last = ts;
    }
    raf = requestAnimationFrame(tick);
  }

  function play(){ if (!raf) raf = requestAnimationFrame(tick); }
  function stop(){ if (raf) cancelAnimationFrame(raf); raf = null; last = 0; }
  function setFrame(i){ frame = ((i % frameCount) + frameCount) % frameCount; paint(); }
  function step(){ frame = (frame + 1) % frameCount; paint(); }

  paint();
  if (autoplay) play();

  return { play, stop, setFrame, step, el };
}

// =========================================================
// CUSTOM BEE CURSOR + STITCHED TRAIL
// Two-frame PNG (fly / idle) — fly is the default everywhere,
// idle only shows while hovering a button or link. No rotation:
// the bee always stays upright regardless of movement direction.
// Suppressed entirely while the pointer is inside the footer,
// where the paw cursor (further below) takes over instead.
// =========================================================
(function(){
  const cursor = document.getElementById('appy-cursor');
  const canvas = document.getElementById('trail-canvas');
  const ctx = canvas.getContext('2d');
  const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (isTouch || !cursor || !canvas) return;

  const BEE_IDLE = 'assets/cursor/bee-idle.png';
  const BEE_FLY  = 'assets/cursor/bee-fly.png';

  cursor.style.backgroundImage = `url('${BEE_FLY}')`;

  function setBeeFrame(hovering){
    cursor.style.backgroundImage = `url('${hovering ? BEE_IDLE : BEE_FLY}')`;
  }

  // stays on the fly frame everywhere; only drops to idle while
  // hovering an interactive element (buttons + links)
  const hoverTargets = document.querySelectorAll('a, button, .brutal-btn, .gooey-btn, .knock-btn');
  hoverTargets.forEach(el => {
    el.addEventListener('mouseenter', () => setBeeFrame(true));
    el.addEventListener('mouseleave', () => setBeeFrame(false));
  });

  let points = [];
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let lastX = mouseX;
  let lastY = mouseY;
  let traveled = 0;

  function resizeCanvas(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    const dx = mouseX - lastX;
    const dy = mouseY - lastY;
    const dist = Math.hypot(dx, dy);

    if (dist > 4){
      points.push({ x: mouseX, y: mouseY, life: 1 });
      lastX = mouseX;
      lastY = mouseY;
      traveled += dist;
    }

    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';

    if (points.length > 160) points.shift();
  });

  function drawTrail(){
    const overFooter = document.body.classList.contains('over-footer');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // hide the bee + its stitched trail while the paw cursor owns the footer
    cursor.style.opacity = overFooter ? '0' : '1';

    if (!overFooter && points.length > 1){
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // soft wide underlay for a bigger, smoother stitched ribbon
      ctx.strokeStyle = 'rgba(20,20,20,0.18)';
      ctx.lineWidth = 9;
      ctx.setLineDash([]);
      ctx.beginPath();
      points.forEach((p, i) => {
        ctx.globalAlpha = p.life * 0.6;
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // crisp dashed stitch line on top, bigger dashes than before
      ctx.strokeStyle = 'rgba(20,20,20,0.65)';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([12, 9]);
      ctx.beginPath();
      points.forEach((p, i) => {
        ctx.globalAlpha = p.life;
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    points.forEach(p => p.life -= 0.01);
    points = points.filter(p => p.life > 0);

    requestAnimationFrame(drawTrail);
  }
  drawTrail();
})();

// =========================================================
// SECTION COLOR WASH — body background crossfades between
// each section's data-color as it enters view (flying-paper
// technique: transparent sections, single animated body bg).
// =========================================================
(function(){
  const sections = document.querySelectorAll('[data-color]');
  if (!sections.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        document.body.style.backgroundColor = entry.target.getAttribute('data-color');
      }
    });
  }, { threshold: 0.45 });

  sections.forEach(s => io.observe(s));
})();

// =========================================================
// SCROLL-LINKED PARALLAX LAYERS
// =========================================================
(function(){
  const layers = document.querySelectorAll('[data-parallax-speed]');
  if (!layers.length) return;

  let ticking = false;

  function update(){
    const scrolled = window.scrollY;
    layers.forEach(el => {
      const speed = parseFloat(el.getAttribute('data-parallax-speed')) || 0;
      const yPos = -(scrolled * speed);
      el.style.transform = el.style.transform && el.style.transform.includes('rotate')
        ? el.style.transform
        : `translate3d(0, ${yPos}px, 0)`;
    });
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking){
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  update();
})();

// =========================================================
// HERO WALKER — sprite walk-cycle + walk-across-floor motion
// =========================================================
(function(){
  const el = document.getElementById('hero-walker');
  if (!el) return;
  createSprite(el, { fps: 10 });
})();

// =========================================================
// SPRITE MASCOTS — idle-cycling sprites across the page
// =========================================================
(function(){
  const idleSprites = [
    ['hero-sit-sprite', 6],
    ['verdict-maybe-sprite', 6],
    ['verdict-no-sprite', 5],
    ['verdict-title-no-sprite', 9],
    ['swap-success-sprite', 8],
    ['swap-track-sprite', 6],
    ['hiw-sprite-1', 7],
    ['hiw-sprite-2', 6],
    ['hiw-sprite-3', 8],
  ];
  idleSprites.forEach(([id, fps]) => {
    const el = document.getElementById(id);
    if (el) createSprite(el, { fps });
  });

  // knock-knock dialog sprite
  const knockSprite = document.getElementById('knock-sprite');
  if (knockSprite) createSprite(knockSprite, { fps: 9 });

  // swap walker marches back and forth between the two cards
  const swapWalker = document.getElementById('swap-walker');
  if (swapWalker){
    createSprite(swapWalker, { fps: 9 });
    let t = 0;
    function march(){
      t += 0.03;
      const offset = Math.sin(t) * 14;
      swapWalker.style.transform = `translateX(calc(-50% + ${offset}px)) scaleX(${Math.cos(t) >= 0 ? 1 : -1})`;
      requestAnimationFrame(march);
    }
    requestAnimationFrame(march);
  }
})();

// =========================================================
// VERDICT — 3-state gooey menu
// =========================================================
(function(){
  const buttons = document.querySelectorAll('.gooey-btn');
  const panels = document.querySelectorAll('.verdict-panel');
  if (!buttons.length) return;

  function setState(state){
    buttons.forEach(b => b.classList.toggle('active', b.dataset.state === state));
    panels.forEach(p => p.classList.toggle('visible', p.dataset.panel === state));
  }

  buttons.forEach(btn => btn.addEventListener('click', () => setState(btn.dataset.state)));
  setState('maybe');
})();

// =========================================================
// HOW IT WORKS — Swiper card-stack carousel
// =========================================================
(function(){
  if (!window.Swiper) return;
  new Swiper('.hiw-swiper', {
    effect: 'cards',
    grabCursor: true,
    loop: true,
  });
})();



// =========================================================
// SPLIT-WORD TITLE REVEAL (scroll-triggered, "words" style)
// =========================================================
(function(){
  if (!window.gsap) return;
  const hasScrollTrigger = !!window.ScrollTrigger;

  function splitWords(root){
    const words = [];

    function walk(node){
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === Node.TEXT_NODE){
          const parts = child.textContent.split(/(\s+)/); // keep separators
          const frag = document.createDocumentFragment();
          parts.forEach(part => {
            if (part === '') return;
            if (/^\s+$/.test(part)){
              frag.appendChild(document.createTextNode(part));
            } else {
              const span = document.createElement('span');
              span.className = 'split-word';
              span.textContent = part;
              frag.appendChild(span);
              words.push(span);
            }
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE){
          if (child.tagName === 'BR') return;
          walk(child);
        }
      });
    }

    walk(root);
    return words;
  }

  const titles = document.querySelectorAll('.split-title');
  titles.forEach(title => {
    const words = splitWords(title);
    if (!words.length) return;

    const tween = {
      y: -100,
      opacity: 0,
      rotation: () => gsap.utils.random(-80, 80),
      duration: 0.7,
      ease: 'back',
      stagger: 0.15
    };

    if (hasScrollTrigger){
      gsap.registerPlugin(ScrollTrigger);
      gsap.from(words, {
        ...tween,
        scrollTrigger: {
          trigger: title,
          start: 'top 82%',
          toggleActions: 'play none none none'
        }
      });
    } else {
      gsap.from(words, tween);
    }
  });
})();

// =========================================================
// SCROLL REVEAL — fade-up for non-card content
// =========================================================
(function(){
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  targets.forEach(el => io.observe(el));
})();

// =========================================================
// KNOCK-KNOCK DIALOG — runaway skip button + embarrassment
// =========================================================
(function(){
  const skipBtn = document.getElementById('knock-skip-btn');
  const enterBtn = document.getElementById('knock-enter-btn');
  const flashMsg = document.getElementById('knock-embarrass');
  if (!skipBtn || !flashMsg) return;

  let hoverCount = 0;
  const FLASH_THRESHOLD = 7;
  let flashShown = false;

  function positionSkipButtonInitial(){
    const dialog = skipBtn.closest('.knock-dialog');
    const dialogRect = dialog.getBoundingClientRect();
    skipBtn.style.position = 'absolute';
    skipBtn.style.top = '';
    skipBtn.style.left = '';
    skipBtn.style.bottom = '18%';
    skipBtn.style.left = '50%';
    skipBtn.style.transform = 'translateX(-50%)';
  }

  function getRandomPos(){
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const bw = skipBtn.offsetWidth;
    const bh = skipBtn.offsetHeight;
    const x = Math.floor(Math.random() * (vw - bw));
    const y = Math.floor(Math.random() * (vh - bh));
    return { x, y };
  }

  function runAway(){
    hoverCount++;
    const pos = getRandomPos();

    skipBtn.style.position = 'fixed';
    skipBtn.style.bottom = '';
    skipBtn.style.left = '';
    skipBtn.style.transform = '';
    skipBtn.style.zIndex = '20';

    anime({
      targets: skipBtn,
      left: `${pos.x}px`,
      top: `${pos.y}px`,
      easing: 'easeOutCirc',
      duration: 450
    });

    if (hoverCount >= FLASH_THRESHOLD && !flashShown){
      flashShown = true;
      flashMsg.classList.add('flash');
      setTimeout(() => {
        flashMsg.classList.remove('flash');
      }, 2800);
    }
  }

  skipBtn.addEventListener('mouseover', runAway);
  skipBtn.addEventListener('click', function(e){
    e.preventDefault();
    runAway();
  });
})();

// =========================================================
// FOOTER PAW CURSOR + FOOTPRINT TRAIL + PROP DEFLECTION
// Active only while the pointer is inside <footer class="footer">.
// - Cursor image swaps/rotates to face the direction of travel.
// - Every ~28px traveled, stamps a fading paw print, alternating
//   left/right of the movement line like a walking gait.
// - Any .fl-item prop within range gets nudged away from the paw
//   and springs back (CSS transition) once the paw moves off.
// =========================================================
(function(){
  const footer = document.getElementById('footer');
  const flatlay = document.getElementById('footer-flatlay');
  const pawCursor = document.getElementById('footer-paw-cursor');
  const pawCursorImg = document.getElementById('footer-paw-cursor-img');
  const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (!footer || !flatlay || !pawCursor || isTouch) return;

  const PAW_A = 'assets/footer/paw-a.png';
  const PAW_B = 'assets/footer/paw-b.png';

  const items = Array.from(document.querySelectorAll('.fl-item')).map(el => {
    const baseRotate = parseFloat(el.getAttribute('data-rotate')) || 0;
    return { el, baseRotate, dx: 0, dy: 0, deflected: false };
  });

  let inFooter = false;
  let px = 0, py = 0;      // current "reach tip" position (screen coords)
  let lastPx = 0, lastPy = 0;
  let lastStampDist = 0;
  let stampSide = 1;       // alternates -1 / 1 for left/right gait

  function setBaseTransform(item){
    item.el.style.transform = `translate(0px, 0px) rotate(${item.baseRotate}deg)`;
  }
  items.forEach(setBaseTransform);

  function spawnPrint(x, y){
    const print = document.createElement('div');
    print.className = 'paw-print';
    print.style.left = x + 'px';
    print.style.top = y + 'px';
    print.style.transform = `translate(-50%,-50%) rotate(0deg)`;
    const img = document.createElement('img');
    img.src = stampSide > 0 ? PAW_A : PAW_B;
    img.alt = '';
    print.appendChild(img);
    document.body.appendChild(print);

    requestAnimationFrame(() => {
      print.style.transition = 'opacity 900ms ease, transform 900ms ease';
      print.style.opacity = '0';
      print.style.transform += ' scale(0.85)';
    });
    setTimeout(() => print.remove(), 950);
  }

  function updateDeflection(){
    const RANGE = 110;      // px radius of influence (bumped up for larger props)
    const MAX_PUSH = 26;    // px max nudge distance

    items.forEach(item => {
      if (!inFooter){
        if (item.dx !== 0 || item.dy !== 0){
          item.dx = 0; item.dy = 0;
          item.el.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1)';
          setBaseTransform(item);
        }
        return;
      }

      const r = item.el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const vx = cx - px;
      const vy = cy - py;
      const dist = Math.hypot(vx, vy);

      if (dist < RANGE){
        const strength = (1 - dist / RANGE) * MAX_PUSH;
        const nx = vx / (dist || 1);
        const ny = vy / (dist || 1);
        item.dx = nx * strength;
        item.dy = ny * strength;
        item.el.style.transition = 'transform .08s linear';
        item.el.style.transform = `translate(${item.dx}px, ${item.dy}px) rotate(${item.baseRotate}deg)`;
        item.deflected = true;
      } else if (item.deflected){
        item.deflected = false;
        item.dx = 0; item.dy = 0;
        item.el.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1)';
        setBaseTransform(item);
      }
    });

    requestAnimationFrame(updateDeflection);
  }
  requestAnimationFrame(updateDeflection);

  // The leg SVG is a fixed 2000px-tall shape (see style.css) — we just
  // translate the whole container to the mouse's position inside the
  // footer. The footer's overflow:hidden clips off everything past the
  // bottom edge, which is what makes the leg look rooted to the floor
  // no matter where the paw currently sits.
  window.addEventListener('mousemove', (e) => {
    const overFooter = e.target.closest('#footer');
    inFooter = !!overFooter;
    document.body.classList.toggle('over-footer', inFooter);
    pawCursor.classList.toggle('active', inFooter);

    if (!inFooter) return;

    const footerRect = footer.getBoundingClientRect();
    const relX = e.clientX - footerRect.left;
    const relY = e.clientY - footerRect.top;

    pawCursor.style.transform = `translate(${relX}px, ${relY}px) translateX(-50%)`;

    px = e.clientX;
    py = e.clientY;

    const dx = px - lastPx;
    const dy = py - lastPy;
    const dist = Math.hypot(dx, dy);

    if (dist > 1 && pawCursorImg){
      const tilt = Math.max(-16, Math.min(16, dx * 0.7));
      pawCursorImg.style.transform = `translate(-50%, -55%) rotate(${tilt}deg)`;
    }

    lastStampDist += dist;
    if (lastStampDist > 30){
      lastStampDist = 0;
      stampSide *= -1;
      spawnPrint(px + (stampSide * 10), py + 20);
    }

    lastPx = px;
    lastPy = py;
  });

  footer.addEventListener('mouseleave', () => {
    inFooter = false;
    document.body.classList.remove('over-footer');
    pawCursor.classList.remove('active');
  });
})();


// =========================================================
// FOOTER PROP DEFLECTION — items nudge away from the bee
// cursor while inside the footer, then spring back.
// =========================================================
(function(){
  const footer = document.getElementById('footer');
  const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (!footer || isTouch) return;

  const items = Array.from(document.querySelectorAll('.fl-item')).map(el => {
    const baseRotate = parseFloat(el.getAttribute('data-rotate')) || 0;
    return { el, baseRotate, dx: 0, dy: 0, deflected: false };
  });

  let inFooter = false;
  let px = 0, py = 0;

  function setBaseTransform(item){
    item.el.style.transform = `translate(0px, 0px) rotate(${item.baseRotate}deg)`;
  }
  items.forEach(setBaseTransform);

  function updateDeflection(){
    const RANGE = 110;
    const MAX_PUSH = 26;

    items.forEach(item => {
      if (!inFooter){
        if (item.dx !== 0 || item.dy !== 0){
          item.dx = 0; item.dy = 0;
          item.el.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1)';
          setBaseTransform(item);
        }
        return;
      }

      const r = item.el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const vx = cx - px;
      const vy = cy - py;
      const dist = Math.hypot(vx, vy);

      if (dist < RANGE){
        const strength = (1 - dist / RANGE) * MAX_PUSH;
        const nx = vx / (dist || 1);
        const ny = vy / (dist || 1);
        item.dx = nx * strength;
        item.dy = ny * strength;
        item.el.style.transition = 'transform .08s linear';
        item.el.style.transform = `translate(${item.dx}px, ${item.dy}px) rotate(${item.baseRotate}deg)`;
        item.deflected = true;
      } else if (item.deflected){
        item.deflected = false;
        item.dx = 0; item.dy = 0;
        item.el.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1)';
        setBaseTransform(item);
      }
    });

    requestAnimationFrame(updateDeflection);
  }
  requestAnimationFrame(updateDeflection);

  window.addEventListener('mousemove', (e) => {
    inFooter = !!e.target.closest('#footer');
    px = e.clientX;
    py = e.clientY;
  });
})();