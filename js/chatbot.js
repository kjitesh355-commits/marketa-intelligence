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
  const configKey = document.getElementById('config-key');
  const configSave = document.getElementById('config-save');
  const configStatus = document.getElementById('chat-config-status');
  const statusDot = document.querySelector('.chat-status-dot');
  const statusLabel = document.querySelector('.chat-header-status');

  if (!widget || !toggle || !closeBtn || !panel || !messages || !input || !sendBtn) return;

  const STORAGE_KEY = 'marketa_chat_api_key';
  let configOpen = false;
  let isOpen = false;
  let conversationHistory = [];

  // ── Load saved API key ──────────────────────────────────
  const savedKey = localStorage.getItem(STORAGE_KEY);
  if (savedKey) {
    updateConfigStatus('gemini', savedKey);
  }

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
      conversationHistory = [];
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

  // ── Save API key (localStorage) ────────────────────────
  function saveConfig() {
    const apiKey = configKey ? configKey.value.trim() : '';

    if (!apiKey) {
      localStorage.removeItem(STORAGE_KEY);
      updateConfigStatus('none', '');
      appendSystemMessage('API key cleared.');
      if (configPanel) configPanel.classList.remove('open');
      configOpen = false;
      return;
    }

    configSave.disabled = true;
    configSave.textContent = 'Saving…';

    // Validate key by making a test call
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
        generationConfig: { maxOutputTokens: 10 }
      })
    })
      .then(r => {
        if (!r.ok) throw new Error('Invalid key');
        return r.json();
      })
      .then(() => {
        localStorage.setItem(STORAGE_KEY, apiKey);
        updateConfigStatus('gemini', apiKey);
        if (configPanel) configPanel.classList.remove('open');
        configOpen = false;
        appendSystemMessage('Connected to Gemini 2.5 Flash. Ask any marketing question!');
      })
      .catch(() => {
        appendSystemMessage('Invalid API key. Get a free key at aistudio.google.com');
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
    if (apiKey && provider === 'gemini') {
      statusDot.style.background = '#10b981';
      statusLabel.innerHTML = '<span class="chat-status-dot" style="background:#10b981"></span> Gemini 2.5 Flash';
      if (configStatus) configStatus.textContent = 'Connected: Gemini 2.5 Flash';
    } else {
      statusDot.style.background = '#f59e0b';
      statusLabel.innerHTML = '<span class="chat-status-dot" style="background:#f59e0b"></span> No key set';
      if (configStatus) configStatus.textContent = 'Paste your Gemini API key';
    }
  }

  // ── Simulated response ────────────────────────────────
  function generateSimulatedResponse(message) {
    const msg = message.toLowerCase();

    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
      return 'Hello! I\'m your MARKETA Marketing AI Assistant. I can help with SEO, Google Analytics, social media strategy, content marketing, and paid ads. What would you like to know?';
    }
    if (msg.includes('seo') || msg.includes('search engine')) {
      return '## SEO Best Practices\n\n1. **Title Tags** — Keep 50–60 chars with primary keyword near the front\n2. **Meta Descriptions** — 150–160 chars with compelling CTA\n3. **Header Structure** — One H1, logical H2/H3 hierarchy\n4. **Image Alt Text** — Descriptive, includes target keywords\n5. **Page Speed** — LCP < 2.5s, CLS < 0.1\n\n> *Add your API key via ⚙ for AI-powered analysis.*';
    }
    if (msg.includes('analytics') || msg.includes('ga4')) {
      return '## Google Analytics Key Metrics\n\n- **Users & Sessions** — Measure audience reach\n- **Bounce Rate** — Target < 40% for content sites\n- **Conversion Rate** — Track goal completions\n- **Traffic Sources** — Organic vs paid vs referral\n\n**GA4 Tip:** Use Explorations for custom funnel analysis.';
    }
    if (msg.includes('social')) {
      return '## Social Media Strategy\n\n**Content Mix (40-30-30 Rule)**\n- 40% Value — Educational posts, tips\n- 30% Engagement — Polls, questions\n- 30% Promotion — Products, services\n\n**Best posting cadence:** 3-5x/week minimum for growth.';
    }

    return `Great question about "${message.slice(0, 60)}"!\n\nIn digital marketing, the key is to **test, measure, and iterate**.\n\n1. Set clear KPIs\n2. Track everything\n3. A/B test one variable at a time\n4. Audit regularly\n\n> *Add your API key via ⚙ for personalized AI responses.*`;
  }

  // ── Send message ──────────────────────────────────────
  async function sendMessage(text) {
    text = text || input.value.trim();
    if (!text) return;

    appendMessage(text, 'user');
    input.value = '';
    sendBtn.disabled = true;
    if (suggestions) suggestions.style.display = 'none';

    showTyping();

    const apiKey = localStorage.getItem(STORAGE_KEY);

    if (apiKey) {
      try {
        conversationHistory.push({ role: 'user', parts: [{ text }] });

        const systemPrompt = 'You are a digital marketing expert assistant. Help users understand SEO, Google Analytics, and social media analytics. Be concise and actionable. Use markdown formatting.';
        const contents = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: 'I understand. I\'m your digital marketing expert assistant. How can I help?' }] },
          ...conversationHistory
        ];

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
          })
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.';
        conversationHistory.push({ role: 'model', parts: [{ text: reply }] });
        removeTyping();
        appendMessage(reply, 'bot');
      } catch (err) {
        removeTyping();
        const msg = err.message || '';
        if (msg.includes('API_KEY_INVALID') || msg.includes('key not valid')) {
          localStorage.removeItem(STORAGE_KEY);
          updateConfigStatus('none', '');
          appendMessage('Your API key is invalid. Click ⚙ to add a valid key from aistudio.google.com', 'bot');
        } else if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
          appendMessage('API quota exceeded. Free tiers have daily limits — try again later or add a different key via ⚙.', 'bot');
        } else {
          appendMessage('Network error. Check your connection and try again.', 'bot');
        }
      }
    } else {
      removeTyping();
      const reply = generateSimulatedResponse(text);
      appendMessage(reply, 'bot');
    }

    sendBtn.disabled = false;
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
      ? '<div class="msg-avatar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.27A7 7 0 0 1 14 23h-4a7 7 0 0 1-6.73-5H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg></div>'
      : '<div class="msg-avatar">U</div>';

    const formatted = isBot ? renderMarkdown(text) : escapeHtml(text);
    div.innerHTML = `${avatar}<div class="msg-content"><div class="msg-text">${formatted}</div></div>`;
    messages.appendChild(div);
    scrollToBottom();
  }

  function appendSystemMessage(text) {
    const div = document.createElement('div');
    div.className = 'chat-msg bot';
    div.innerHTML = '<div class="msg-avatar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.27A7 7 0 0 1 14 23h-4a7 7 0 0 1-6.73-5H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg></div><div class="msg-content"><div class="msg-text" style="color:var(--text-muted);font-style:italic">' + escapeHtml(text) + '</div></div>';
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
    div.innerHTML = '<div class="msg-avatar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.27A7 7 0 0 1 14 23h-4a7 7 0 0 1-6.73-5H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg></div><div class="msg-content"><div class="msg-text msg-typing"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div></div>';
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
