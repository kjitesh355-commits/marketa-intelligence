// 3D tilt effect for research cards
(function() {
  function initTiltEffect() {
    const cards = document.querySelectorAll('.file-card, .doc-card, .recent-card');

    cards.forEach(card => {
      card.style.transformStyle = 'preserve-3d';
      card.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 15;
        const rotateY = (centerX - x) / 15;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        card.style.boxShadow = `${-rotateY * 2}px ${rotateX * 2}px 30px rgba(0,0,0,0.3)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        card.style.boxShadow = '';
      });
    });
  }

  // Re-initialize when new content is added (for dynamic lists)
  const observer = new MutationObserver(() => {
    initTiltEffect();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initTiltEffect();
      const filesList = document.getElementById('files-list');
      if (filesList) {
        observer.observe(filesList, { childList: true });
      }
    });
  } else {
    initTiltEffect();
    const filesList = document.getElementById('files-list');
    if (filesList) {
      observer.observe(filesList, { childList: true });
    }
  }
})();