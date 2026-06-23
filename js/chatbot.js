document.addEventListener('DOMContentLoaded', () => {
  const widget = document.getElementById('chat-widget');
  const toggle = document.getElementById('chat-toggle');
  const closeBtn = document.getElementById('chat-close');
  const panel = document.getElementById('chat-panel');
  const messages = document.getElementById('chat-messages');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const clearBtn = document.getElementById('chat-clear');
  const suggestions = document.getElementById('chat-suggestions');
  const configBtn = document.getElementById('chat-config-btn');
  const configPanel = document.getElementById('chat-config');
  const configProvider = document.getElementById('config-provider');
  const configKey = document.getElementById('config-key');
  const configSave = document.getElementById('config-save');
  const configStatus = document.getElementById('chat-config-status');
  const statusDot = document.querySelector('.chat-status-dot');
  const statusLabel = document.querySelector('.chat-header-status');

  if (!widget || !toggle || !closeBtn || !panel || !messages || !input || !sendBtn) return;

  const sessionId = 'chat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  function getPageContext() {
    let ctx = widget.dataset.pageContext || '';
    if (window.activePdfContext && window.activePdfContext.name) {
      ctx += ` | Viewing PDF: "${window.activePdfContext.name}"`;
    }
    return ctx;
  }
  let configOpen = false;
  let isOpen = false;

  // ── Toggle chat ────────────────────────────────────────
  toggle.addEventListener('click', () => {
    isOpen = !isOpen;
    widget.classList.toggle('open', isOpen);
    if (isOpen) setTimeout(() => input.focus(), 200);
  });

  closeBtn.addEventListener('click', () => {
    isOpen = false;
    widget.classList.remove('open');
  });

  // ── Clear conversation ─────────────────────────────────
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      messages.innerHTML = '';
      appendMessage('Hi! I\'m your marketing AI. Ask me about SEO, analytics, or the audit results on this page.', 'bot');
      if (suggestions) suggestions.style.display = 'flex';
    });
  }

  // ── API Key config panel toggle ────────────────────────
  if (configBtn && configPanel) {
    configBtn.addEventListener('click', () => {
      configOpen = !configOpen;
      configPanel.classList.toggle('open', configOpen);
    });
  }

  // ── Save API key configuration ─────────────────────────
  function saveConfig() {
    const apiKey = configKey ? configKey.value.trim() : '';

    if (!apiKey) {
      fetch('/api/chat/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, provider: 'gemini', apiKey: '' })
      }).then(() => updateConfigStatus('none'));
      return;
    }

    configSave.disabled = true;
    configSave.textContent = 'Saving…';

    fetch('/api/chat/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, provider: 'gemini', apiKey })
    })
      .then(r => r.json())
      .then(data => {
        if (data.status === 'ok') {
          updateConfigStatus('gemini', apiKey);
          if (configPanel) configPanel.classList.remove('open');
          configOpen = false;
          appendSystemMessage('Connected to Gemini 2.5 Flash. Ask any marketing question!');
        } else if (data.status === 'cleared') {
          updateConfigStatus('none');
          appendSystemMessage('API key cleared.');
        }
      })
      .catch(() => {
        appendSystemMessage('Failed to save API key. Is the server running?');
      })
      .finally(() => {
        configSave.disabled = false;
        configSave.textContent = 'Save';
      });
  }

  if (configSave) {
    configSave.addEventListener('click', saveConfig);
    if (configKey) {
      configKey.addEventListener('keydown', e => { if (e.key === 'Enter') saveConfig(); });
    }
  }

  function updateConfigStatus(provider, apiKey) {
    if (!statusDot || !statusLabel) return;
    if (apiKey && apiKey !== 'free' && provider === 'gemini') {
      statusDot.style.background = '#10b981';
      statusLabel.innerHTML = `<span class="chat-status-dot" style="background:#10b981"></span> Gemini 2.5 Flash`;
      if (configStatus) configStatus.textContent = 'Connected: Gemini 2.5 Flash';
    } else {
      statusDot.style.background = '#f59e0b';
      statusLabel.innerHTML = `<span class="chat-status-dot" style="background:#f59e0b"></span> No key set`;
      if (configStatus) configStatus.textContent = 'Paste your Gemini API key';
    }
  }

  // Check server status (doesn't modify config)
  checkServerStatus();
  function checkServerStatus() {
    fetch('/api/chat/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, apiKey: null, provider: '' })
    })
      .then(r => r.json())
      .then(data => {
        if (data.status === 'configured' || data.status === 'env_configured') {
          updateConfigStatus(data.provider, 'active');
        } else {
          updateConfigStatus('none', '');
        }
      })
      .catch(() => {});
  }

  // ── Send message ──────────────────────────────────────
  function sendMessage(text) {
    text = text || input.value.trim();
    if (!text) return;

    appendMessage(text, 'user');
    input.value = '';
    sendBtn.disabled = true;
    if (suggestions) suggestions.style.display = 'none';

    showTyping();

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, sessionId, pageContext: getPageContext() })
    })
      .then(r => r.json())
      .then(data => {
        removeTyping();
        if (data.error) {
          const err = data.error.toLowerCase();
          let msg;
          if (err.includes('api key') || err.includes('no api key')) {
            msg = 'No API key found. Click the ⚙ button above to add your key.';
            if (configPanel) configPanel.classList.add('open');
            configOpen = true;
          } else if (err.includes('quota') || err.includes('exceeded')) {
            msg = 'API quota exceeded. Most free tiers have daily limits. Try again later or use a different key via ⚙.';
          } else if (err.includes('rate limit')) {
            msg = 'Too many requests. Please wait a moment and try again.';
          } else {
            msg = 'Sorry, I couldn\'t process that. ' + data.error;
          }
          appendMessage(msg, 'bot');
          return;
        }
        appendMessage(data.reply, 'bot');
      })
      .catch(() => {
        removeTyping();
        appendMessage('Network error. Check your connection and try again.', 'bot');
      })
      .finally(() => { sendBtn.disabled = false; });
  }

  sendBtn.addEventListener('click', () => sendMessage());
  input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

  if (suggestions) {
    suggestions.addEventListener('click', e => {
      const chip = e.target.closest('.suggestion-chip');
      if (chip) sendMessage(chip.textContent.trim());
    });
  }

  // ── Message rendering ─────────────────────────────────
  function appendMessage(text, role) {
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;

    const isBot = role === 'bot';
    const avatar = isBot
      ? `<div class="msg-avatar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.27A7 7 0 0 1 14 23h-4a7 7 0 0 1-6.73-5H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg></div>`
      : `<div class="msg-avatar">U</div>`;

    const formatted = isBot ? renderMarkdown(text) : escapeHtml(text);
    div.innerHTML = `${avatar}<div class="msg-content"><div class="msg-text">${formatted}</div></div>`;
    messages.appendChild(div);
    scrollToBottom();
  }

  function appendSystemMessage(text) {
    const div = document.createElement('div');
    div.className = 'chat-msg bot';
    div.innerHTML = `<div class="msg-avatar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.27A7 7 0 0 1 14 23h-4a7 7 0 0 1-6.73-5H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg></div><div class="msg-content"><div class="msg-text" style="color:var(--text-muted);font-style:italic">${escapeHtml(text)}</div></div>`;
    messages.appendChild(div);
    scrollToBottom();
  }

  function renderMarkdown(text) {
    let html = escapeHtml(text);

    const codeBlocks = [];
    html = html.replace(/<pre><code>[\s\S]*?<\/code><\/pre>/g, match => {
      codeBlocks.push(match);
      return `\x00CODEBLOCK${codeBlocks.length - 1}\x00`;
    });

    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    html = html.replace(/^[\s]*\d+\.\s+(.+)$/gm, '<li data-o>$1</li>');
    html = html.replace(/^[\s]*[-*]\s+(.+)$/gm, '<li data-u>$1</li>');
    html = html.replace(/(?:<li data-o>.*?<\/li>\n?)+/g, '<ol>$&</ol>');
    html = html.replace(/<li data-o>/g, '<li>');
    html = html.replace(/(?:<li data-u>.*?<\/li>\n?)+/g, '<ul>$&</ul>');
    html = html.replace(/<li data-u>/g, '<li>');

    html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/\x00CODEBLOCK(\d+)\x00/g, (_, i) => codeBlocks[+i] || '');

    return html;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'chat-msg bot';
    div.id = 'typing-indicator';
    div.innerHTML = `<div class="msg-avatar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.27A7 7 0 0 1 14 23h-4a7 7 0 0 1-6.73-5H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg></div><div class="msg-content"><div class="msg-text msg-typing"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div></div>`;
    messages.appendChild(div);
    scrollToBottom();
  }

  function removeTyping() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
  }

  function scrollToBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }
});
