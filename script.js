const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.main-nav');

function setMenu(open) {
  menuButton.setAttribute('aria-expanded', String(open));
  navigation.classList.toggle('is-open', open);
  document.body.classList.toggle('menu-open', open);
}

menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenu(false); });

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
  }), { threshold: 0.12 });
  revealItems.forEach((item) => observer.observe(item));
} else { revealItems.forEach((item) => item.classList.add('is-visible')); }

document.getElementById('year').textContent = new Date().getFullYear();
document.getElementById('quote-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const subject = `Offerteaanvraag ${data.get('service')} - ${data.get('name')}`;
  const body = [`Naam: ${data.get('name')}`, `E-mailadres: ${data.get('email')}`, `Telefoonnummer: ${data.get('phone') || 'Niet opgegeven'}`, `Dienst: ${data.get('service')}`, '', 'Omschrijving:', data.get('message')].join('\n');
  window.location.href = `mailto:quintbijvoets@hotmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
