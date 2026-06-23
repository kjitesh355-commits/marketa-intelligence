document.addEventListener('DOMContentLoaded', () => {
  const uploadZone = document.getElementById('upload-zone');
  const uploadContent = document.getElementById('upload-zone-content');
  const fileInput = document.getElementById('file-input');
  const fileList = document.getElementById('file-list');
  const fileListSection = document.getElementById('file-list-section');
  const emptyState = document.getElementById('empty-state');
  const analyzingOverlay = document.getElementById('analyzing-overlay');
  const analyzingText = document.getElementById('analyzing-text');
  const researchError = document.getElementById('research-error');
  const researchErrorMsg = document.getElementById('research-error-msg');

  // Modal elements
  const modalOverlay = document.getElementById('doc-modal-overlay');
  const modalTitle = document.getElementById('doc-modal-title');
  const summaryText = document.getElementById('doc-summary-text');
  const btnSummarize = document.getElementById('btn-summarize');
  const docChatMsgs = document.getElementById('doc-chat-msgs');
  const docChatInput = document.getElementById('doc-chat-input');
  const docChatSend = document.getElementById('doc-chat-send');

  let currentFileId = null;
  let currentFileName = '';

  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

  // ── Drag-and-drop upload ──────────────────────────────
  uploadZone.addEventListener('click', () => fileInput.click());

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  });

  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files);
    handleFiles(files);
    fileInput.value = '';
  });

  function handleFiles(files) {
    const pdfs = files.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));

    if (pdfs.length !== files.length) {
      showError('Only PDF files are accepted. Non-PDF files were skipped.');
    }

    if (pdfs.length === 0) return;

    const oversized = pdfs.filter(f => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      showError(`"${oversized[0].name}" exceeds the 15 MB limit.`);
      return;
    }

    pdfs.forEach(uploadFile);
  }

  function uploadFile(file) {
    showAnalyzing(`Uploading ${file.name}...`);

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(',')[1];

      fetch('/api/research/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, size: file.size, data: base64 })
      })
        .then(r => r.json())
        .then(data => {
          if (data.error) { hideAnalyzing(); showError(data.error); return; }
          hideAnalyzing();
          refreshFileList();
        })
        .catch(() => {
          hideAnalyzing();
          showError('Upload failed. Is the server running?');
        });
    };
    reader.readAsDataURL(file);
  }

  // ── File list ─────────────────────────────────────────
  function refreshFileList() {
    fetch('/api/research/files')
      .then(r => r.json())
      .then(data => {
        if (data.error) return;
        renderFileList(data.files || []);
      });
  }

  function renderFileList(files) {
    if (files.length === 0) {
      fileListSection.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    fileListSection.style.display = 'block';
    emptyState.style.display = 'none';
    fileList.innerHTML = files.map(f => renderFileItem(f)).join('');
  }

  function renderFileItem(f) {
    const date = new Date(f.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const size = formatSize(f.size);
    const icon = f.summary
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>`;

    return `
      <div class="file-item glass-card">
        <div class="file-item-icon">${icon}</div>
        <div class="file-item-info">
          <div class="file-item-name">${escapeHtml(f.name)}</div>
          <div class="file-item-meta">${date} &middot; ${size}</div>
        </div>
        <div class="file-item-actions">
          <button class="btn btn-sm btn-ghost" onclick="window.openDoc('${f.id}')" title="Open & analyze">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Analyze
          </button>
          <button class="btn btn-sm btn-ghost" onclick="window.deleteFile('${f.id}')" title="Delete" style="color:var(--text-muted)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  window.openDoc = function(fileId) {
    currentFileId = fileId;
    currentFileName = '';
    btnSummarize.disabled = false;
    btnSummarize.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg> Generate Summary`;
    summaryText.innerHTML = `<button class="btn btn-primary btn-sm" id="btn-summarize-reinit">Generate Summary</button>`;
    docChatMsgs.innerHTML = `<div class="doc-chat-msg bot">Ask a question about this PDF and I'll answer based on its content.</div>`;

    fetch('/api/research/files')
      .then(r => r.json())
      .then(data => {
        const file = (data.files || []).find(f => f.id === fileId);
        if (file) {
          currentFileName = file.name;
          modalTitle.textContent = file.name;
          if (file.summary) {
            summaryText.innerHTML = `<div class="doc-summary-content">${renderMarkdownShort(file.summary)}</div>`;
            btnSummarize.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Regenerate`;
          } else {
            const reinitBtn = summaryText.querySelector('#btn-summarize-reinit');
            if (reinitBtn) reinitBtn.addEventListener('click', () => generateSummary(fileId));
          }
          window.activePdfContext = { id: fileId, name: file.name };
        }
        openModal('doc-modal-overlay');
      });
  };

  window.deleteFile = function(fileId) {
    fetch(`/api/research/files/${fileId}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(data => {
        if (data.error) { showError(data.error); return; }
        showToast('File deleted', 'info');
        refreshFileList();
      });
  };

  // ── Generate Summary ──────────────────────────────────
  function generateSummary(fileId) {
    const apiKey = localStorage.getItem('research_gemini_key');
    if (!apiKey) {
      showError('Please set your Gemini API key in the research chatbot first (click the document icon, then ⚙).');
      return;
    }

    // Find the current summary button in the modal
    const currentBtn = document.getElementById('btn-summarize-reinit') || document.getElementById('btn-summarize');
    if (!currentBtn) return;

    showAnalyzing('Generating AI summary...');
    currentBtn.disabled = true;
    currentBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Summarizing...`;

    fetch('/api/research/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, apiKey })
    })
      .then(r => r.json())
      .then(data => {
        hideAnalyzing();
        if (data.error) { showError(data.error); currentBtn.disabled = false; return; }
        summaryText.innerHTML = `<div class="doc-summary-content">${renderMarkdownShort(data.summary)}</div>`;
        refreshFileList();
      })
      .catch(() => {
        hideAnalyzing();
        showError('Failed to generate summary.');
        currentBtn.disabled = false;
        currentBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg> Generate Summary`;
      });
  }

  // Summary button — uses either the re-init button from modal or the main one
  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-summarize') || e.target.closest('#btn-summarize-reinit')) {
      if (currentFileId) generateSummary(currentFileId);
    }
  });

  // ── Ask about document (in modal) ─────────────────────
  function askDocument(question) {
    if (!question || !currentFileId) return;

    const apiKey = localStorage.getItem('research_gemini_key');
    if (!apiKey) {
      appendDocMessage('Please set your Gemini API key in the research chatbot first.', 'bot');
      return;
    }

    appendDocMessage(question, 'user');
    docChatInput.value = '';
    docChatSend.disabled = true;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'doc-chat-msg bot';
    typingDiv.id = 'doc-chat-typing';
    typingDiv.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
    docChatMsgs.appendChild(typingDiv);
    docChatMsgs.scrollTop = docChatMsgs.scrollHeight;

    fetch('/api/research/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: currentFileId, question, apiKey })
    })
      .then(r => r.json())
      .then(data => {
        const el = document.getElementById('doc-chat-typing');
        if (el) el.remove();
        if (data.error) {
          appendDocMessage('Error: ' + data.error, 'bot');
          return;
        }
        appendDocMessage(data.answer, 'bot');
      })
      .catch(() => {
        const el = document.getElementById('doc-chat-typing');
        if (el) el.remove();
        appendDocMessage('Network error.', 'bot');
      })
      .finally(() => { docChatSend.disabled = false; });
  }

  docChatSend.addEventListener('click', () => askDocument(docChatInput.value.trim()));
  docChatInput.addEventListener('keydown', e => { if (e.key === 'Enter') askDocument(docChatInput.value.trim()); });

  function appendDocMessage(text, role) {
    const div = document.createElement('div');
    div.className = `doc-chat-msg ${role}`;
    div.textContent = text;
    docChatMsgs.appendChild(div);
    docChatMsgs.scrollTop = docChatMsgs.scrollHeight;
  }

  // ── Utilities ─────────────────────────────────────────
  function showAnalyzing(msg) {
    analyzingText.textContent = msg || 'Analyzing document...';
    analyzingOverlay.style.display = 'flex';
  }

  function hideAnalyzing() {
    analyzingOverlay.style.display = 'none';
  }

  function showError(msg) {
    researchErrorMsg.textContent = msg;
    researchError.style.display = 'block';
    setTimeout(() => { researchError.style.display = 'none'; }, 5000);
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  function renderMarkdownShort(text) {
    let html = escapeHtml(text);
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  // ── Initial load ──────────────────────────────────────
  refreshFileList();
});
