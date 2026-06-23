// GSAP ScrollTrigger stagger reveals — MARKETA Intelligence
(function() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  // Reveal glass cards with stagger
  var cards = document.querySelectorAll('.glass-card, .kpi-card, .workflow-card, .platform-card, .connect-panel, .seo-score-card, .seo-audit-section, .seo-roadmap-card');
  cards.forEach(function(card, i) {
    gsap.from(card, {
      y: 50,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        once: true
      },
      delay: (i % 4) * 0.1
    });
  });

  // Reveal section headers
  var headers = document.querySelectorAll('.section-header, .page-header, .checker-container');
  headers.forEach(function(header) {
    gsap.from(header, {
      y: 30,
      opacity: 0,
      duration: 0.6,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: header,
        start: 'top 90%',
        once: true
      }
    });
  });

  // Reveal hero content
  var heroContent = document.querySelector('.hero-content');
  if (heroContent) {
    gsap.from('.hero-eyebrow', { y: 20, opacity: 0, duration: 0.6, delay: 0.2 });
    gsap.from('.hero-title', { y: 30, opacity: 0, duration: 0.8, delay: 0.4 });
    gsap.from('.hero-description', { y: 20, opacity: 0, duration: 0.6, delay: 0.6 });
    gsap.from('.hero-cta', { y: 20, opacity: 0, duration: 0.6, delay: 0.8 });
    gsap.from('.hero-stats', { y: 20, opacity: 0, duration: 0.6, delay: 1.0 });
    gsap.from('.hero-preview', { y: 40, opacity: 0, duration: 0.8, delay: 1.2 });
  }

  // Reveal feature cards with stagger
  var featureCards = document.querySelectorAll('.feature-card');
  featureCards.forEach(function(card, i) {
    gsap.from(card, {
      y: 60,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        once: true
      },
      delay: i * 0.15
    });
  });

  // Reveal step cards
  var stepCards = document.querySelectorAll('.step-card');
  stepCards.forEach(function(card, i) {
    gsap.from(card, {
      y: 40,
      opacity: 0,
      duration: 0.6,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        once: true
      },
      delay: i * 0.2
    });
  });

  // Reveal testimonial cards
  var testimonialCards = document.querySelectorAll('.testimonial-card');
  testimonialCards.forEach(function(card, i) {
    gsap.from(card, {
      y: 50,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        once: true
      },
      delay: i * 0.15
    });
  });

  // Reveal SEO audit sections with stagger
  var seoSections = document.querySelectorAll('.seo-audit-section');
  seoSections.forEach(function(section, i) {
    gsap.from(section, {
      y: 40,
      opacity: 0,
      duration: 0.7,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: section,
        start: 'top 88%',
        once: true
      },
      delay: i * 0.08
    });
  });
})();