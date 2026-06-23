// Animated gradient borders — MARKETA Intelligence
// Minimal: ensures .glow-border class is on cards for CSS animation
(function() {
  function initGradientBorders() {
    var cards = document.querySelectorAll('.glass-card:not(.no-glow), .kpi-card, .chart-card, .table-card, .workflow-card, .platform-card, .seo-score-card, .seo-audit-section, .seo-roadmap-card');
    cards.forEach(function(card) {
      if (!card.classList.contains('glow-border')) {
        card.classList.add('glow-border');
      }
    });
  }

  var observer = new MutationObserver(function() {
    initGradientBorders();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initGradientBorders();
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    initGradientBorders();
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();