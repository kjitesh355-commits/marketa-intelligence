/* MARKETA Intelligence — tsParticles Background */
document.addEventListener('DOMContentLoaded', function() {
  if (typeof tsParticles === 'undefined') return;
  var isMobile = window.matchMedia('(hover: none)').matches;
  tsParticles.load('tsparticles', {
    fullScreen: false,
    fpsLimit: 60,
    particles: {
      number: { value: isMobile ? 25 : 55, density: { enable: true, area: 900 } },
      color: { value: '#00D9FF' },
      opacity: { value: 0.12, animation: { enable: true, speed: 0.3, minimumValue: 0.05 } },
      links: { enable: true, distance: 140, color: '#00D9FF', opacity: 0.06, width: 1 },
      move: { enable: true, speed: 0.4, direction: 'none', outModes: 'bounce' },
      shape: { type: 'circle' },
      size: { value: { min: 1, max: 2.5 } }
    },
    interactivity: {
      events: {
        onHover: { enable: !isMobile, mode: 'repulse' },
        resize: true
      },
      modes: { repulse: { distance: 100, duration: 0.4 } }
    },
    detectRetina: true
  });
});