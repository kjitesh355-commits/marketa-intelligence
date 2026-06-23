/* MARKETA Intelligence — 3D Card Tilt + Shine */
document.addEventListener('DOMContentLoaded', function() {
  if (window.matchMedia('(hover: none)').matches) return;
  var cards = document.querySelectorAll('.glass-card, .kpi-card, .gauge-card, .table-card, .chart-card, .workflow-card, .segment-card, .seo-score-card, .seo-audit-section, .seo-roadmap-card, .seo-ai-card, .seo-code-card');

  cards.forEach(function(card) {
    var shine = document.createElement('div');
    shine.className = 'card-shine';
    shine.style.cssText = 'position:absolute;inset:0;pointer-events:none;border-radius:inherit;opacity:0;transition:opacity 0.3s;z-index:1;';
    card.style.position = 'relative';
    card.appendChild(shine);

    card.addEventListener('mousemove', function(e) {
      var rect = card.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width;
      var y = (e.clientY - rect.top) / rect.height;
      var rotateX = (y - 0.5) * -10;
      var rotateY = (x - 0.5) * 10;
      card.style.transform = 'perspective(1000px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-4px)';
      card.style.transition = 'transform 0.1s ease';
      shine.style.opacity = '1';
      shine.style.background = 'radial-gradient(circle at ' + (x * 100) + '% ' + (y * 100) + '%, rgba(255,255,255,0.05) 0%, transparent 60%)';
      card.style.setProperty('--mouse-x', (x * 100) + '%');
      card.style.setProperty('--mouse-y', (y * 100) + '%');
    });

    card.addEventListener('mouseleave', function() {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
      card.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1)';
      shine.style.opacity = '0';
    });
  });
});