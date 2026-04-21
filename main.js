/* ============================================================
   Chat Japanese — main.js
   ============================================================ */

/* ── Navbar scroll ── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* ── Desktop dropdown toggle ── */
function toggleNav(id) {
  const li = document.getElementById(id);
  const isOpen = li.classList.contains('open');
  document.querySelectorAll('.has-dropdown').forEach(el => el.classList.remove('open'));
  if (!isOpen) li.classList.add('open');
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.has-dropdown')) {
    document.querySelectorAll('.has-dropdown').forEach(el => el.classList.remove('open'));
  }
});

/* ── Mobile menu ── */
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  menu.classList.toggle('open');
  document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
}
function toggleMobileSub(btn) {
  btn.closest('.mobile-nav-item').classList.toggle('open');
}

/* ── Smooth scroll ── */
function smoothScroll(e, id) {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

/* ── Scroll reveal ── */
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.07, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.fade-up').forEach(el => io.observe(el));
