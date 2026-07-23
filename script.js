const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.main-nav');

function setMenu(open) {
  if (!menuButton || !navigation) return;
  menuButton.setAttribute('aria-expanded', String(open));
  navigation.classList.toggle('is-open', open);
  document.body.classList.toggle('menu-open', open);
}

if (menuButton && navigation) {
  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenu(false);
  });
}

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }), { threshold: 0.12 });
  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

document.querySelectorAll('[data-current-year]').forEach((element) => {
  element.textContent = new Date().getFullYear();
});

const breadcrumb = document.querySelector('.breadcrumb');
if (breadcrumb) {
  const canonical = document.querySelector('link[rel="canonical"]');
  const entries = Array.from(breadcrumb.querySelectorAll('li')).map((entry, index, allEntries) => {
    const link = entry.querySelector('a');
    const item = link
      ? new URL(link.getAttribute('href'), window.location.origin).href
      : canonical?.href || window.location.href;

    return {
      '@type': 'ListItem',
      position: index + 1,
      name: entry.textContent.trim(),
      ...(item && (link || index === allEntries.length - 1) ? { item } : {}),
    };
  });

  if (entries.length > 1) {
    const structuredData = document.createElement('script');
    structuredData.type = 'application/ld+json';
    structuredData.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: entries,
    });
    document.head.append(structuredData);
  }
}

const quoteForm = document.getElementById('quote-form');
if (quoteForm) {
  quoteForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const readField = (name, maxLength) => String(data.get(name) || '').trim().slice(0, maxLength);
    const name = readField('name', 100);
    const email = readField('email', 254);
    const phone = readField('phone', 40);
    const service = readField('service', 100);
    const message = readField('message', 2000);

    const whatsappMessage = [
      'Hallo Bijvoets Deuren, ik wil graag vrijblijvend een offerte aanvragen.',
      '',
      `Naam: ${name}`,
      `E-mailadres: ${email}`,
      `Telefoonnummer: ${phone || 'Niet opgegeven'}`,
      `Dienst: ${service}`,
      '',
      'Omschrijving:',
      message,
    ].join('\n');

    const whatsappUrl = new URL('https://wa.me/31638569988');
    whatsappUrl.searchParams.set('text', whatsappMessage);
    window.location.assign(whatsappUrl.toString());
  });
}
