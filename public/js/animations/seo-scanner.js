// SEO Scanner animations
(function() {
  function initSEOScanner() {
    const scanBtn = document.getElementById('scan-btn');
    const urlInput = document.getElementById('url-input');
    const seoResults = document.getElementById('seo-results');

    if (scanBtn && urlInput) {
      scanBtn.addEventListener('click', () => {
        // Add scan beam effect
        const inputWrap = urlInput.closest('.url-input-wrap') || urlInput.parentElement;
        const beam = document.createElement('div');
        beam.className = 'scan-beam';
        inputWrap.style.position = 'relative';
        inputWrap.style.overflow = 'hidden';
        inputWrap.appendChild(beam);

        // Animate button
        scanBtn.disabled = true;
        scanBtn.innerHTML = '<svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Scanning...';

        // Animate gauges after scan completes
        setTimeout(() => {
          beam.remove();
          scanBtn.disabled = false;
          scanBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> Scan';

          // Animate score gauges if they exist
          document.querySelectorAll('.gauge-fill, .score-fill').forEach(gauge => {
            const target = gauge.dataset.score || gauge.dataset.value || 85;
            gauge.style.width = '0%';
            setTimeout(() => {
              gauge.style.transition = 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
              gauge.style.width = target + '%';
            }, 100);
          });

          // Animate score numbers
          document.querySelectorAll('.score-value, .audit-score').forEach(el => {
            const target = parseInt(el.dataset.score || el.textContent) || 85;
            animateNumber(el, 0, target, 1500);
          });
        }, 2000);
      });
    }
  }

  function animateNumber(el, start, end, duration) {
    const startTime = performance.now();
    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      el.textContent = current;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // Initialize when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSEOScanner);
  } else {
    initSEOScanner();
  }
})();