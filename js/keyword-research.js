/* =========================================================
   MARKETA Intelligence — Keyword Research Intelligence v1
   ========================================================= */
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ─── State ──────────────────────────────────────────────
  let currentData = null;
  let currentSort = { key: 'priority', dir: 'desc' };
  let recentSearches = JSON.parse(localStorage.getItem('krRecent') || '[]');

  // ─── DOM ────────────────────────────────────────────────
  const seedInput = $('#kr-seed-keyword');
  const analyzeBtn = $('#kr-analyze-btn');
  const clearBtn = $('#kr-clear');
  const tabs = $$('.kr-tab');
  const tabContents = $$('.kr-tab-content');
  const statusOrb = $('#status-orb');
  const statusText = $('#status-text');

  // ─── Sidebar Recent ─────────────────────────────────────
  function renderRecent() {
    const list = $('#recent-list');
    if (!list) return;
    list.innerHTML = recentSearches.slice(0, 8).map(s => `
      <div class="recent-item" data-kw="${s.keyword}">
        <div class="recent-dot" style="background:var(--cyan)"></div>
        <span class="recent-name">${s.keyword}</span>
      </div>
    `).join('');
    list.querySelectorAll('.recent-item').forEach(item => {
      item.addEventListener('click', () => {
        seedInput.value = item.dataset.kw;
        analyzeBtn.click();
      });
    });
  }
  function saveRecent(keyword) {
    recentSearches = recentSearches.filter(s => s.keyword !== keyword);
    recentSearches.unshift({ keyword, time: Date.now() });
    if (recentSearches.length > 20) recentSearches = recentSearches.slice(0, 20);
    localStorage.setItem('krRecent', JSON.stringify(recentSearches));
    renderRecent();
  }

  // ─── Tab Switching ──────────────────────────────────────
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const target = $(`#tab-${tab.dataset.tab}`);
      if (target) target.classList.add('active');
    });
  });

  // ─── Status Orb ─────────────────────────────────────────
  function setStatus(state) {
    statusOrb.className = 'status-orb';
    if (state === 'loading') { statusOrb.classList.add('analyzing'); statusText.textContent = 'Analyzing'; analyzeBtn?.classList.add('loading'); }
    else if (state === 'done') { statusText.textContent = 'Complete'; analyzeBtn?.classList.remove('loading'); }
    else { statusText.textContent = 'Ready'; analyzeBtn?.classList.remove('loading'); }
  }

  // ─── Main Analyze ───────────────────────────────────────
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', async () => {
      const keyword = seedInput.value.trim();
      if (!keyword) { showToast('Enter a keyword first', 'error'); return; }

      const industry = $('#kr-industry')?.value || '';
      const location = $('#kr-location')?.value || '';
      const goal = $('#kr-goal')?.value || 'leads';
      const platform = $('#kr-platform')?.value || 'all';

      setStatus('loading');
      showLoading('explorer');

      try {
        const res = await fetch('/api/keyword-explorer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword, industry, location, goal, platform })
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Request failed'); }
        const data = await res.json();
        currentData = data;
        renderExplorerResults(data);
        saveRecent(keyword);

        // Auto-load trends too
        loadTrends(keyword, data.keywords);
        // Auto-load strategy
        loadStrategy(keyword, data.keywords, industry, location, goal, platform);

        setStatus('done');
        showToast(`Found ${data.keywords?.length || 0} keywords`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
        setStatus('idle');
        hideLoading('explorer');
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      seedInput.value = '';
      seedInput.focus();
    });
  }

  // ─── Explorer Results ───────────────────────────────────
  function renderExplorerResults(data) {
    hideLoading('explorer');
    $('#explorer-empty').style.display = 'none';
    $('#explorer-results').style.display = 'flex';

    const keywords = data.keywords || [];
    renderKeywordTable(keywords);
    renderKeywordCloud(keywords);
    renderDonutChart(keywords);
    renderSummaryStats(keywords);
    $('#kr-total-count').textContent = keywords.length;

    // Animate in
    if (typeof gsap !== 'undefined') {
      gsap.from('#explorer-results > *', { y: 20, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' });
    }
  }

  function renderKeywordTable(keywords) {
    const tbody = $('#kr-keyword-tbody');
    if (!tbody) return;

    const sorted = sortKeywords(keywords, currentSort.key, currentSort.dir);
    tbody.innerHTML = sorted.map((kw, i) => {
      const intent = kw.intent || 'Informational';
      const diff = (kw.difficulty || 'Medium').toLowerCase();
      const funnel = (kw.funnel || 'TOFU').toLowerCase();
      const priority = kw.priority || 5;
      const pClass = priority >= 7 ? 'high' : priority >= 4 ? 'medium' : 'low';

      return `<tr class="kr-tr" style="animation-delay:${i * 0.02}s">
        <td class="kr-td" style="font-weight:600;color:var(--text-primary)">${kw.keyword}</td>
        <td class="kr-td"><span class="kr-intent-badge ${intent.toLowerCase()}">${intent}</span></td>
        <td class="kr-td"><span class="kr-diff-bar"><span class="kr-diff-fill ${diff}" style="width:${diff === 'low' ? '33' : diff === 'medium' ? '66' : '100'}%"></span></span> ${kw.difficulty}</td>
        <td class="kr-td"><span class="kr-funnel-badge ${funnel}">${kw.funnel}</span></td>
        <td class="kr-td"><span class="kr-priority ${pClass}">${priority}</span></td>
      </tr>`;
    }).join('');
  }

  function sortKeywords(keywords, key, dir) {
    return [...keywords].sort((a, b) => {
      let va = a[key], vb = b[key];
      if (key === 'priority') { va = va || 0; vb = vb || 0; }
      if (key === 'keyword') { va = (va || '').toLowerCase(); vb = (vb || '').toLowerCase(); }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Table sort
  $$('.kr-th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (currentSort.key === key) currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
      else { currentSort.key = key; currentSort.dir = 'desc'; }
      if (currentData?.keywords) renderKeywordTable(currentData.keywords);
    });
  });

  // ─── Keyword Cloud (Canvas) ─────────────────────────────
  function renderKeywordCloud(keywords) {
    const canvas = $('#kr-cloud-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width - 40;
    canvas.height = 300;

    const maxPriority = Math.max(...keywords.map(k => k.priority || 1), 1);
    const intentColors = {
      commercial: '#22d3ee', informational: '#f59e0b',
      transactional: '#10b981', navigational: '#8b5cf6'
    };

    const words = keywords.slice(0, 40).map((kw, i) => {
      const size = 10 + ((kw.priority || 5) / maxPriority) * 28;
      return {
        text: kw.keyword, x: Math.random() * (canvas.width - 100) + 50,
        y: Math.random() * (canvas.height - 40) + 20,
        size, color: intentColors[(kw.intent || 'informational').toLowerCase()] || '#94a3b8',
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        alpha: 0.6 + (kw.priority || 5) / maxPriority * 0.4
      };
    });

    function drawCloud() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      words.forEach(w => {
        w.x += w.vx; w.y += w.vy;
        if (w.x < 10 || w.x > canvas.width - 80) w.vx *= -1;
        if (w.y < 10 || w.y > canvas.height - 10) w.vy *= -1;
        ctx.globalAlpha = w.alpha;
        ctx.font = `600 ${w.size}px Inter, sans-serif`;
        ctx.fillStyle = w.color;
        ctx.fillText(w.text, w.x, w.y);
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(drawCloud);
    }
    drawCloud();
  }

  // ─── Donut Chart (Canvas) ───────────────────────────────
  function renderDonutChart(keywords) {
    const canvas = $('#kr-donut-canvas');
    const legend = $('#kr-donut-legend');
    if (!canvas || !legend) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 250; canvas.height = 250;

    const intentCounts = {};
    keywords.forEach(kw => {
      const intent = kw.intent || 'Informational';
      intentCounts[intent] = (intentCounts[intent] || 0) + 1;
    });

    const colors = { Commercial: '#22d3ee', Informational: '#f59e0b', Transactional: '#10b981', Navigational: '#8b5cf6' };
    const entries = Object.entries(intentCounts);
    const total = keywords.length || 1;
    const cx = 125, cy = 125, r = 90, inner = 55;
    let startAngle = -Math.PI / 2;

    entries.forEach(([intent, count]) => {
      const slice = (count / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, startAngle + slice);
      ctx.arc(cx, cy, inner, startAngle + slice, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = colors[intent] || '#94a3b8';
      ctx.fill();
      startAngle += slice;
    });

    // Center text
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '700 28px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(total, cx, cy + 4);
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('keywords', cx, cy + 20);

    // Legend
    legend.innerHTML = entries.map(([intent, count]) => `
      <div class="kr-legend-item"><span class="kr-legend-dot" style="background:${colors[intent]}"></span>${intent} (${Math.round(count / total * 100)}%)</div>
    `).join('');
  }

  // ─── Summary Stats ──────────────────────────────────────
  function renderSummaryStats(keywords) {
    const el = $('#kr-summary-stats');
    if (!el) return;

    const intents = {};
    keywords.forEach(kw => { intents[kw.intent || 'Informational'] = (intents[kw.intent || 'Informational'] || 0) + 1; });
    const topIntent = Object.entries(intents).sort((a, b) => b[1] - a[1])[0];
    const avgPriority = keywords.length ? (keywords.reduce((s, k) => s + (k.priority || 0), 0) / keywords.length).toFixed(1) : 0;
    const difficulties = { Low: 0, Medium: 0, High: 0 };
    keywords.forEach(kw => { difficulties[kw.difficulty || 'Medium']++; });
    const topDiff = Object.entries(difficulties).sort((a, b) => b[1] - a[1])[0];

    el.innerHTML = `
      <div class="kr-stat-row"><span class="kr-stat-label">Total Keywords</span><span class="kr-stat-value">${keywords.length}</span></div>
      <div class="kr-stat-row"><span class="kr-stat-label">Top Intent</span><span class="kr-stat-value" style="color:var(--cyan)">${topIntent?.[0] || '—'}</span></div>
      <div class="kr-stat-row"><span class="kr-stat-label">Avg Priority</span><span class="kr-stat-value">${avgPriority}</span></div>
      <div class="kr-stat-row"><span class="kr-stat-label">Top Difficulty</span><span class="kr-stat-value">${topDiff?.[0] || '—'}</span></div>
      <div class="kr-stat-row"><span class="kr-stat-label">BOFU Keywords</span><span class="kr-stat-value" style="color:var(--emerald)">${keywords.filter(k => k.funnel === 'BOFU').length}</span></div>
    `;
  }

  // ─── Trends ─────────────────────────────────────────────
  async function loadTrends(keyword, keywords) {
    showLoading('trends');
    $('#trends-empty').style.display = 'none';
    try {
      const related = keywords?.slice(0, 3).map(k => k.keyword) || [];
      const res = await fetch('/api/trend-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, related })
      });
      if (!res.ok) throw new Error('Trend data unavailable');
      const data = await res.json();
      hideLoading('trends');
      $('#trends-results').style.display = 'flex';
      renderTrendChart(data);
      renderRegionalBars(data);
      renderRisingQueries(data);
      if (data.seasonality) renderSeasonality(data.seasonality);
    } catch (err) {
      hideLoading('trends');
      $('#trends-empty').style.display = 'flex';
    }
  }

  function renderTrendChart(data) {
    const canvas = $('#kr-trend-canvas');
    if (!canvas || !data.trendData) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width - 40;
    canvas.height = 280;

    const series = data.trendData;
    const colors = ['#22d3ee', '#f59e0b', '#10b981', '#8b5cf6'];
    const allVals = series.flatMap(s => s.data || []);
    const maxVal = Math.max(...allVals, 1);

    const padL = 40, padR = 20, padT = 20, padB = 30;
    const w = canvas.width - padL - padR;
    const h = canvas.height - padT - padB;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (h / 4) * i;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + w, y); ctx.stroke();
      ctx.fillStyle = '#475569'; ctx.font = '10px Inter'; ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal - (maxVal / 4) * i), padL - 8, y + 4);
    }

    // Lines
    series.forEach((s, si) => {
      const d = s.data || [];
      const color = colors[si % colors.length];
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      d.forEach((val, i) => {
        const x = padL + (i / Math.max(d.length - 1, 1)) * w;
        const y = padT + h - (val / maxVal) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Glow
      ctx.strokeStyle = color + '40';
      ctx.lineWidth = 6;
      ctx.beginPath();
      d.forEach((val, i) => {
        const x = padL + (i / Math.max(d.length - 1, 1)) * w;
        const y = padT + h - (val / maxVal) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    // Legend
    const legendY = canvas.height - 8;
    series.forEach((s, si) => {
      const lx = padL + si * 120;
      ctx.fillStyle = colors[si % colors.length];
      ctx.fillRect(lx, legendY - 4, 8, 8);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter';
      ctx.textAlign = 'left';
      ctx.fillText(s.name || '', lx + 12, legendY + 4);
    });
  }

  function renderRegionalBars(data) {
    const el = $('#kr-regional-bars');
    if (!el || !data.regions) return;
    const max = Math.max(...data.regions.map(r => r.value || 0), 1);
    el.innerHTML = data.regions.map(r => `
      <div class="kr-reg-row">
        <span class="kr-reg-label">${r.name}</span>
        <div class="kr-reg-track"><div class="kr-reg-fill" style="width:${(r.value / max) * 100}%">${r.value}%</div></div>
      </div>
    `).join('');
  }

  function renderRisingQueries(data) {
    const el = $('#kr-rising-queries');
    if (!el || !data.rising) return;
    el.innerHTML = data.rising.map(q => `
      <div class="kr-rising-chip" data-kw="${q.text}">
        <span>${q.text}</span>
        <span class="kr-trend-arrow ${q.change < 0 ? 'down' : ''}">${q.change > 0 ? '↑' : '↓'}${Math.abs(q.change)}%</span>
      </div>
    `).join('');
    el.querySelectorAll('.kr-rising-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        seedInput.value = chip.dataset.kw;
        analyzeBtn.click();
      });
    });
  }

  function renderSeasonality(text) {
    const card = $('#kr-seasonality-card');
    const body = $('#kr-seasonality-text');
    if (!card || !body) return;
    card.style.display = 'block';
    body.innerHTML = text.split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join('');
  }

  // ─── AI Strategy ────────────────────────────────────────
  async function loadStrategy(keyword, keywords, industry, location, goal, platform) {
    showLoading('strategy');
    $('#strategy-empty').style.display = 'none';
    try {
      const res = await fetch('/api/ai-keyword-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, keywords: keywords?.map(k => k.keyword) || [], industry, location, goal, platform })
      });
      if (!res.ok) throw new Error('Strategy generation failed');
      const data = await res.json();
      hideLoading('strategy');
      $('#strategy-results').style.display = 'flex';
      renderStrategyResults(data);
    } catch (err) {
      hideLoading('strategy');
      $('#strategy-empty').style.display = 'flex';
    }
  }

  function renderStrategyResults(data) {
    const el = $('#strategy-results');
    if (!el) return;
    const html = data.strategy || data.reply || '';
    const sections = html.split(/\n(?=#{1,3}\s|###|\*\*)/g).filter(s => s.trim());
    el.innerHTML = sections.map((s, i) => {
      const title = s.match(/^(?:#{1,3}\s*|###\s*|\*\*)(.+?)(?:\*\*|\n)/)?.[1]?.trim() || `Section ${i + 1}`;
      const body = s.replace(/^(?:#{1,3}\s*|###\s*|\*\*.+?\*\*\n?)/, '').trim();
      return `
        <div class="kr-strategy-section" style="animation-delay:${i * 0.1}s">
          <div class="kr-strategy-header" onclick="this.nextElementSibling.classList.toggle('collapsed')">
            <span class="kr-strategy-title">${title}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="kr-strategy-body">${formatStrategyBody(body)}</div>
        </div>`;
    }).join('');
  }

  function formatStrategyBody(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n- (.+)/g, '\n<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>').replace(/<\/ul>\s*<ul>/g, '')
      .replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  }

  // ─── Competitor ─────────────────────────────────────────
  const compAnalyzeBtn = $('#kr-comp-analyze');
  if (compAnalyzeBtn) {
    compAnalyzeBtn.addEventListener('click', async () => {
      const url = $('#kr-comp-url')?.value.trim();
      if (!url) { showToast('Enter a competitor URL', 'error'); return; }

      compAnalyzeBtn.classList.add('loading');
      $('#competitor-empty').style.display = 'none';
      showLoading('competitor');

      try {
        const res = await fetch('/api/competitor-keywords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Analysis failed'); }
        const data = await res.json();
        hideLoading('competitor');
        $('#competitor-results').style.display = 'flex';
        renderCompetitorResults(data);
        showToast('Competitor analysis complete', 'success');
      } catch (err) {
        showToast(err.message, 'error');
        hideLoading('competitor');
        $('#competitor-empty').style.display = 'flex';
      } finally {
        compAnalyzeBtn.classList.remove('loading');
      }
    });
  }

  function renderCompetitorResults(data) {
    const el = $('#competitor-results');
    if (!el) return;

    const sections = [];

    if (data.targetedKeywords?.length) {
      sections.push(`
        <div class="kr-comp-section">
          <div class="kr-comp-section-title" style="color:var(--amber)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>Keywords They Target</div>
          <div class="kr-cluster-keywords">${data.targetedKeywords.map(k => `<span class="kr-kw-tag" style="border-color:rgba(245,158,11,0.3);background:rgba(245,158,11,0.06)">${k}</span>`).join('')}</div>
        </div>`);
    }

    if (data.contentGaps?.length) {
      sections.push(`
        <div class="kr-comp-section">
          <div class="kr-comp-section-title" style="color:var(--emerald)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Content Gaps to Exploit</div>
          <div class="kr-cluster-keywords">${data.contentGaps.map(k => `<span class="kr-kw-tag" style="border-color:rgba(16,185,129,0.3);background:rgba(16,185,129,0.06)">${k}</span>`).join('')}</div>
        </div>`);
    }

    if (data.stealTraffic?.length) {
      sections.push(`
        <div class="kr-comp-section">
          <div class="kr-comp-section-title" style="color:var(--cyan)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>Steal Their Traffic</div>
          <div class="kr-cluster-keywords">${data.stealTraffic.map(k => `<span class="kr-kw-tag">${k}</span>`).join('')}</div>
        </div>`);
    }

    if (data.strategy) {
      sections.push(`
        <div class="kr-comp-section">
          <div class="kr-comp-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.27A7 7 0 0 1 14 23h-4a7 7 0 0 1-6.73-5H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg>AI Strategy Assessment</div>
          <div class="kr-insight-body">${data.strategy.split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join('')}</div>
        </div>`);
    }

    el.innerHTML = sections.join('');

    if (typeof gsap !== 'undefined') {
      gsap.from('#competitor-results .kr-comp-section', { y: 20, opacity: 0, duration: 0.4, stagger: 0.1, ease: 'power2.out' });
    }
  }

  // ─── Export ─────────────────────────────────────────────
  $('#kr-export-csv')?.addEventListener('click', () => {
    if (!currentData?.keywords?.length) return;
    const header = 'Keyword,Intent,Difficulty,Funnel,Priority\n';
    const rows = currentData.keywords.map(k => `"${k.keyword}","${k.intent}","${k.difficulty}","${k.funnel}",${k.priority}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `keywords-${Date.now()}.csv`; a.click();
    showToast('CSV exported', 'success');
  });

  $('#kr-copy-keywords')?.addEventListener('click', () => {
    if (!currentData?.keywords?.length) return;
    const text = currentData.keywords.map(k => k.keyword).join('\n');
    navigator.clipboard.writeText(text).then(() => showToast('Keywords copied', 'success'));
  });

  $('#kr-send-agent')?.addEventListener('click', () => {
    if (!currentData?.keywords?.length) return;
    const text = currentData.keywords.map(k => k.keyword).join(', ');
    window.location.href = `marketing-agent.html?context=${encodeURIComponent(text)}`;
  });

  // ─── Helpers ────────────────────────────────────────────
  function showLoading(tab) { const el = $(`#${tab}-loading`); if (el) el.style.display = 'flex'; }
  function hideLoading(tab) { const el = $(`#${tab}-loading`); if (el) el.style.display = 'none'; }

  function showToast(msg, type) {
    let c = $('#toast-container');
    if (!c) { c = document.createElement('div'); c.id = 'toast-container'; c.className = 'toast-container'; document.body.appendChild(c); }
    const colors = { success: '#10b981', error: '#f43f5e', info: '#6366f1' };
    const t = document.createElement('div');
    t.className = 'toast'; t.style.color = colors[type] || colors.info;
    t.innerHTML = `<span style="flex:1;font-size:0.875rem;color:#f1f5f9">${msg}</span><button onclick="this.parentElement.remove()" style="color:#475569;background:none;border:none;cursor:pointer;font-size:1rem">&times;</button>`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }

  // ─── Init ───────────────────────────────────────────────
  renderRecent();
  if (typeof gsap !== 'undefined') {
    gsap.from('.kr-input-bar', { y: -20, opacity: 0, duration: 0.5, ease: 'power2.out' });
    gsap.from('.kr-tab', { y: 10, opacity: 0, duration: 0.3, stagger: 0.08, ease: 'power2.out', delay: 0.2 });
  }

})();
