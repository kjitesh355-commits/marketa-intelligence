// Chatbot orb animations
(function() {
  function initChatOrb() {
    const orb = document.querySelector('.chat-orb');
    const chatPanel = document.getElementById('chat-panel');
    const chatToggle = document.getElementById('chat-toggle');

    if (!orb && chatToggle) {
      // Create orb if it doesn't exist
      const orbEl = document.createElement('div');
      orbEl.className = 'chat-orb';
      orbEl.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
      chatToggle.parentElement.insertBefore(orbEl, chatToggle);
    }

    const orbElement = orb || document.querySelector('.chat-orb');
    if (!orbElement) return;

    // Pulse while waiting for response
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          const typingIndicator = chatMessages.querySelector('.typing-indicator');
          if (typingIndicator) {
            orbElement.classList.add('waiting');
          } else {
            orbElement.classList.remove('waiting');
          }
        });
      });

      observer.observe(chatMessages, { childList: true, subtree: true });
    }

    // Spring animation on click
    orbElement.addEventListener('click', () => {
      orbElement.style.animation = 'none';
      orbElement.offsetHeight; // Trigger reflow
      orbElement.style.animation = 'orbBounce 0.5s ease';
    });

    // Add glow effect on hover
    orbElement.addEventListener('mouseenter', () => {
      orbElement.style.boxShadow = '0 0 30px rgba(99,102,241,0.7), 0 0 60px rgba(99,102,241,0.4)';
    });

    orbElement.addEventListener('mouseleave', () => {
      orbElement.style.boxShadow = '';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatOrb);
  } else {
    initChatOrb();
  }
})();