/* ============================================================
   Divine Dove Glow — Main Script (shared across all pages)
   ============================================================ */

/* ---------- Footer Year ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const fyEl = document.getElementById('footer-year');
  if (fyEl) fyEl.textContent = new Date().getFullYear();
});

/* ---------- Intro Video (index only) ---------- */
const introOverlay = document.getElementById('intro-overlay');
if (introOverlay) {
  const introVideo = document.getElementById('intro-video');
  const introSkip  = document.getElementById('intro-skip');

  // Skip if already played this session
  if (sessionStorage.getItem('afm-intro-played') === '1') {
    introOverlay.style.display = 'none';
  } else {
    // Auto-close after 12s fallback
    const fallback = setTimeout(closeIntro, 12000);

    if (introVideo) {
      introVideo.addEventListener('ended', closeIntro);
    }
    if (introSkip) {
      introSkip.addEventListener('click', () => { clearTimeout(fallback); closeIntro(); });
    }
  }

  function closeIntro() {
    sessionStorage.setItem('afm-intro-played', '1');
    introOverlay.classList.add('closing');
    setTimeout(() => { introOverlay.style.display = 'none'; }, 1000);
  }
}

/* ---------- Navbar Scroll ---------- */
const navbar = document.getElementById('navbar');
if (navbar) {
  const onScroll = () => {
    if (window.scrollY > 24) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ---------- Hamburger Menu ---------- */
const hamburger   = document.getElementById('hamburger');
const mobileMenu  = document.getElementById('mobile-menu');
if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    hamburger.innerHTML = open
      ? '<i class="bi bi-x" style="font-size:1.2rem"></i>'
      : '<i class="bi bi-list" style="font-size:1.2rem"></i>';
  });
}

/* ---------- Dark / Light Theme ---------- */
const themeBtn = document.getElementById('theme-toggle');
const html      = document.documentElement;

// Persist theme
if (localStorage.getItem('afm-theme') === 'dark') {
  html.classList.add('dark');
}

if (themeBtn) {
  const updateIcon = () => {
    const isDark = html.classList.contains('dark');
    themeBtn.innerHTML = isDark
      ? '<i class="bi bi-sun"></i>'
      : '<i class="bi bi-moon"></i>';
  };
  updateIcon();

  themeBtn.addEventListener('click', () => {
    html.classList.toggle('dark');
    localStorage.setItem('afm-theme', html.classList.contains('dark') ? 'dark' : 'light');
    updateIcon();
  });
}

/* ---------- Scroll Reveal ---------- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ---------- Verse Slider ---------- */
const verses = [
  { v: '"I am the way, the truth, and the life. No one comes to the Father except through me."', r: 'John 14:6' },
  { v: '"For where two or three are gathered in My name, there am I in the midst of them."', r: 'Matthew 18:20' },
  { v: '"The Lord is my shepherd; I shall not want."', r: 'Psalm 23:1' },
  { v: '"Be still, and know that I am God."', r: 'Psalm 46:10' },
  { v: '"And this gospel of the kingdom will be preached in all the world… then the end will come."', r: 'Matthew 24:14' },
];

const verseText = document.getElementById('verse-text');
const verseRef  = document.getElementById('verse-ref');
const verseDots = document.getElementById('verse-dots');

if (verseText && verseRef && verseDots) {
  let currentVerse = 0;

  function renderVerse(idx) {
    verseText.style.opacity = '0';
    verseText.style.transform = 'translateY(20px)';
    verseRef.style.opacity = '0';
    setTimeout(() => {
      verseText.textContent = verses[idx].v;
      verseRef.textContent  = '— ' + verses[idx].r;
      verseText.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
      verseRef.style.transition  = 'opacity 0.7s ease';
      verseText.style.opacity    = '1';
      verseText.style.transform  = 'translateY(0)';
      verseRef.style.opacity     = '1';
    }, 200);

    verseDots.querySelectorAll('.verse-dot').forEach((d, k) => {
      d.classList.toggle('active', k === idx);
    });
  }

  // Build dots
  verses.forEach((_, k) => {
    const dot = document.createElement('button');
    dot.className = 'verse-dot' + (k === 0 ? ' active' : '');
    dot.addEventListener('click', () => { currentVerse = k; renderVerse(k); });
    verseDots.appendChild(dot);
  });

  renderVerse(0);
  setInterval(() => {
    currentVerse = (currentVerse + 1) % verses.length;
    renderVerse(currentVerse);
  }, 6000);
}

/* ---------- Floating Prayer Button ---------- */
const floatingBtn   = document.getElementById('floating-prayer-btn');
const prayerModal   = document.getElementById('prayer-modal');
const prayerClose   = document.getElementById('prayer-modal-close');
const prayerForm    = document.getElementById('prayer-form');
const prayerSuccess = document.getElementById('prayer-success');

function openPrayerModal() {
  if (prayerModal) {
    prayerModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}
function closePrayerModal() {
  if (prayerModal) {
    prayerModal.classList.remove('open');
    document.body.style.overflow = '';
    // Reset form
    if (prayerForm) prayerForm.style.display = 'flex';
    if (prayerSuccess) prayerSuccess.style.display = 'none';
    if (prayerForm) prayerForm.reset();
  }
}

if (floatingBtn)  floatingBtn.addEventListener('click', openPrayerModal);
if (prayerClose)  prayerClose.addEventListener('click', closePrayerModal);
if (prayerModal)  prayerModal.addEventListener('click', (e) => { if (e.target === prayerModal) closePrayerModal(); });

function submitPrayer(e) {
  e.preventDefault();
  if (prayerForm)    prayerForm.style.display = 'none';
  if (prayerSuccess) prayerSuccess.style.display = 'block';
  showToast('🙏 Prayer request received!');
  setTimeout(closePrayerModal, 2200);
}

/* ---------- Toast ---------- */
function showToast(msg, duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

/* ---------- Hover lift on gallery items ---------- */
document.querySelectorAll('.gallery-item img').forEach(img => {
  img.parentElement.addEventListener('mouseenter', () => img.style.transform = 'scale(1.1)');
  img.parentElement.addEventListener('mouseleave', () => img.style.transform = 'scale(1)');
});

/* ---------- Keyboard ESC closes modals ---------- */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closePrayerModal();
  }
});

function submitPrayer(event) {
  event.preventDefault();

  const form = document.getElementById('prayer-form');
  const name = form.querySelector('input[placeholder="Your name"]').value.trim();
  const phone = form.querySelector('input[type="tel"]').value.trim();
  const request = form.querySelector('textarea[placeholder="Share your prayer request…"]').value.trim();

  if (!name || !request) {
    alert('Please fill in your name and prayer request.');
    return;
  }

  const whatsappNumber = '8688153065';
  const message = `🙏 Prayer Request\n\nName: ${name}\nPhone: ${phone || 'Not provided'}\n\nRequest: ${request}`;

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  // Open WhatsApp
  window.open(whatsappUrl, '_blank');

  // Show success message
  document.getElementById('prayer-form').style.display = 'none';
  document.getElementById('prayer-success').style.display = 'block';
}
