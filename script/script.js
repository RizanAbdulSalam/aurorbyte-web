document.addEventListener('DOMContentLoaded', () => {

  /* ---- year ---- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- loader ---- */
  const loader = document.getElementById('loader');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function hideLoader(){
    loader.classList.add('is-hidden');
    document.body.style.overflow = '';
    setTimeout(() => loader.remove(), 700);
  }

  if (reduceMotion) {
    hideLoader();
  } else {
    document.body.style.overflow = 'hidden';
    const minShow = 2400; // let the needle-and-stitch animation play out
    const started = Date.now();
    window.addEventListener('load', () => {
      const elapsed = Date.now() - started;
      setTimeout(hideLoader, Math.max(0, minShow - elapsed));
    });
    // safety fallback in case 'load' never fires
    setTimeout(hideLoader, 4000);
  }

  /* ---- nav scroll state ---- */
  const nav = document.getElementById('nav');
  const onScroll = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 40);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---- mobile menu ---- */
  const burger = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobileMenu');
  burger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', isOpen);
  });
  mobileMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mobileMenu.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---- scroll reveal ---- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  /* ---- portfolio download placeholder ---- */
  const portfolioBtn = document.getElementById('portfolioBtn');
  if (portfolioBtn) {
    portfolioBtn.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Add your portfolio PDF and link it from this button — see the README note in the project files.');
    });
  }

  /* ---- product showcase slider ---- */
  const track = document.getElementById('showcaseTrack');
  const prevBtn = document.getElementById('showcasePrev');
  const nextBtn = document.getElementById('showcaseNext');

  if (track && prevBtn && nextBtn) {
    const cards = Array.from(track.children);
    let index = 0;

    function visibleCount() {
      if (window.innerWidth <= 640) return 1;
      if (window.innerWidth <= 980) return 2;
      return 3;
    }

    function maxIndex() {
      return Math.max(0, cards.length - visibleCount());
    }

    function step() {
      // measure real rendered width + gap so translation never drifts,
      // regardless of flex-basis rounding or gap spacing
      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      const cardWidth = cards[0].getBoundingClientRect().width;
      return cardWidth + gap;
    }

    function update() {
      index = Math.min(index, maxIndex());
      index = Math.max(index, 0);
      track.style.transform = `translateX(-${index * step()}px)`;
      prevBtn.disabled = index <= 0;
      nextBtn.disabled = index >= maxIndex();
    }

    prevBtn.addEventListener('click', () => {
      index = Math.max(0, index - 1);
      update();
    });
    nextBtn.addEventListener('click', () => {
      index = Math.min(maxIndex(), index + 1);
      update();
    });

    /* ---- swipe / drag gesture ---- */
    let isDragging = false;
    let dragStartX = 0;
    let dragBaseline = 0;
    const SWIPE_THRESHOLD = 40; // px of drag before it counts as a swipe

    function currentOffset() {
      return index * step();
    }

    function onDragStart(e) {
      isDragging = true;
      dragStartX = e.clientX;
      dragBaseline = currentOffset();
      track.style.transition = 'none';
      track.classList.add('is-dragging');
      track.setPointerCapture && e.pointerId != null && track.setPointerCapture(e.pointerId);
    }

    function onDragMove(e) {
      if (!isDragging) return;
      const delta = e.clientX - dragStartX;
      // slight resistance once you drag past either end
      let resisted = delta;
      if ((index <= 0 && delta > 0) || (index >= maxIndex() && delta < 0)) {
        resisted = delta * 0.35;
      }
      track.style.transform = `translateX(${-dragBaseline + resisted}px)`;
    }

    function onDragEnd(e) {
      if (!isDragging) return;
      isDragging = false;
      track.classList.remove('is-dragging');
      track.style.transition = '';

      const delta = (e.clientX != null ? e.clientX : dragStartX) - dragStartX;
      if (delta > SWIPE_THRESHOLD) {
        index = Math.max(0, index - 1);
      } else if (delta < -SWIPE_THRESHOLD) {
        index = Math.min(maxIndex(), index + 1);
      }
      update();
    }

    track.addEventListener('pointerdown', onDragStart);
    track.addEventListener('pointermove', onDragMove);
    track.addEventListener('pointerup', onDragEnd);
    track.addEventListener('pointercancel', onDragEnd);
    track.addEventListener('pointerleave', (e) => {
      // only end the drag if the mouse button is no longer pressed
      if (isDragging && e.buttons === 0) onDragEnd(e);
    });

    // stop the browser treating the drag as an image/text drag or link click
    track.addEventListener('dragstart', (e) => e.preventDefault());
    track.querySelectorAll('a, img').forEach(el => {
      el.addEventListener('dragstart', (e) => e.preventDefault());
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(update, 100);
    }, { passive: true });

    // re-measure once web fonts finish loading (card widths can shift)
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(update);
    }
    window.addEventListener('load', update);

    update();
  }

  /* ---- hero jacket: scroll-scrubbed stitch reveal ---- */
  const heroWrapper = document.getElementById('heroWrapper');
  const jacketGold = document.getElementById('jacketGold');

  if (heroWrapper && jacketGold && !reduceMotion) {
    // [element, type, startProgress, endProgress] — ranges divide the
    // 0..1 scroll progress into sequential steps, in stitch order
    const steps = [
      [document.getElementById('seam-1'),   'seam',   0.00, 0.12],
      [document.getElementById('needle-1'), 'needle', 0.00, 0.12],
      [document.getElementById('seam-2'),   'seam',   0.12, 0.24],
      [document.getElementById('needle-2'), 'needle', 0.12, 0.24],
      [document.getElementById('seam-3'),   'seam',   0.24, 0.40],
      [document.getElementById('needle-3'), 'needle', 0.24, 0.40],
      [document.getElementById('btn-4'),    'btn',    0.40, 0.46],
      [document.getElementById('btn-4b'),   'btn',    0.46, 0.52],
      [document.getElementById('seam-5'),   'seam',   0.52, 0.62],
      [document.getElementById('needle-5'), 'needle', 0.52, 0.62],
      [document.getElementById('seam-6'),   'seam',   0.62, 0.72],
      [document.getElementById('needle-6'), 'needle', 0.62, 0.72],
      [document.getElementById('seam-7'),   'seam',   0.72, 0.82],
      [document.getElementById('needle-7'), 'needle', 0.72, 0.82],
      [document.getElementById('seam-8'),   'seam',   0.82, 0.92],
      [document.getElementById('needle-8'), 'needle', 0.82, 0.92],
    ].filter(step => step[0]);

    function clamp01(x) { return Math.min(1, Math.max(0, x)); }
    function localProgress(p, start, end) { return clamp01((p - start) / (end - start)); }

    let ticking = false;

    function render() {
      ticking = false;
      const rect = heroWrapper.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const progress = scrollable > 0 ? clamp01(-rect.top / scrollable) : 1;

      steps.forEach(([el, type, start, end]) => {
        const local = localProgress(progress, start, end);
        if (type === 'seam') {
          el.style.strokeDashoffset = String(100 - local * 100);
        } else if (type === 'btn') {
          el.style.transform = `scale(${local})`;
          el.style.opacity = String(local);
        } else if (type === 'needle') {
          if (local > 0 && local < 1) {
            el.style.offsetDistance = `${local * 100}%`;
            el.style.opacity = '1';
          } else {
            el.style.opacity = '0';
          }
        }
      });

      // finished-state glow once fully stitched
      const glowIn = localProgress(progress, 0.92, 1);
      jacketGold.style.filter = glowIn > 0
        ? `drop-shadow(0 0 ${6 * glowIn}px rgba(200,163,77,${0.6 * glowIn}))`
        : 'none';
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(render);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    render();
  } else if (jacketGold) {
    // reduced motion — skip scrubbing, show the finished jacket immediately
    jacketGold.querySelectorAll('.seam').forEach(el => { el.style.strokeDashoffset = '0'; });
    jacketGold.querySelectorAll('.jacket-btn').forEach(el => { el.style.transform = 'scale(1)'; el.style.opacity = '1'; });
  }

  /* ---- enquiry form ---- */
  const enquiryForm = document.getElementById('enquiryForm');
  const enquiryStatus = document.getElementById('enquiryStatus');
  const enquirySubmit = document.getElementById('enquirySubmit');
  const ENQUIRY_EMAIL = 'Aurorbyte@gmail.com';
  const ORIGINAL_LABEL = 'Send Enquiry';
  let revertTimer = null;

  function resetSubmitButton() {
    if (!enquirySubmit) return;
    clearTimeout(revertTimer);
    enquirySubmit.classList.remove('is-success');
    const submitText = enquirySubmit.querySelector('.enquiry__submit-text');
    if (submitText) submitText.textContent = ORIGINAL_LABEL;
  }

  if (enquiryForm) {
    // if the person starts a new enquiry after a successful one, drop the
    // "Submitted" state so the button doesn't look stuck
    enquiryForm.addEventListener('input', () => {
      if (enquirySubmit.classList.contains('is-success')) resetSubmitButton();
    });

    enquiryForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // honeypot — if a bot filled this hidden field, silently drop it
      if (enquiryForm._honey && enquiryForm._honey.value) return;

      const formData = new FormData(enquiryForm);
      formData.append('_subject', 'New Enquiry — Aurorbyte Uniforms');
      formData.append('_template', 'table');
      formData.append('_captcha', 'false');

      const payload = {};
      formData.forEach((value, key) => { payload[key] = value; });

      const submitText = enquirySubmit.querySelector('.enquiry__submit-text');
      resetSubmitButton();
      enquirySubmit.disabled = true;
      submitText.textContent = 'Sending…';
      enquiryStatus.textContent = '';
      enquiryStatus.className = 'enquiry__status';

      try {
        const response = await fetch(`https://formsubmit.co/ajax/${ENQUIRY_EMAIL}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Request failed');

        submitText.textContent = 'Submitted';
        enquirySubmit.classList.add('is-success');
        enquiryStatus.textContent = "Thanks — your enquiry has been sent. We'll be in touch shortly.";
        enquiryStatus.classList.add('is-success');
        enquiryForm.reset();

        // revert the button back to normal after a few seconds so a second
        // enquiry can be sent without it looking permanently "done"
        revertTimer = setTimeout(resetSubmitButton, 5000);
      } catch (err) {
        submitText.textContent = ORIGINAL_LABEL;
        enquiryStatus.textContent = `Something went wrong — please email us directly at ${ENQUIRY_EMAIL}.`;
        enquiryStatus.classList.add('is-error');
      } finally {
        enquirySubmit.disabled = false;
      }
    });
  }

});

/* end of file */
