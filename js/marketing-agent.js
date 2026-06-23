/* =========================================================
   MARKETA Intelligence — Performance Marketing AI Agent v2
   ========================================================= */
(function () {
  'use strict';

  // ─── State ────────────────────────────────────────────────
  let currentCurrency = 'AED';
  let isAnalyzing = false;
  let analyzeHistory = [];
  let adgenHistory = [];
  let recentAnalyses = JSON.parse(localStorage.getItem('recentAnalyses') || '[]');

  const $ = (sel) => document.querySelector(sel);

  // ─── Mobile Menu ──────────────────────────────────────────
  const menuToggle = $('#menu-toggle');
  const sidebar = $('#sidebar');
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== menuToggle) {
        sidebar.classList.remove('open');
      }
    });
  }

  // ─── DOM ──────────────────────────────────────────────────
  const modeBtns = document.querySelectorAll('.mode-btn');
  const modeContents = document.querySelectorAll('.mode-content');
  const campaignForm = $('#campaign-form');
  const analyzeBtn = $('#analyze-btn');
  const statusOrb = $('#status-orb');
  const statusText = $('#status-text');
  const aiStatusPanel = $('#ai-status-panel');
  const reportOutput = $('#report-output');
  const loadingState = $('#loading-state');
  const newAnalysisBtn = $('#new-analysis-btn');
  const followupChat = $('#followup-chat');
  const followupMessages = $('#followup-messages');
  const followupInput = $('#followup-input');
  const followupSend = $('#followup-send');
  const adgenForm = $('#adgen-form');
  const generateBtn = $('#generate-btn');
  const adgenEmpty = $('#adgen-empty-state');
  const adgenLoading = $('#adgen-loading-state');
  const adgenPreviews = $('#adgen-previews');

  // ─── Benchmarks ───────────────────────────────────────────
  const benchmarks = {
    ctr:  { min: 1.5, max: 3, label: 'CTR', unit: '%' },
    cpc:  { min: 1, max: 3, label: 'CPC', unit: ' AED' },
    cpl:  { min: 28, max: 45, label: 'CPL', unit: ' AED' },
    cvr:  { min: 2, max: 5, label: 'Conv Rate', unit: '%' },
    roas: { min: 3, max: 6, label: 'ROAS', unit: 'x' },
  };

  // ─── Orb Animation ────────────────────────────────────────
  const canvas = $('#orb-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  let orbNodes = [];
  let orbAnimId = null;
  let orbSpeed = 1;

  function initOrb() {
    if (!canvas || !ctx) return;
    canvas.width = 200; canvas.height = 200;
    orbNodes = [];
    for (let i = 0; i < 20; i++) {
      orbNodes.push({
        x: 100 + (Math.random() - 0.5) * 120,
        y: 100 + (Math.random() - 0.5) * 120,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 1,
      });
    }
    animateOrb();
  }

  function animateOrb() {
    if (!ctx) return;
    ctx.clearRect(0, 0, 200, 200);

    // Glow
    const gradient = ctx.createRadialGradient(100, 100, 10, 100, 100, 80);
    gradient.addColorStop(0, 'rgba(34,211,238,0.15)');
    gradient.addColorStop(1, 'rgba(34,211,238,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 200, 200);

    // Update nodes
    orbNodes.forEach(n => {
      n.x += n.vx * orbSpeed;
      n.y += n.vy * orbSpeed;
      if (n.x < 20 || n.x > 180) n.vx *= -1;
      if (n.y < 20 || n.y > 180) n.vy *= -1;
    });

    // Draw connections
    ctx.strokeStyle = 'rgba(34,211,238,0.2)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < orbNodes.length; i++) {
      for (let j = i + 1; j < orbNodes.length; j++) {
        const dx = orbNodes[i].x - orbNodes[j].x;
        const dy = orbNodes[i].y - orbNodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 60) {
          ctx.globalAlpha = 1 - dist / 60;
          ctx.beginPath();
          ctx.moveTo(orbNodes[i].x, orbNodes[i].y);
          ctx.lineTo(orbNodes[j].x, orbNodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    ctx.globalAlpha = 1;
    orbNodes.forEach(n => {
      ctx.fillStyle = 'rgba(34,211,238,0.8)';
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Center glow
    ctx.fillStyle = 'rgba(34,211,238,0.1)';
    ctx.beginPath();
    ctx.arc(100, 100, 20 + Math.sin(Date.now() / 500) * 5, 0, Math.PI * 2);
    ctx.fill();

    orbAnimId = requestAnimationFrame(animateOrb);
  }

  // ─── Mode Switching ───────────────────────────────────────
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      modeContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      $(`#content-${btn.dataset.mode}`).classList.add('active');
    });
  });

  // ─── Currency Toggle ──────────────────────────────────────
  document.querySelectorAll('.currency-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCurrency = btn.dataset.currency;
      document.querySelectorAll('.currency-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ─── Metric Benchmarks ────────────────────────────────────
  ['ctr', 'cpc', 'cpl', 'cvr', 'roas'].forEach(key => {
    const input = $(`#metric-${key}`);
    if (!input) return;
    input.addEventListener('input', () => {
      updateBenchmark(key, parseFloat(input.value));
      updateHealthScore();
    });
  });

  function updateBenchmark(key, val) {
    const b = benchmarks[key];
    const el = $(`#bench-${key}`);
    if (!el || isNaN(val) || val === 0) { el.innerHTML = ''; return; }

    let status, text;
    if (key === 'cpc' || key === 'cpl') {
      if (val <= b.min) { status = 'good'; text = `✅ Strong (benchmark: ${b.min}–${b.max}${b.unit})`; }
      else if (val <= b.max) { status = 'warn'; text = `⚠️ Average (benchmark: ${b.min}–${b.max}${b.unit})`; }
      else { status = 'bad'; text = `🔴 Above average (benchmark: ${b.min}–${b.max}${b.unit})`; }
    } else {
      if (val >= b.max) { status = 'good'; text = `✅ Strong (benchmark: ${b.min}–${b.max}${b.unit})`; }
      else if (val >= b.min) { status = 'warn'; text = `⚠️ Average (benchmark: ${b.min}–${b.max}${b.unit})`; }
      else { status = 'bad'; text = `🔴 Below average (benchmark: ${b.min}–${b.max}${b.unit})`; }
    }

    el.innerHTML = `<span class="metric-benchmark ${status}">${text}</span>
      <div class="metric-bar"><div class="metric-bar-fill ${status}" style="width:${Math.min(100, (key === 'cpc' || key === 'cpl') ? Math.max(10, 100 - (val / b.max) * 50) : Math.min(100, (val / b.max) * 100))}%"></div></div>`;
  }

  function updateHealthScore() {
    let score = 50;
    const ctr = parseFloat($('#metric-ctr')?.value);
    const cpc = parseFloat($('#metric-cpc')?.value);
    const cpl = parseFloat($('#metric-cpl')?.value);
    const cvr = parseFloat($('#metric-cvr')?.value);
    const roas = parseFloat($('#metric-roas')?.value);

    if (!isNaN(ctr)) score += ctr >= 1.5 ? (ctr >= 3 ? 15 : 10) : -10;
    if (!isNaN(cpc)) score += cpc <= 3 ? (cpc <= 1 ? 15 : 10) : -10;
    if (!isNaN(cpl)) score += cpl <= 45 ? (cpl <= 28 ? 15 : 10) : -10;
    if (!isNaN(cvr)) score += cvr >= 2 ? (cvr >= 5 ? 15 : 10) : -10;
    if (!isNaN(roas)) score += roas >= 3 ? (roas >= 6 ? 15 : 10) : -10;

    score = Math.max(0, Math.min(100, score));
    const fill = $('#health-fill');
    const val = $('#health-value');
    if (fill && val) {
      const offset = 264 - (264 * score / 100);
      fill.style.strokeDashoffset = offset;
      fill.style.stroke = score >= 70 ? 'var(--emerald)' : score >= 40 ? 'var(--amber)' : 'var(--rose)';
      val.textContent = score;
      val.style.color = score >= 70 ? 'var(--emerald)' : score >= 40 ? 'var(--amber)' : 'var(--rose)';
    }
  }

  // ─── Quick Chips ──────────────────────────────────────────
  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (isAnalyzing) return;
      const preload = chip.dataset.preload?.split('|') || [];
      if (preload.length >= 5) {
        $('#campaign-platform').value = preload[1] || '';
        $('#campaign-objective').value = preload[0] || '';
        $('#campaign-audience').value = preload[2] || '';
        $('#campaign-budget').value = preload[3] || '';
        $('#campaign-creatives').value = preload[4] || '';
      }
      if (analyzeBtn) analyzeBtn.click();
    });
  });

  // ─── Analyze Campaign ─────────────────────────────────────
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isAnalyzing) return;
      const platform = $('#campaign-platform').value;
      const objective = $('#campaign-objective').value;
      if (!platform || !objective) { showToast('Select platform and objective', 'error'); return; }

      isAnalyzing = true;
      analyzeHistory = [];
      orbSpeed = 3;
      setOrbState('analyzing');
      aiStatusPanel.style.display = 'none';
      reportOutput.style.display = 'none';
      reportOutput.innerHTML = '';
      loadingState.style.display = 'flex';
      newAnalysisBtn.style.display = 'none';
      followupChat.style.display = 'none';
      followupMessages.innerHTML = '';

      const msg = buildAnalyzeMessage();
      analyzeHistory.push({ role: 'user', content: msg });
      callAgent(msg, analyzeHistory, false);
    });
  }

  function buildAnalyzeMessage() {
    let m = `Platform: ${$('#campaign-platform').value}\nObjective: ${$('#campaign-objective').value}\n`;
    const fields = [
      ['campaign-audience', 'Target Audience'],
      ['campaign-budget', 'Budget'],
      ['campaign-creatives', 'Creatives'],
      ['campaign-landing', 'Landing Page/Funnel'],
    ];
    fields.forEach(([id, label]) => { const v = $(`#${id}`)?.value; if (v) m += `${label}: ${v}\n`; });
    m += `\nCurrent Metrics:\n`;
    const metrics = [['metric-ctr','CTR'],['metric-cpc','CPC'],['metric-cpl','CPL'],['metric-cvr','Conversion Rate'],['metric-roas','ROAS']];
    metrics.forEach(([id, label]) => { const v = $(`#${id}`)?.value; if (v) m += `- ${label}: ${v}${id === 'metric-ctr' || id === 'metric-cvr' ? '%' : ''}\n`; });
    m += `\nProvide:\n1. Key Insights\n2. Problems Identified\n3. Recommended Actions (Step-by-Step)\n4. Tests to Run\n5. Scaling Plan (if applicable)`;
    return m;
  }

  // ─── Generate Ads ─────────────────────────────────────────
  if (adgenForm) {
    adgenForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (isAnalyzing) return;
      const product = $('#adgen-product')?.value;
      const platform = $('#adgen-platform')?.value;
      if (!product || !platform) { showToast('Fill in product and platform', 'error'); return; }

      isAnalyzing = true;
      adgenHistory = [];
      orbSpeed = 3;
      setOrbState('analyzing');
      adgenEmpty.style.display = 'none';
      adgenLoading.style.display = 'flex';
      adgenPreviews.style.display = 'none';
      adgenPreviews.innerHTML = '';

      const tone = $('#adgen-tone')?.value;
      const audience = $('#adgen-audience')?.value;
      const format = $('#adgen-format')?.value;
      let msg = `Generate ad copy:\nProduct: ${product}\nPlatform: ${platform}\nAudience: ${audience || 'General'}\nTone: ${tone}\nFormat: ${format}\n\nProvide 3 variations with Hook, Primary text, Headline, CTA.`;
      if (format === 'Video script') msg += `\n\nFor video: Hook (0-3s), Problem (3-8s), Solution (8-20s), Social proof (20-25s), CTA (25-30s).`;
      adgenHistory.push({ role: 'user', content: msg });
      callAgent(msg, adgenHistory, true);
    });
  }

  // ─── API Call ─────────────────────────────────────────────
  async function callAgent(message, history, isAdGen) {
    try {
      setOrbState('streaming');
      const res = await fetch('/api/marketing-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history, type: isAdGen ? 'adgen' : 'analyze' })
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Request failed'); }
      const data = await res.json();
      history.push({ role: 'assistant', content: data.reply });

      if (isAdGen) {
        adgenLoading.style.display = 'none';
        adgenPreviews.style.display = 'flex';
        renderAdPreviews(data.reply, $('#adgen-platform')?.value);
      } else {
        loadingState.style.display = 'none';
        reportOutput.style.display = 'flex';
        reportOutput.innerHTML = '';
        renderReport(data.reply);
        renderVisualizations(data.reply);
        saveRecentAnalysis($('#campaign-audience')?.value || 'Campaign');
        followupChat.style.display = 'flex';
        newAnalysisBtn.style.display = 'flex';
      }

      orbSpeed = 1;
      setOrbState('done');
      showToast('Analysis complete', 'success');
    } catch (err) {
      showToast(err.message, 'error');
      orbSpeed = 1;
      setOrbState('idle');
      loadingState.style.display = 'none';
      adgenLoading.style.display = 'none';
      if (!isAdGen) aiStatusPanel.style.display = 'flex';
      else adgenEmpty.style.display = 'flex';
    } finally {
      isAnalyzing = false;
    }
  }

  // ─── UI Helpers ───────────────────────────────────────────
  function setOrbState(state) {
    statusOrb.className = 'status-orb';
    if (state === 'analyzing') { statusOrb.classList.add('analyzing'); statusText.textContent = 'Analyzing'; analyzeBtn?.classList.add('loading'); generateBtn?.classList.add('loading'); }
    else if (state === 'streaming') { statusOrb.classList.add('streaming'); statusText.textContent = 'Streaming'; }
    else if (state === 'done') { statusText.textContent = 'Complete'; analyzeBtn?.classList.remove('loading'); generateBtn?.classList.remove('loading'); }
    else { statusText.textContent = 'Ready'; analyzeBtn?.classList.remove('loading'); generateBtn?.classList.remove('loading'); }
  }

  // ─── Report Rendering ─────────────────────────────────────
  function renderReport(text) {
    const sections = parseSections(text);
    sections.forEach((s, i) => {
      const el = document.createElement('div');
      el.className = 'report-section';
      el.style.animationDelay = `${i * 0.08}s`;
      el.innerHTML = `
        <div class="report-section-header" onclick="this.parentElement.classList.toggle('collapsed')">
          <div class="report-section-label" data-color="${s.color}"><span>${s.icon}</span> ${s.title}</div>
          <div class="report-section-actions">
            <button class="copy-btn" onclick="event.stopPropagation(); copySection(this, \`${escAttr(s.content)}\`)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</button>
            <button class="toggle-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></button>
          </div>
        </div>
        <div class="report-section-body">${mdToHtml(s.content)}</div>`;
      reportOutput.appendChild(el);
    });
  }

  function parseSections(text) {
    const defs = [
      { regex: /(?:^|\n)(?:#{1,3}\s*)?(?:🔎|key\s*insights?)\s*:?\s*\n/i, icon: '🔎', title: 'Key Insights', color: 'cyan' },
      { regex: /(?:^|\n)(?:#{1,3}\s*)?(?:⚠️|problems?\s*identified?)\s*:?\s*\n/i, icon: '⚠️', title: 'Problems Identified', color: 'amber' },
      { regex: /(?:^|\n)(?:#{1,3}\s*)?(?:✅|recommended\s*actions?)\s*:?\s*\n/i, icon: '✅', title: 'Recommended Actions', color: 'green' },
      { regex: /(?:^|\n)(?:#{1,3}\s*)?(?:🧪|tests?\s*to\s*run)\s*:?\s*\n/i, icon: '🧪', title: 'Tests to Run', color: 'purple' },
      { regex: /(?:^|\n)(?:#{1,3}\s*)?(?:🚀|scaling\s*plan)\s*:?\s*\n/i, icon: '🚀', title: 'Scaling Plan', color: 'gradient' },
    ];
    const sections = [];
    const parts = text.split(/\n(?=\d+\.\s)/);
    if (parts.length > 1) {
      parts.forEach(part => {
        const t = part.trim(); if (!t) return;
        const match = defs.find(d => d.regex.test(t));
        sections.push({
          icon: match?.icon || '📄',
          title: match?.title || t.substring(0, 35).replace(/[:#\n]/g, '').trim() || `Section ${sections.length + 1}`,
          color: match?.color || ['cyan', 'amber', 'green', 'purple', 'gradient'][sections.length % 5],
          content: t.replace(/^\d+\.\s*/, '').trim()
        });
      });
    } else {
      const headerParts = text.split(/\n(?=#{1,3}\s)/);
      headerParts.forEach(part => {
        const t = part.trim(); if (!t) return;
        const match = defs.find(d => d.regex.test(t));
        sections.push({
          icon: match?.icon || '📄',
          title: match?.title || t.match(/^#{1,3}\s*(.+)/)?.[1]?.trim() || `Section ${sections.length + 1}`,
          color: match?.color || 'cyan',
          content: t.replace(/^#{1,3}\s*.+\n?/, '').trim() || t
        });
      });
    }
    if (sections.length === 0 && text.trim()) sections.push({ icon: '🔎', title: 'Report', color: 'cyan', content: text.trim() });
    return sections;
  }

  function mdToHtml(t) {
    return t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>').replace(/\n- (.+)/g, '\n<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>').replace(/<\/ul>\s*<ul>/g, '')
      .replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  }

  function escAttr(s) { return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\n/g, '\\n'); }

  // ─── Visualizations ───────────────────────────────────────
  function renderVisualizations(text) {
    const ctr = parseFloat($('#metric-ctr')?.value) || 2;
    const cpl = parseFloat($('#metric-cpl')?.value) || 35;
    const cvr = parseFloat($('#metric-cvr')?.value) || 3;

    // Funnel
    const impressions = 10000;
    const clicks = Math.round(impressions * ctr / 100);
    const leads = Math.round(clicks * cvr / 100);
    const conversions = Math.round(leads * 0.3);
    const funnelHtml = `
      <div class="viz-card"><div class="viz-title">Campaign Funnel</div>
      <div class="funnel-chart">
        <div class="funnel-step"><span class="funnel-label">Impressions</span><div class="funnel-bar-container"><div class="funnel-bar" style="width:100%">${impressions.toLocaleString()}</div></div><span class="funnel-drop"></span></div>
        <div class="funnel-step"><span class="funnel-label">Clicks</span><div class="funnel-bar-container"><div class="funnel-bar" style="width:${clicks/impressions*100}%">${clicks.toLocaleString()}</div></div><span class="funnel-drop">-${((1-clicks/impressions)*100).toFixed(0)}%</span></div>
        <div class="funnel-step"><span class="funnel-label">Leads</span><div class="funnel-bar-container"><div class="funnel-bar" style="width:${leads/clicks*100}%">${leads.toLocaleString()}</div></div><span class="funnel-drop">-${((1-leads/clicks)*100).toFixed(0)}%</span></div>
        <div class="funnel-step"><span class="funnel-label">Conversions</span><div class="funnel-bar-container"><div class="funnel-bar" style="width:${conversions/leads*100}%">${conversions.toLocaleString()}</div></div><span class="funnel-drop">-${((1-conversions/leads)*100).toFixed(0)}%</span></div>
      </div></div>`;

    // Benchmark Chart
    const benchHtml = `
      <div class="viz-card"><div class="viz-title">Benchmark Comparison</div>
      <div class="benchmark-chart">
        <div class="bench-row"><span class="bench-row-label">CPL</span><div class="bench-bars"><div class="bench-bar-row"><span class="bench-bar-label">You</span><div class="bench-bar-track"><div class="bench-bar-fill user" style="width:${Math.min(100, cpl/60*100)}%"></div></div><span class="bench-bar-val">${cpl}</span></div><div class="bench-bar-row"><span class="bench-bar-label">Avg</span><div class="bench-bar-track"><div class="bench-bar-fill avg" style="width:${36/60*100}%"></div></div><span class="bench-bar-val">36</span></div></div></div>
        <div class="bench-row"><span class="bench-row-label">CTR</span><div class="bench-bars"><div class="bench-bar-row"><span class="bench-bar-label">You</span><div class="bench-bar-track"><div class="bench-bar-fill user" style="width:${Math.min(100, ctr/5*100)}%"></div></div><span class="bench-bar-val">${ctr}%</span></div><div class="bench-bar-row"><span class="bench-bar-label">Avg</span><div class="bench-bar-track"><div class="bench-bar-fill avg" style="width:${2.2/5*100}%"></div></div><span class="bench-bar-val">2.2%</span></div></div></div>
        <div class="bench-row"><span class="bench-row-label">Conv Rate</span><div class="bench-bars"><div class="bench-bar-row"><span class="bench-bar-label">You</span><div class="bench-bar-track"><div class="bench-bar-fill user" style="width:${Math.min(100, cvr/8*100)}%"></div></div><span class="bench-bar-val">${cvr}%</span></div><div class="bench-bar-row"><span class="bench-bar-label">Avg</span><div class="bench-bar-track"><div class="bench-bar-fill avg" style="width:${3.5/8*100}%"></div></div><span class="bench-bar-val">3.5%</span></div></div></div>
      </div></div>`;

    // Timeline
    const timelineHtml = `
      <div class="viz-card"><div class="viz-title">Priority Action Timeline</div>
      <div class="timeline-chart">
        <div class="timeline-col"><div class="timeline-header now">Do NOW (24h)</div><div class="timeline-items"><div class="timeline-item" style="color:var(--text-muted)">—</div></div></div>
        <div class="timeline-col"><div class="timeline-header week">This Week (3-7 days)</div><div class="timeline-items"><div class="timeline-item" style="color:var(--text-muted)">—</div></div></div>
        <div class="timeline-col"><div class="timeline-header month">This Month</div><div class="timeline-items"><div class="timeline-item" style="color:var(--text-muted)">—</div></div></div>
      </div></div>`;

    reportOutput.insertAdjacentHTML('beforeend', funnelHtml + benchHtml + timelineHtml);
  }

  // ─── Ad Previews ──────────────────────────────────────────
  function renderAdPreviews(text, platform) {
    const variations = parseAdVariations(text);
    adgenPreviews.innerHTML = '';
    variations.forEach((v, i) => {
      const card = document.createElement('div');
      card.className = 'ad-preview-card';
      if (platform === 'Google') {
        card.innerHTML = `
          <div class="ad-preview-header"><span class="ad-preview-label">Variation ${i + 1}</span><div class="ad-preview-actions"><button class="copy-btn" onclick="copySection(this, \`${escAttr(v.hook + '\\n' + v.body)}\`)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</button></div></div>
          <div class="ad-preview-body"><div class="google-ad-mock">
            <div class="google-ad-display-url">www.yoursite.com</div>
            <div class="google-ad-title">${v.headline || v.hook}</div>
            <div class="google-ad-desc">${v.body}</div>
          </div></div>`;
      } else {
        card.innerHTML = `
          <div class="ad-preview-header"><span class="ad-preview-label">Variation ${i + 1}</span><div class="ad-preview-actions"><button class="copy-btn" onclick="copySection(this, \`${escAttr(v.hook + '\\n' + v.body)}\`)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</button></div></div>
          <div class="ad-preview-body"><div class="meta-ad-mock">
            <div class="meta-ad-header"><div class="meta-ad-avatar">MA</div><div><div class="meta-ad-page">Your Brand</div><div class="meta-ad-sponsored">Sponsored</div></div></div>
            <div class="meta-ad-image"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
            <div class="meta-ad-text">${v.body}</div>
            <div class="meta-ad-headline">${v.headline}</div>
            <div class="meta-ad-link">yourbrand.com</div>
            <div class="meta-ad-cta">${v.cta || 'Learn More'}</div>
            <div class="meta-ad-actions"><span class="meta-ad-action">👍 Like</span><span class="meta-ad-action">💬 Comment</span><span class="meta-ad-action">↗ Share</span></div>
          </div></div>`;
      }
      adgenPreviews.appendChild(card);
    });
  }

  function parseAdVariations(text) {
    const variations = [];
    const parts = text.split(/(?=variation\s*\d|#{1,3}\s*variation|\*\*variation)/i);
    parts.forEach(part => {
      const hook = part.match(/(?:hook|first\s*line)[:\s]*[""]?(.+?)[""]?\n/im)?.[1] || part.substring(0, 80);
      const body = part.match(/(?:primary\s*text|body|main\s*text)[:\s]*[""]?(.+?)[""]?\n/im)?.[1] || part.substring(0, 150);
      const headline = part.match(/(?:headline)[:\s]*[""]?(.+?)[""]?\n/im)?.[1] || 'Your Headline Here';
      const cta = part.match(/(?:cta|call\s*to\s*action)[:\s]*[""]?(.+?)[""]?\n/im)?.[1] || 'Learn More';
      if (hook || body) variations.push({ hook, body, headline, cta });
    });
    if (variations.length === 0) variations.push({ hook: text.substring(0, 80), body: text.substring(0, 200), headline: 'Your Headline', cta: 'Learn More' });
    return variations;
  }

  // ─── Recent Analyses ──────────────────────────────────────
  function saveRecentAnalysis(name) {
    const score = parseInt($('#health-value')?.textContent) || 50;
    recentAnalyses.unshift({ name: name.substring(0, 30), score, time: Date.now() });
    if (recentAnalyses.length > 5) recentAnalyses.pop();
    localStorage.setItem('recentAnalyses', JSON.stringify(recentAnalyses));
    renderRecent();
  }

  function renderRecent() {
    const list = $('#recent-list');
    if (!list) return;
    list.innerHTML = recentAnalyses.slice(0, 3).map(r => {
      const dot = r.score >= 70 ? 'good' : r.score >= 40 ? 'warn' : 'bad';
      return `<div class="recent-item"><span class="recent-dot ${dot}"></span><span class="recent-name">${r.name}</span></div>`;
    }).join('');
  }

  // ─── Follow-up Chat ───────────────────────────────────────
  if (followupSend) {
    followupSend.addEventListener('click', () => sendFollowUp());
    followupInput?.addEventListener('keydown', e => { if (e.key === 'Enter') sendFollowUp(); });
  }

  async function sendFollowUp() {
    const q = followupInput?.value?.trim();
    if (!q || isAnalyzing) return;
    followupInput.value = '';

    followupMessages.insertAdjacentHTML('beforeend', `<div class="followup-msg user">${q}</div>`);
    followupMessages.scrollTop = followupMessages.scrollHeight;

    analyzeHistory.push({ role: 'user', content: q });

    try {
      const res = await fetch('/api/marketing-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, history: analyzeHistory, type: 'analyze' })
      });
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      analyzeHistory.push({ role: 'assistant', content: data.reply });
      followupMessages.insertAdjacentHTML('beforeend', `<div class="followup-msg ai">${mdToHtml(data.reply).substring(0, 500)}</div>`);
      followupMessages.scrollTop = followupMessages.scrollHeight;
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ─── New Analysis ─────────────────────────────────────────
  if (newAnalysisBtn) {
    newAnalysisBtn.addEventListener('click', () => {
      analyzeHistory = [];
      aiStatusPanel.style.display = 'flex';
      reportOutput.style.display = 'none';
      reportOutput.innerHTML = '';
      loadingState.style.display = 'none';
      newAnalysisBtn.style.display = 'none';
      followupChat.style.display = 'none';
      followupMessages.innerHTML = '';
      campaignForm.reset();
      setOrbState('idle');
      orbSpeed = 1;
      ['ctr', 'cpc', 'cpl', 'cvr', 'roas'].forEach(k => { const el = $(`#bench-${k}`); if (el) el.innerHTML = ''; });
      updateHealthScore();
    });
  }

  // ─── Global Functions ─────────────────────────────────────
  window.copySection = function (btn, text) {
    const decoded = text.replace(/\\n/g, '\n').replace(/\\`/g, '`');
    navigator.clipboard.writeText(decoded).then(() => {
      btn.classList.add('copied');
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied`;
      setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`; }, 2000);
    });
  };

  window.showToast = function (msg, type = 'info') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  };

  // ─── Mode Switching ───────────────────────────────────────
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      modeContents.forEach(c => c.classList.remove('active'));
      const target = document.getElementById('content-' + mode);
      if (target) target.classList.add('active');
    });
  });

  // ─── Generate Button (type=button → trigger form submit) ──
  if (generateBtn) {
    generateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (adgenForm) adgenForm.requestSubmit();
    });
  }

  // ─── Init ─────────────────────────────────────────────────
  initOrb();
  renderRecent();
  updateHealthScore();

  // GSAP
  if (typeof gsap !== 'undefined') {
    gsap.from('.mode-btn', { y: 20, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' });
    gsap.from('.input-panel', { x: -30, opacity: 0, duration: 0.6, ease: 'power2.out', delay: 0.2 });
    gsap.from('.output-panel', { x: 30, opacity: 0, duration: 0.6, ease: 'power2.out', delay: 0.3 });
    gsap.from('.quick-chip', { y: 10, opacity: 0, duration: 0.3, stagger: 0.04, ease: 'power2.out', delay: 0.4 });
  }

})();
