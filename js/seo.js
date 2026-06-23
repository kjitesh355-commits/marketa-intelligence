document.addEventListener('DOMContentLoaded', () => {
  const seoForm = document.getElementById('seo-form');
  const targetUrlInput = document.getElementById('target-url');
  const btnScan = document.getElementById('btn-scan');
  const loadingState = document.getElementById('loading-state');
  const resultsState = document.getElementById('results-state');
  const urlLabel = document.getElementById('assessment-url-label');

  let currentSeoData = null;
  let currentOnPageData = null;
  let currentMobileDesktopData = null;
  let aiChatHistory = [];

  seoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    let url = targetUrlInput.value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try { new URL(url); } catch { showToast('Please enter a valid website URL.', 'error'); return; }

    resultsState.style.display = 'none';
    loadingState.style.display = 'flex';
    btnScan.disabled = true;
    btnScan.innerHTML = '<svg class="scanner-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4"/></svg>Scanning...';
    aiChatHistory = [];
    hideAllNewSections();

    try {
      const [seoRes, onpageRes, mobileRes] = await Promise.allSettled([
        fetch('/api/check-seo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) }).then(r => r.json()),
        fetch('/api/seo-onpage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) }).then(r => r.json()),
        fetch('/api/seo-mobile-desktop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) }).then(r => r.json())
      ]);

      currentSeoData = seoRes.status === 'fulfilled' && seoRes.value.success ? seoRes.value : null;
      currentOnPageData = onpageRes.status === 'fulfilled' && onpageRes.value.success ? onpageRes.value : null;
      currentMobileDesktopData = mobileRes.status === 'fulfilled' && mobileRes.value.success ? mobileRes.value : null;

      if (!currentSeoData && !currentOnPageData && !currentMobileDesktopData) throw new Error('All scans failed. Please try again.');

      loadingState.style.display = 'none';
      resultsState.style.display = 'block';
      if (currentSeoData) {
        urlLabel.textContent = 'Real-user field experience and lab diagnostics for ' + currentSeoData.url;
        renderGauges(currentSeoData);
        renderScoreCards(currentSeoData);
      }
      if (currentOnPageData) renderOnPageAudit(currentOnPageData);
      if (currentMobileDesktopData) renderMobileDesktop(currentMobileDesktopData);
      renderCodeFixes(currentOnPageData);
      showNewSections();
      showToast('Audit complete! Website health verified.', 'success');
    } catch (error) {
      showToast(error.message || 'Error occurred while scanning.', 'error');
      loadingState.style.display = 'none';
    } finally {
      btnScan.disabled = false;
      btnScan.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>Analyze Website';
    }
  });

  function hideAllNewSections() {
    ['device-toggle-bar', 'score-explanation-cards', 'onpage-audit', 'roadmap-card', 'ai-analysis-card', 'code-fixes-card', 'export-bar'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  function showNewSections() {
    if (currentMobileDesktopData) { var el = document.getElementById('device-toggle-bar'); if (el) el.style.display = 'flex'; }
    if (currentSeoData) {
      var el = document.getElementById('score-explanation-cards'); if (el) el.style.display = 'grid';
      var cards = document.querySelectorAll('.seo-score-card');
      cards.forEach(function(c, i) { c.style.animationDelay = (i * 0.1) + 's'; });
    }
    if (currentOnPageData) { var el = document.getElementById('onpage-audit'); if (el) el.style.display = 'block'; }
    if (currentSeoData || currentOnPageData) { var el = document.getElementById('roadmap-card'); if (el) el.style.display = 'block'; }
    if (currentSeoData || currentOnPageData) { var el = document.getElementById('ai-analysis-card'); if (el) el.style.display = 'block'; }
    if (currentOnPageData) { var el = document.getElementById('code-fixes-card'); if (el) el.style.display = 'block'; }
    { var el = document.getElementById('export-bar'); if (el) el.style.display = 'flex'; }
    buildRoadmap();
    runAiAnalysis();
  }

  function renderGauges(data) {
    animateGauge('gauge-perf', 'val-perf', data.scores.performance);
    animateGauge('gauge-seo', 'val-seo', data.scores.seo);
    animateGauge('gauge-access', 'val-access', data.scores.accessibility);
    animateGauge('gauge-best', 'val-best', data.scores.bestPractices);
    updateVitalsBadge('val-lcp', 'badge-lcp', data.metrics.lcp.value, data.metrics.lcp.status);
    updateVitalsBadge('val-cls', 'badge-cls', data.metrics.cls.value, data.metrics.cls.status);
    updateVitalsBadge('val-inp', 'badge-inp', data.metrics.inp.value, data.metrics.inp.status);
  }

  function renderScoreCards(data) {
    const s = data.scores;
    setScoreCard('perf', s.performance, 'Performance', 'How fast your page loads and becomes interactive.');
    setScoreCard('seo', s.seo, 'SEO', 'How well search engines can find and understand your content.');
    setScoreCard('access', s.accessibility, 'Accessibility', 'How usable your site is for people with disabilities.');
    setScoreCard('best', s.bestPractices, 'Best Practices', 'Modern web development standards and security.');
  }

  function setScoreCard(key, value, label, desc) {
    var badge = document.getElementById('sc-badge-' + key);
    var verdict = document.getElementById('sc-verdict-' + key);
    var issues = document.getElementById('sc-issues-' + key);
    var quickwin = document.getElementById('sc-quickwin-' + key);
    var card = document.getElementById('score-card-' + key);

    var status, statusText, badgeClass;
    if (value >= 90) { status = 'good'; statusText = 'Excellent'; badgeClass = 'good'; }
    else if (value >= 50) { status = 'warning'; statusText = 'Needs Work'; badgeClass = 'warning'; }
    else { status = 'error'; statusText = 'Critical'; badgeClass = 'error'; }

    if (badge) { badge.textContent = statusText; badge.className = 'seo-sc-badge ' + badgeClass; }
    if (verdict) verdict.textContent = value + '/100 — ' + statusText;
    if (issues) issues.textContent = desc;
    if (quickwin) {
      if (value >= 90) quickwin.textContent = 'No quick wins needed.';
      else if (value >= 50) quickwin.textContent = 'Focus on medium-effort improvements.';
      else quickwin.textContent = 'Prioritize fixing critical issues first.';
    }
    if (card) card.style.borderTop = '3px solid var(--' + (status === 'good' ? 'emerald' : status === 'warning' ? 'amber' : 'rose') + ')';
  }

  function renderOnPageAudit(data) {
    var d = data.data;
    setAuditContent('audit-meta-tags', renderMetaTags(d.meta));
    setAuditContent('audit-headings', renderHeadings(d.headings));
    setAuditContent('audit-images', renderImages(d.images));
    setAuditContent('audit-links', renderLinks(d.links));
    setAuditContent('audit-canonical', renderCanonical(d));
    setAuditContent('audit-schema', renderSchema(d.structuredData));
    setAuditContent('audit-robots', renderRobots(d));
    setAuditContent('audit-opportunities', renderOpportunities(d));

    var sections = document.querySelectorAll('#onpage-audit .seo-audit-section');
    sections.forEach(function(section, i) {
      section.style.animationDelay = (i * 0.08) + 's';
    });
  }

  function setAuditContent(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function renderMetaTags(meta) {
    if (!meta) return '<p class="text-muted">No meta data found.</p>';
    let rows = '';
    rows += metaRow('Title', meta.title, meta.title ? meta.title.length + ' chars' : null, !meta.title);
    rows += metaRow('Description', meta.description, meta.description ? meta.description.length + ' chars' : null, !meta.description);
    if (meta.keywords) rows += metaRow('Keywords', meta.keywords);
    rows += metaRow('OG Title', meta.ogTitle, null, !meta.ogTitle);
    rows += metaRow('OG Description', meta.ogDescription, null, !meta.ogDescription);
    rows += metaRow('OG Image', meta.ogImage, null, !meta.ogImage);
    rows += metaRow('Twitter Card', meta.twitterCard, null, !meta.twitterCard);
    rows += metaRow('Viewport', meta.viewport, null, !meta.viewport);
    rows += metaRow('Canonical', meta.canonical, null, !meta.canonical);
    return '<table class="audit-table"><thead><tr><th>Tag</th><th>Value</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function metaRow(label, value, extra, missing) {
    if (missing) return '<tr><td>' + label + '</td><td class="missing">Missing!</td></tr>';
    if (!value) return '<tr><td>' + label + '</td><td class="text-muted">Not found</td></tr>';
    const extraStr = extra ? ' <span class="tag">' + extra + '</span>' : '';
    return '<tr><td>' + label + '</td><td>' + esc(value) + extraStr + '</td></tr>';
  }

  function renderHeadings(headings) {
    if (!headings) return '<p class="text-muted">No headings found.</p>';
    const levels = ['h1','h2','h3','h4','h5','h6'];
    let rows = levels.map(function(l) {
      var items = headings[l] || [];
      var cls = l === 'h1' && items.length === 0 ? 'missing' : (l === 'h1' && items.length > 1 ? 'warning' : '');
      var preview = items.slice(0, 5).map(function(i) { return esc(i); }).join(' | ');
      return '<tr><td>' + l.toUpperCase() + '</td><td class="' + cls + '">' + items.length + ' found</td><td>' + preview + '</td></tr>';
    }).join('');
    return '<table class="audit-table"><thead><tr><th>Level</th><th>Count</th><th>Content</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function renderImages(images) {
    if (!images || images.length === 0) return '<p class="text-muted">No images found.</p>';
    var withAlt = images.filter(function(i) { return i.alt && i.alt.trim(); });
    var withoutAlt = images.filter(function(i) { return !i.alt || !i.alt.trim(); });
    var html = '<p>' + images.length + ' images total. ' + withAlt.length + ' with alt text, <span class="' + (withoutAlt.length > 0 ? 'missing' : '') + '">' + withoutAlt.length + ' missing alt text</span>.</p>';
    if (withoutAlt.length > 0) {
      html += '<p class="text-muted">Images missing alt text:</p><ul>' + withoutAlt.slice(0, 10).map(function(i) { return '<li><code>' + esc(i.src) + '</code></li>'; }).join('') + '</ul>';
    }
    return html;
  }

  function renderLinks(links) {
    if (!links) return '<p class="text-muted">No links found.</p>';
    var html = '<p>' + links.internal.length + ' internal links, ' + links.external.length + ' external links.</p>';
    if (links.external.length > 0) {
      html += '<p class="text-muted">External links (first 10):</p><ul>' + links.external.slice(0, 10).map(function(l) { return '<li><a href="' + esc(l) + '" target="_blank" rel="noopener">' + esc(l) + '</a></li>'; }).join('') + '</ul>';
    }
    return html;
  }

  function renderCanonical(d) {
    var rows = '';
    rows += '<tr><td>Canonical Tag</td><td class="' + (d.meta && d.meta.canonical ? 'good' : 'warning') + '">' + (d.meta && d.meta.canonical ? esc(d.meta.canonical) : 'Missing') + '</td></tr>';
    rows += '<tr><td>Robots Meta</td><td>' + (d.meta && d.meta.robots ? esc(d.meta.robots) : 'Not set (defaults to index, follow)') + '</td></tr>';
    return '<table class="audit-table"><thead><tr><th>Check</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function renderSchema(sd) {
    if (!sd || sd.length === 0) return '<p class="text-muted">No structured data (Schema.org) found. Adding this helps Google understand your content.</p>';
    return sd.map(function(s) { return '<div class="code-block"><pre><code>' + esc(JSON.stringify(s, null, 2)) + '</code></pre></div>'; }).join('');
  }

  function renderRobots(d) {
    var rows = '';
    rows += '<tr><td>robots.txt</td><td class="' + (d.robotsTxt ? 'good' : 'warning') + '">' + (d.robotsTxt ? 'Found' : 'Not found') + '</td></tr>';
    rows += '<tr><td>sitemap.xml</td><td class="' + (d.sitemapXml ? 'good' : 'warning') + '">' + (d.sitemapXml ? 'Found' : 'Not found') + '</td></tr>';
    return '<table class="audit-table"><thead><tr><th>Check</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function renderOpportunities(d) {
    var items = [];
    var wc = d.wordCount || 0;
    if (wc < 300) items.push({ text: 'Content is thin (' + wc + ' words). Add more valuable content.', impact: 'High' });
    if (!d.meta || !d.meta.ogTitle) items.push({ text: 'Add Open Graph tags for better social media sharing.', impact: 'Medium' });
    if (!d.structuredData || d.structuredData.length === 0) items.push({ text: 'Add Schema.org structured data for rich snippets.', impact: 'High' });
    var missingAlt = (d.images || []).filter(function(i) { return !i.alt || !i.alt.trim(); });
    if (missingAlt.length > 0) items.push({ text: missingAlt.length + ' images missing alt text.', impact: 'Medium' });
    if (!d.robotsTxt) items.push({ text: 'Add a robots.txt file.', impact: 'Low' });
    if (!d.sitemapXml) items.push({ text: 'Add a sitemap.xml file.', impact: 'Medium' });
    if (items.length === 0) return '<p class="text-muted">No major opportunities found. Great work!</p>';
    var rows = items.map(function(item) {
      var cls = item.impact === 'High' ? 'missing' : item.impact === 'Medium' ? 'warning' : '';
      return '<tr><td>' + item.text + '</td><td class="' + cls + '">' + item.impact + '</td></tr>';
    }).join('');
    return '<table class="audit-table"><thead><tr><th>Opportunity</th><th>Impact</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function renderMobileDesktop(data) {
    var diffEl = document.getElementById('device-diff');
    if (!diffEl) return;
    var m = data.mobile;
    var d = data.desktop;
    if (!m && !d) { diffEl.textContent = 'Mobile/Desktop data unavailable'; return; }
    var mobileScore = m && m.scores ? m.scores.performance : 'N/A';
    var desktopScore = d && d.scores ? d.scores.performance : 'N/A';
    diffEl.textContent = 'Mobile: ' + mobileScore + ' | Desktop: ' + desktopScore;

    // Default to mobile view
    var activeDevice = 'mobile';
    var activeData = m || d;
    if (activeData) applyDeviceData(activeData);

    document.querySelectorAll('.seo-device-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.seo-device-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        activeDevice = btn.dataset.device;
        var deviceData = activeDevice === 'mobile' ? m : d;
        if (!deviceData) { showToast('No data for ' + activeDevice, 'error'); return; }
        applyDeviceData(deviceData);
        showToast('Viewing ' + activeDevice + ' scores', 'info');
      });
    });
  }

  function applyDeviceData(deviceData) {
    animateGauge('gauge-perf', 'val-perf', deviceData.scores.performance);
    animateGauge('gauge-seo', 'val-seo', deviceData.scores.seo);
    animateGauge('gauge-access', 'val-access', deviceData.scores.accessibility);
    animateGauge('gauge-best', 'val-best', deviceData.scores.bestPractices);
    updateVitalsBadge('val-lcp', 'badge-lcp', deviceData.metrics.lcp.value, deviceData.metrics.lcp.status);
    updateVitalsBadge('val-cls', 'badge-cls', deviceData.metrics.cls.value, deviceData.metrics.cls.status);
    updateVitalsBadge('val-inp', 'badge-inp', deviceData.metrics.inp.value, deviceData.metrics.inp.status);
  }

  function renderCodeFixes(onPageData) {
    var container = document.getElementById('code-fixes-panels');
    if (!container) return;
    if (!onPageData) { container.innerHTML = '<p class="text-muted">Run a scan to see code fixes.</p>'; return; }
    var d = onPageData.data;
    var fixes = [];
    if (!d.meta || !d.meta.title) fixes.push({ title: 'Add a Title Tag', code: '<title>Your Page Title - Brand Name</title>' });
    if (!d.meta || !d.meta.description) fixes.push({ title: 'Add Meta Description', code: '<meta name="description" content="A compelling 150-160 character description.">' });
    if (!d.meta || !d.meta.viewport) fixes.push({ title: 'Add Mobile Viewport', code: '<meta name="viewport" content="width=device-width, initial-scale=1.0">' });
    if (!d.meta || !d.meta.canonical) fixes.push({ title: 'Add Canonical URL', code: '<link rel="canonical" href="https://yourdomain.com/page-url">' });
    if (!d.meta || !d.meta.ogTitle) fixes.push({ title: 'Add Open Graph Tags', code: '<meta property="og:title" content="Your Title">\n<meta property="og:description" content="Your description">\n<meta property="og:image" content="https://yourdomain.com/image.jpg">' });
    if (!d.structuredData || d.structuredData.length === 0) fixes.push({ title: 'Add Basic Schema.org', code: '<script type="application/ld+json">\n' + JSON.stringify({"@context":"https://schema.org","@type":"WebPage","name":"Page Name","description":"Page description"}, null, 2) + '\n</script>' });
    var missingAltImages = (d.images || []).filter(function(i) { return !i.alt || !i.alt.trim(); }).slice(0, 3);
    missingAltImages.forEach(function(img) { fixes.push({ title: 'Add alt text to image', code: '<img src="' + esc(img.src) + '" alt="Descriptive text here" width="..." height="...">' }); });
    if (fixes.length === 0) { container.innerHTML = '<p class="text-muted">No critical code fixes needed. Great job!</p>'; return; }
    container.innerHTML = fixes.map(function(f) {
      return '<div class="code-fix-item"><div class="code-fix-header"><span>' + f.title + '</span></div><div class="code-fix-code"><pre><code>' + esc(f.code) + '</code></pre><button class="copy-code-btn" onclick="copyCode(this)">Copy</button></div></div>';
    }).join('');
  }

  window.copyCode = function(btn) {
    var code = btn.previousElementSibling.textContent;
    navigator.clipboard.writeText(code).then(function() { btn.textContent = 'Copied!'; setTimeout(function() { btn.textContent = 'Copy'; }, 2000); });
  };

  function buildRoadmap() {
    var tbody = document.getElementById('roadmap-tbody');
    if (!tbody) return;
    var items = [];
    if (currentSeoData) {
      var s = currentSeoData.scores;
      if (s.performance < 50) items.push({ fix: 'Improve page load performance (images, code, caching)', impact: 'High', effort: 'Medium' });
      if (s.seo < 50) items.push({ fix: 'Fix critical SEO issues (meta tags, headings, structure)', impact: 'High', effort: 'Low' });
      if (s.accessibility < 50) items.push({ fix: 'Fix accessibility issues (alt text, contrast, ARIA)', impact: 'High', effort: 'Medium' });
      if (s.bestPractices < 50) items.push({ fix: 'Address best practice violations', impact: 'Medium', effort: 'Low' });
    }
    if (currentOnPageData) {
      var d = currentOnPageData.data;
      if (!d.meta || !d.meta.title) items.push({ fix: 'Add a title tag to the page', impact: 'High', effort: 'Low' });
      if (!d.meta || !d.meta.description) items.push({ fix: 'Add a meta description', impact: 'High', effort: 'Low' });
      if (!d.meta || !d.meta.viewport) items.push({ fix: 'Add mobile viewport meta tag', impact: 'High', effort: 'Low' });
      if (!d.structuredData || d.structuredData.length === 0) items.push({ fix: 'Add Schema.org structured data', impact: 'Medium', effort: 'Medium' });
      var missingAlt = (d.images || []).filter(function(i) { return !i.alt || !i.alt.trim(); });
      if (missingAlt.length > 0) items.push({ fix: 'Add alt text to ' + missingAlt.length + ' images', impact: 'Medium', effort: 'Low' });
      if (!d.robotsTxt) items.push({ fix: 'Add robots.txt file', impact: 'Low', effort: 'Low' });
      if (!d.sitemapXml) items.push({ fix: 'Add sitemap.xml file', impact: 'Medium', effort: 'Low' });
    }
    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-muted" style="text-align:center;padding:24px">No critical fixes needed. Your site looks great!</td></tr>';
      return;
    }
    tbody.innerHTML = items.map(function(item, i) {
      var impactCls = item.impact === 'High' ? 'missing' : item.impact === 'Medium' ? 'warning' : '';
      return '<tr><td>' + (i + 1) + '</td><td>' + item.fix + '</td><td class="' + impactCls + '">' + item.impact + '</td><td>' + item.effort + '</td></tr>';
    }).join('');
  }

  async function runAiAnalysis() {
    var body = document.getElementById('ai-analysis-body');
    var loading = document.getElementById('ai-loading');
    if (!body || !loading) return;
    loading.style.display = 'flex';
    body.innerHTML = '';
    var context = buildAiContext();
    try {
      var res = await fetch('/api/seo-ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrlInput.value.trim(), question: 'Analyze this SEO audit and provide a prioritized action plan.', systemPrompt: 'You are an expert SEO consultant. Analyze this audit data and provide a clear, prioritized action plan. Be concise and actionable.\n\n' + context })
      });
      var data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'AI analysis failed.');
      aiChatHistory.push({ role: 'user', content: 'Analyze this SEO audit.' });
      aiChatHistory.push({ role: 'model', content: data.answer });
      body.innerHTML = '<div class="seo-ai-response">' + data.answer.replace(/\n/g, '<br>') + '</div>';
    } catch (err) {
      body.innerHTML = '<div class="seo-ai-error">AI analysis unavailable: ' + esc(err.message) + '</div>';
    } finally {
      loading.style.display = 'none';
    }
  }

  function buildAiContext() {
    var parts = [];
    if (currentSeoData) parts.push('SEO Scores: ' + JSON.stringify(currentSeoData.scores) + '\nCore Web Vitals: ' + JSON.stringify(currentSeoData.metrics));
    if (currentOnPageData) {
      var d = currentOnPageData.data;
      parts.push('On-page: meta=' + JSON.stringify(d.meta) + ', headings=' + JSON.stringify(d.headings ? { h1: d.headings.h1 ? d.headings.h1.length : 0 } : {}) + ', images=' + (d.images ? d.images.length : 0) + ', internalLinks=' + (d.links ? d.links.internal.length : 0) + ', externalLinks=' + (d.links ? d.links.external.length : 0) + ', wordCount=' + (d.wordCount || 0));
    }
    return parts.join('\n\n');
  }

  window.sendAiFollowUp = async function() {
    var input = document.getElementById('ai-followup-input');
    var messagesEl = document.getElementById('ai-analysis-body');
    var sendBtn = document.getElementById('ai-followup-send');
    if (!input || !messagesEl) return;
    var question = input.value.trim();
    if (!question) return;
    input.value = '';
    messagesEl.innerHTML += '<div class="seo-ai-msg user-msg">' + esc(question) + '</div>';
    messagesEl.scrollTop = messagesEl.scrollHeight;
    sendBtn.disabled = true;
    try {
      var context = buildAiContext();
      var chatContext = aiChatHistory.map(function(m) { return m.role + ': ' + m.content; }).join('\n');
      var res = await fetch('/api/seo-ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrlInput.value.trim(), question: question, systemPrompt: 'You are an expert SEO consultant. Previous conversation:\n' + chatContext + '\n\nAudit context:\n' + context + '\n\nAnswer the follow-up question concisely.' })
      });
      var data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'AI analysis failed.');
      aiChatHistory.push({ role: 'user', content: question });
      aiChatHistory.push({ role: 'model', content: data.answer });
      messagesEl.innerHTML += '<div class="seo-ai-msg assistant-msg">' + data.answer.replace(/\n/g, '<br>') + '</div>';
    } catch (err) {
      messagesEl.innerHTML += '<div class="seo-ai-msg error-msg">Error: ' + esc(err.message) + '</div>';
    } finally {
      sendBtn.disabled = false;
      input.focus();
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  };

  document.getElementById('ai-followup-send').addEventListener('click', function() { window.sendAiFollowUp(); });
  document.getElementById('ai-followup-input').addEventListener('keydown', function(e) { if (e.key === 'Enter') window.sendAiFollowUp(); });

  window.exportSeoReport = function(type) {
    if (type === 'pdf') window.print();
    else if (type === 'copy-link') {
      navigator.clipboard.writeText(targetUrlInput.value.trim()).then(function() { showToast('URL copied!', 'success'); });
    } else if (type === 'save') {
      var report = { url: targetUrlInput.value.trim(), scores: currentSeoData ? currentSeoData.scores : null, onPage: currentOnPageData ? currentOnPageData.data : null, timestamp: new Date().toISOString() };
      var saved = JSON.parse(localStorage.getItem('seoReports') || '[]');
      saved.unshift(report);
      if (saved.length > 20) saved = saved.slice(0, 20);
      localStorage.setItem('seoReports', JSON.stringify(saved));
      showToast('Report saved to Research Library', 'success');
    }
  };

  document.getElementById('btn-export-pdf').addEventListener('click', function() { window.exportSeoReport('pdf'); });
  document.getElementById('btn-copy-link').addEventListener('click', function() { window.exportSeoReport('copy-link'); });
  document.getElementById('btn-save-research').addEventListener('click', function() { window.exportSeoReport('save'); });

  function animateGauge(gaugeId, valueId, targetValue) {
    var circle = document.getElementById(gaugeId);
    var text = document.getElementById(valueId);
    if (!circle || !text) return;
    circle.setAttribute('stroke-dasharray', '0, 100');
    circle.classList.remove('good', 'warning', 'error');
    var colorClass = 'error';
    if (targetValue >= 90) colorClass = 'good';
    else if (targetValue >= 50) colorClass = 'warning';
    circle.classList.add(colorClass);
    var currentValue = 0;
    if (targetValue === 0) { text.textContent = '0'; return; }
    var duration = 800;
    var stepTime = Math.max(Math.floor(duration / targetValue), 10);
    var timer = setInterval(function() {
      currentValue += 1;
      if (currentValue >= targetValue) { currentValue = targetValue; clearInterval(timer); }
      circle.setAttribute('stroke-dasharray', currentValue + ', 100');
      text.textContent = currentValue;
    }, stepTime);
  }

  function updateVitalsBadge(valElId, badgeElId, value, status) {
    var valEl = document.getElementById(valElId);
    var badgeEl = document.getElementById(badgeElId);
    if (!valEl || !badgeEl) return;
    valEl.textContent = value;
    var statusText = 'Poor', badgeClass = 'error';
    if (status === 'good') { statusText = 'Good'; badgeClass = 'good'; }
    else if (status === 'needs-improvement') { statusText = 'Needs Imp.'; badgeClass = 'warning'; }
    badgeEl.textContent = statusText;
    badgeEl.className = 'status-badge ' + badgeClass;
  }

  function esc(str) { if (!str) return ''; var div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

  function showToast(message, type) {
    type = type || 'info';
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    var bg = type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#3b82f6';
    toast.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:12px 24px;border-radius:8px;z-index:10000;font-size:14px;color:#fff;background:' + bg;
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 4000);
  }
});