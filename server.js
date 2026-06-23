import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8765;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Google PageSpeed Insights API v5 route
app.post('/api/check-seo', async (req, res) => {
  let { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  // Prepend protocol if missing
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  try {
    // Validate URL format
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    if (!hostname.includes('.') && hostname !== 'localhost') {
      return res.status(400).json({ success: false, error: 'Invalid URL hostname format (missing domain extension)' });
    }
  } catch (e) {
    return res.status(400).json({ success: false, error: 'Invalid URL format' });
  }

  let data = null;
  let simulated = false;

  try {
    const categories = ['performance', 'seo', 'accessibility', 'best-practices'];
    const categoryParams = categories.map(cat => `category=${cat}`).join('&');
    const apiKey = process.env.GOOGLE_API_KEY;
    
    let apiUrl = `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&${categoryParams}`;
    if (apiKey) {
      apiUrl += `&key=${apiKey}`;
    }

    console.log(`[API] Checking site: ${url}`);
    const apiResponse = await fetch(apiUrl);
    
    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.warn('[API] Google API returned non-200. Falling back to simulation. Error details:', errText);
      simulated = true;
    } else {
      data = await apiResponse.json();
    }
  } catch (err) {
    console.warn('[API] Failed to fetch PageSpeed Insights live. Falling back to simulation. Error:', err.message);
    simulated = true;
  }

  // Fallback to deterministic simulated data if PageSpeed is rate-limiting, missing key, or offline
  if (simulated || !data || !data.lighthouseResult) {
    console.log(`[API] Simulating PageSpeed results for: ${url}`);
    
    // Simple hashing function to create consistent results for the same URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      hash = url.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const getScore = (offset) => {
      const base = Math.abs((hash + offset * 31) % 41) + 60; // range 60 to 100
      return Math.min(100, Math.max(0, base));
    };

    const scores = {
      performance: getScore(1),
      seo: getScore(2),
      accessibility: getScore(3),
      bestPractices: getScore(4)
    };

    // Calculate simulated Core Web Vitals
    const lcpSecs = (((Math.abs(hash) % 30) + 10) / 10).toFixed(1); // 1.0s to 3.9s
    const lcpVal = parseFloat(lcpSecs) * 1000;
    let lcpStatus = 'poor';
    if (lcpVal <= 2500) lcpStatus = 'good';
    else if (lcpVal <= 4000) lcpStatus = 'needs-improvement';

    const clsVal = ((Math.abs(hash) % 15) / 100).toFixed(2); // 0.00 to 0.14
    let clsStatus = 'poor';
    if (parseFloat(clsVal) <= 0.1) clsStatus = 'good';
    else if (parseFloat(clsVal) <= 0.25) clsStatus = 'needs-improvement';

    const inpVal = (Math.abs(hash) % 180) + 30; // 30ms to 210ms
    let inpStatus = 'poor';
    if (inpVal <= 200) inpStatus = 'good';
    else if (inpVal <= 500) inpStatus = 'needs-improvement';

    return res.json({
      success: true,
      url,
      simulated: true,
      scores,
      metrics: {
        lcp: { value: `${lcpSecs} s`, status: lcpStatus },
        cls: { value: `${clsVal}`, status: clsStatus },
        inp: { value: `${inpVal} ms`, status: inpStatus }
      }
    });
  }

  // If live data was fetched successfully
  try {
    const lh = data.lighthouseResult;
    const scores = {
      performance: Math.round((lh.categories.performance?.score || 0) * 100),
      seo: Math.round((lh.categories.seo?.score || 0) * 100),
      accessibility: Math.round((lh.categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((lh.categories['best-practices']?.score || 0) * 100)
    };

    // LCP
    const lcpAudit = lh.audits['largest-contentful-paint'];
    const lcpVal = lcpAudit?.numericValue || 0;
    const lcpDisplay = lcpAudit?.displayValue || 'N/A';
    let lcpStatus = 'poor';
    if (lcpVal <= 2500) lcpStatus = 'good';
    else if (lcpVal <= 4000) lcpStatus = 'needs-improvement';

    // CLS
    const clsAudit = lh.audits['cumulative-layout-shift'];
    const clsVal = clsAudit?.numericValue || 0;
    const clsDisplay = clsAudit?.displayValue || '0';
    let clsStatus = 'poor';
    if (clsVal <= 0.1) clsStatus = 'good';
    else if (clsVal <= 0.25) clsStatus = 'needs-improvement';

    // INP
    let inpDisplay = 'N/A';
    let inpStatus = 'good';
    const fieldInp = data.loadingExperience?.metrics?.INTERACTION_TO_NEXT_PAINT;
    
    if (fieldInp && fieldInp.percentile !== undefined) {
      const inpVal = fieldInp.percentile;
      inpDisplay = `${inpVal} ms`;
      if (inpVal <= 200) inpStatus = 'good';
      else if (inpVal <= 500) inpStatus = 'needs-improvement';
      else inpStatus = 'poor';
    } else {
      const tbtAudit = lh.audits['total-blocking-time'];
      if (tbtAudit) {
        const tbtVal = tbtAudit.numericValue || 0;
        inpDisplay = tbtAudit.displayValue || '0 ms';
        if (tbtVal <= 200) inpStatus = 'good';
        else if (tbtVal <= 500) inpStatus = 'needs-improvement';
        else inpStatus = 'poor';
      }
    }

    res.json({
      success: true,
      url,
      simulated: false,
      scores,
      metrics: {
        lcp: { value: lcpDisplay, status: lcpStatus },
        cls: { value: clsDisplay, status: clsStatus },
        inp: { value: inpDisplay, status: inpStatus }
      }
    });
  } catch (err) {
    console.error('[API] Error parsing Lighthouse results:', err);
    res.status(500).json({ success: false, error: 'Failed to parse PageSpeed results' });
  }
});

// ─── Social Media Analysis API ──────────────────────────────
const SOCIAL_PLATFORMS = {
  youtube: {
    stats: [
      { label: 'Subscribers', min: 100, max: 5000000 },
      { label: 'Total Views', min: 1000, max: 100000000 },
      { label: 'Videos', min: 5, max: 2000 },
      { label: 'Engagement', min: 1, max: 15, suffix: '%' }
    ]
  },
  instagram: {
    stats: [
      { label: 'Followers', min: 50, max: 3000000 },
      { label: 'Posts', min: 10, max: 5000 },
      { label: 'Engagement', min: 0.5, max: 8, suffix: '%' },
      { label: 'Avg. Likes', min: 5, max: 50000 }
    ]
  },
  tiktok: {
    stats: [
      { label: 'Followers', min: 100, max: 10000000 },
      { label: 'Total Likes', min: 1000, max: 500000000 },
      { label: 'Videos', min: 10, max: 5000 },
      { label: 'Engagement', min: 2, max: 20, suffix: '%' }
    ]
  },
  twitter: {
    stats: [
      { label: 'Followers', min: 50, max: 2000000 },
      { label: 'Posts', min: 100, max: 100000 },
      { label: 'Engagement', min: 0.2, max: 5, suffix: '%' },
      { label: 'Avg. Likes', min: 2, max: 20000 }
    ]
  },
  linkedin: {
    stats: [
      { label: 'Followers', min: 100, max: 1000000 },
      { label: 'Posts', min: 10, max: 5000 },
      { label: 'Engagement', min: 1, max: 10, suffix: '%' },
      { label: 'Avg. Likes', min: 5, max: 10000 }
    ]
  },
  facebook: {
    stats: [
      { label: 'Followers', min: 200, max: 5000000 },
      { label: 'Posts', min: 50, max: 20000 },
      { label: 'Engagement', min: 0.5, max: 6, suffix: '%' },
      { label: 'Avg. Likes', min: 10, max: 30000 }
    ]
  }
};

function formatStatValue(value, suffix) {
  if (suffix === '%') return value.toFixed(1) + '%';
  if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
  return Math.round(value).toString();
}

app.post('/api/social-analyze', async (req, res) => {
  const { url, platformId } = req.body;

  if (!url) return res.status(400).json({ error: 'URL is required' });

  const platform = SOCIAL_PLATFORMS[platformId];
  if (!platform) return res.status(400).json({ error: 'Unknown platform' });

  // Try Gemini AI first for real insights
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (apiKey) {
    try {
      const prompt = `Analyze this social media profile URL: ${url}

Platform: ${platformId}

Return ONLY a JSON object with this exact structure (no markdown, no code fences):
{
  "stats": [
    { "value": "number or percentage string", "label": "stat label" }
  ],
  "insights": "2-3 paragraph analysis of this profile's content strategy, engagement, and recommendations. Be specific to the platform."

Make realistic estimates based on the URL and platform. Use commas for thousands (e.g. "125,000").`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.stats && parsed.insights) {
            return res.json(parsed);
          }
        }
      }
    } catch (err) {
      console.error('[Social] Gemini error, falling back to simulated:', err.message);
    }
  }

  // Simulated fallback — generate realistic-looking stats
  const stats = platform.stats.map(s => {
    const range = Math.log(s.max) - Math.log(s.min);
    const value = Math.exp(Math.log(s.min) + Math.random() * range);
    return {
      value: formatStatValue(value, s.suffix),
      label: s.label
    };
  });

  const insights = `This ${platformId} profile shows active presence with consistent content output. Based on the URL analysis, the account demonstrates typical engagement patterns for its category.

Key observations:
• Content frequency appears regular, suggesting an established posting schedule
• Engagement rates are within normal range for the platform
• Profile optimization includes standard branding elements

Recommendations: Focus on increasing posting frequency during peak hours, experiment with trending content formats, and leverage platform-specific features (Reels, Stories, Shorts) for higher reach.`;

  res.json({ stats, insights });
});

// ─── Simulated AI fallback ───────────────────────────────
function generateSimulatedResponse(message, pageContext) {
  const msg = message.toLowerCase();
  const ctx = (pageContext || '').toLowerCase();

  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return 'Hello! I\'m your marketing AI assistant. I can help you with:\n\n- **SEO analysis and recommendations**\n- **Google Analytics** metrics explanation\n- **Social media** strategy tips\n- **PageSpeed insights** for your site\n\n> *Note: I\'m running in simulated mode. Add your API key via the ⚙ button for full AI-powered responses.*';
  }

  if (msg.includes('who are you') || msg.includes('what can you')) {
    return 'I\'m your **MARKETA Marketing AI Assistant**! I help digital marketers:\n\n1. **Audit** your site\'s SEO, performance, and accessibility\n2. **Optimize** Google Analytics tracking and interpretation\n3. **Strategize** social media content and ad campaigns\n4. **Analyze** uploaded PDF research documents\n\nTo unlock the full AI (Gemini/OpenAI/Claude), paste your API key in the ⚙ settings.';
  }

  if (msg.includes('seo') || msg.includes('search') || msg.includes('rank')) {
    return '## SEO Recommendations\n\nBased on industry best practices:\n\n1. **Title Tags** — Keep 50–60 chars with primary keyword near the front\n2. **Meta Descriptions** — 150–160 chars with compelling CTA\n3. **Header Structure** — One H1, logical H2/H3 hierarchy\n4. **Image Alt Text** — Descriptive, includes target keywords\n5. **Internal Linking** — Link relevant pages with descriptive anchor text\n6. **Page Speed** — LCP < 2.5s, CLS < 0.1 (Core Web Vitals)\n7. **Mobile Friendliness** — Responsive design, touch targets ≥ 48px\n8. **Schema Markup** — Add structured data for rich snippets\n\n> *Simulated mode — configure an API key for personalized recommendations.*';
  }

  if (msg.includes('analytics') || msg.includes('google analytics') || msg.includes('ga4') || msg.includes('tracking')) {
    return '## Google Analytics Insights\n\nKey metrics to track:\n\n- **Users & Sessions** — Measure audience reach\n- **Bounce Rate** — Target < 40% for content sites\n- **Avg Session Duration** — Longer = more engaged\n- **Conversion Rate** — Track goal completions\n- **Traffic Sources** — Organic vs paid vs referral\n- **Page Views per Session** — Measure content depth\n\n**GA4 Tip:** Use Explorations for custom funnel analysis. Set up enhanced measurement for scrolls, outbound clicks, and video engagement.\n\n> *Simulated mode — add an API key for real data analysis.*';
  }

  if (msg.includes('social') || msg.includes('instagram') || msg.includes('facebook') || msg.includes('twitter') || msg.includes('linkedin') || msg.includes('tiktok')) {
    return '## Social Media Strategy\n\n### Content Mix (40-30-30 Rule)\n- **40% Value** — Educational posts, tips, how-tos\n- **30% Engagement** — Polls, questions, user-generated content\n- **30% Promotion** — Products, services, offers\n\n### Best Practices\n- **Instagram/Threads** — High-quality visuals, Reels for reach\n- **LinkedIn** — Thought leadership, long-form posts\n- **TikTok** — Short-form video, trends, authentic content\n- **YouTube** — SEO-optimized titles, chapters in description\n\n**Posting cadence:** 3-5x/week minimum for growth.\n\n> *Simulated mode — add your API key for tailored strategy.*';
  }

  if (msg.includes('speed') || msg.includes('performance') || msg.includes('pagespeed') || msg.includes('lcp') || msg.includes('cls') || msg.includes('core web vital')) {
    return '## Page Speed & Core Web Vitals\n\n| Metric | Good | Needs Work | Poor |\n|--------|------|-----------|------|\n| **LCP** (Loading) | ≤ 2.5s | 2.5–4.0s | > 4.0s |\n| **FID/INP** (Interactivity) | ≤ 100ms | 100–300ms | > 300ms |\n| **CLS** (Visual Stability) | ≤ 0.1 | 0.1–0.25 | > 0.25 |\n\n### Quick Wins\n1. Compress images (WebP/AVIF)\n2. Enable lazy loading\n3. Minify CSS/JS\n4. Use a CDN\n5. Eliminate render-blocking resources\n6. Preload key fonts\n\n> *Simulated mode — run an SEO check on your URL for live scores.*';
  }

  if (msg.includes('content') || msg.includes('blog') || msg.includes('writing')) {
    return '## Content Marketing Tips\n\n1. **Keyword Research** — Use tools like Google Keyword Planner, Ahrefs, or Semrush\n2. **Search Intent** — Match content to informational/navigational/commercial intent\n3. **Content Length** — 1500–2500 words tends to rank best\n4. **Readability** — Aim for 6th–8th grade reading level\n5. **Headlines** — Use power words, numbers, and brackets: *"7 Proven SEO Tips [Case Study]"*\n6. **Internal Links** — Link to 2–3 related posts\n7. **Update Old Content** — Refresh and republish annually\n\n> *Simulated mode — add your API key for content strategy help.*';
  }

  if (msg.includes('email') || msg.includes('newsletter') || msg.includes('campaign')) {
    return '## Email Marketing Best Practices\n\n- **Subject Line** — 40–50 chars, personalized, urgency or curiosity\n- **Preview Text** — Use as a second subject line (90–100 chars)\n- **Send Time** — Tuesday/Thursday 10am–12pm local\n- **Open Rate Benchmark** — 20–30% (varies by industry)\n- **Click Rate Benchmark** — 2–5%\n- **Personalization** — Use name, segment by behavior\n- **Mobile-first** — 55%+ opens on mobile devices\n\n> *Simulated mode — add an API key for campaign analysis.*';
  }

  if (msg.includes('ads') || msg.includes('ppc') || msg.includes('google ads') || msg.includes('facebook ads') || msg.includes('advertising')) {
    return '## Paid Advertising Tips\n\n**Google Ads**\n- Quality Score affects CPC — improve ad relevance, landing page, CTR\n- Use broad match with smart bidding for discovery\n- Negative keywords prevent wasted spend\n\n**Social Ads (Meta/LinkedIn)**\n- Interest + behavior targeting for cold audiences\n- Retargeting pixel for warm audiences\n- A/B test creative: image vs video vs carousel\n- ROAS target: 3x–5x for healthy campaigns\n\n> *Simulated mode — add your API key for ad strategy help.*';
  }

  if (msg.includes('thank') || msg.includes('thanks')) {
    return 'You\'re welcome! 😊 If you have more questions about SEO, analytics, social media, or anything marketing-related, feel free to ask. Happy to help!';
  }

  // Check if they ran an SEO check on this page
  if (ctx.includes('seo') || ctx.includes('audit')) {
    return 'I see you\'re looking at an SEO audit page. Run a URL check to get scores for performance, SEO, accessibility, and best practices. Then paste the results here and I can help interpret them!';
  }

  if (ctx.includes('analytics') || ctx.includes('dashboard')) {
    return 'I see you\'re on the Analytics dashboard. Track metrics like users, sessions, bounce rate, and conversions. What specifically would you like to know about your analytics setup?';
  }

  // Generic fallback
  return `Great question about "${message.slice(0, 60)}"!\n\nIn digital marketing, the key is to **test, measure, and iterate**. Here are some general principles that apply:\n\n1. **Set clear KPIs** aligned with business goals\n2. **Track everything** — what gets measured gets managed\n3. **A/B test** one variable at a time\n4. **Audit regularly** — markets and algorithms change\n\nCould you tell me more about what you're working on? I can give more specific advice on SEO, analytics, social media, content, or paid ads.\n\n> *Simulated mode — add your API key via the ⚙ button for AI-powered responses.*`;
}

// ─── Multi-Provider AI Chat ──────────────────────────────
const chatSessions = new Map();
const chatConfigs = new Map(); // per-session { provider, apiKey }
const CHAT_SYSTEM_PROMPT = 'You are a digital marketing expert assistant. Help users understand SEO, Google Analytics, and social media analytics. Explain checker results in plain language when asked.';
const AI_PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

function parseAiError(res, bodyText) {
  try {
    const json = JSON.parse(bodyText);
    const msg = json.error?.message || json.error?.status || '';
    if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) return 'Invalid API key. Check your key at aistudio.google.com/apikey.';
    if (msg.includes('quota') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED')) return 'API quota exceeded. The free tier has daily limits — wait or use a different key.';
    if (msg.includes('UNAUTHENTICATED') || msg.includes('ACCESS_TOKEN')) return 'Authentication failed. Make sure your API key is valid for Gemini.';
    if (msg.includes('not found') || msg.includes('404')) return 'AI model not found. Check the model name in configuration.';
    if (msg.includes('rate') || msg.includes('RATE_LIMIT')) return 'Rate limited. Please wait a moment and try again.';
    return msg || `AI service error (HTTP ${res.status})`;
  } catch {
    return `AI service error (HTTP ${res.status})`;
  }
}

const AI_PROVIDERS = {
  pollinations: {
    async call(messages, systemPrompt, apiKey) {
      const body = {
        model: 'openai',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({
            role: m.role === 'model' ? 'assistant' : 'user',
            content: m.parts?.[0]?.text || m.content || ''
          }))
        ],
        temperature: 0.7,
        max_tokens: 1024
      };
      const res = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('[Chat] Pollinations error:', errText);
        throw new Error(`Pollinations API error (HTTP ${res.status})`);
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    }
  },
  simulated: {
    async call(messages, systemPrompt, apiKey) {
      const lastUserMsg = messages.filter(m => m.role === 'user').pop();
      const text = lastUserMsg?.parts?.[0]?.text || '';
      return generateSimulatedResponse(text);
    }
  },
  gemini: {
    async call(messages, systemPrompt, apiKey) {
      if (!apiKey) throw new Error('Gemini API key is required');
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: messages,
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('[Chat] Gemini error:', errText);
        throw new Error(parseAiError(res, errText));
      }
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
  },
  openai: {
    async call(messages, systemPrompt, apiKey) {
      if (!apiKey) throw new Error('OpenAI API key is required');
      const body = {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({
            role: m.role === 'model' ? 'assistant' : 'user',
            content: m.parts?.[0]?.text || m.content || ''
          }))
        ],
        temperature: 0.7,
        max_tokens: 1024
      };
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('[Chat] OpenAI error:', errText);
        throw new Error(parseAiError(res, errText));
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    }
  },
  anthropic: {
    async call(messages, systemPrompt, apiKey) {
      if (!apiKey) throw new Error('Anthropic API key is required');
      const body = {
        model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.parts?.[0]?.text || m.content || ''
        }))
      };
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('[Chat] Anthropic error:', errText);
        throw new Error(parseAiError(res, errText));
      }
      const data = await res.json();
      return data.content?.[0]?.text || '';
    }
  }
};

const DEFAULT_PROVIDER = AI_PROVIDERS[AI_PROVIDER];
if (!DEFAULT_PROVIDER) {
  console.error(`[Chat] Unknown AI_PROVIDER "${AI_PROVIDER}". Valid: ${Object.keys(AI_PROVIDERS).join(', ')}`);
  process.exit(1);
}
console.log(`[Chat] Default provider: ${AI_PROVIDER}`);

// Resolve which provider + key to use for a session
function getSessionProvider(sessionId) {
  const cfg = chatConfigs.get(sessionId);
  if (cfg && cfg.apiKey && AI_PROVIDERS[cfg.provider]) {
    return { provider: AI_PROVIDERS[cfg.provider], apiKey: cfg.apiKey, mode: 'user' };
  }
  // Fallback to env default
  const envKeys = { gemini: 'GOOGLE_API_KEY', openai: 'OPENAI_API_KEY', anthropic: 'ANTHROPIC_API_KEY' };
  const envKey = process.env[envKeys[AI_PROVIDER]];
  if (envKey) {
    return { provider: DEFAULT_PROVIDER, apiKey: envKey, mode: 'env' };
  }
  // Fallback to Pollinations (free, no API key)
  if (AI_PROVIDERS.pollinations) {
    return { provider: AI_PROVIDERS.pollinations, apiKey: '', mode: 'free' };
  }
  // Last resort: simulated
  return { provider: AI_PROVIDERS.simulated, apiKey: '', mode: 'simulated' };
}

// POST /api/chat/configure — user sets their own API key + provider per session
app.post('/api/chat/configure', (req, res) => {
  const { sessionId, provider, apiKey } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  // Check status without modifying
  if (apiKey === null || apiKey === undefined) {
    const cfg = chatConfigs.get(sessionId);
    if (cfg) return res.json({ status: 'configured', provider: cfg.provider });
    const envKeys = { gemini: 'GOOGLE_API_KEY', openai: 'OPENAI_API_KEY', anthropic: 'ANTHROPIC_API_KEY' };
    const envKey = process.env[envKeys[AI_PROVIDER]];
    if (envKey) return res.json({ status: 'env_configured', provider: AI_PROVIDER });
    return res.json({ status: 'free_default', provider: 'pollinations' });
  }

  // Remove config (empty string) — revert to Pollinations free default
  if (apiKey.trim() === '') {
    chatConfigs.delete(sessionId);
    return res.json({ status: 'cleared', provider: 'pollinations' });
  }

  if (!AI_PROVIDERS[provider]) {
    return res.status(400).json({ error: `Unknown provider "${provider}". Use: ${Object.keys(AI_PROVIDERS).join(', ')}` });
  }

  chatConfigs.set(sessionId, { provider, apiKey: apiKey.trim() });
  console.log(`[Chat] Session ${sessionId.slice(0, 12)}… configured: ${provider}`);
  res.json({ status: 'ok', provider });
});

app.post('/api/chat', async (req, res) => {
  const { message, sessionId, pageContext } = req.body;

  if (!message || !sessionId) {
    return res.status(400).json({ error: 'Message and sessionId are required' });
  }

  const resolved = getSessionProvider(sessionId);
  const { provider, apiKey, mode } = resolved;

  // Get or initialize session
  if (!chatSessions.has(sessionId)) {
    const initialContext = pageContext
      ? `The user is currently looking at: ${pageContext}\n\n${CHAT_SYSTEM_PROMPT}`
      : CHAT_SYSTEM_PROMPT;
    chatSessions.set(sessionId, [
      { role: 'user', parts: [{ text: initialContext }] },
      { role: 'model', parts: [{ text: 'Ready to help with your digital marketing questions.' }] }
    ]);
  }

  const history = chatSessions.get(sessionId);
  history.push({ role: 'user', parts: [{ text: message }] });

  try {
    const reply = await provider.call(history, CHAT_SYSTEM_PROMPT, apiKey);

    history.push({ role: 'model', parts: [{ text: reply }] });

    // Trim old history (keep last 20 exchanges)
    if (history.length > 42) {
      chatSessions.set(sessionId, history.slice(-40));
    }

    res.json({ reply, sessionId, mode });
  } catch (err) {
    console.error('[Chat] Error:', err.message);
    res.status(502).json({ error: `AI service error: ${err.message}` });
  }
});

// ─── Research Library ────────────────────────────────────
import { writeFile, readFile, readdir, unlink, mkdir } from 'fs/promises';
import { randomUUID } from 'crypto';

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const INDEX_FILE = path.join(UPLOADS_DIR, 'index.json');

// Ensure uploads dir + index exist
async function ensureIndex() {
  try { await mkdir(UPLOADS_DIR, { recursive: true }); } catch {}
  try { await readFile(INDEX_FILE, 'utf-8'); } catch {
    await writeFile(INDEX_FILE, JSON.stringify([]), 'utf-8');
  }
}
ensureIndex();

async function readIndex() {
  try {
    const raw = await readFile(INDEX_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch { return []; }
}

async function writeIndex(data) {
  await writeFile(INDEX_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Upload PDF (base64 in JSON body)
app.post('/api/research/upload', async (req, res) => {
  const { name, size, data } = req.body;
  if (!name || !data) {
    return res.status(400).json({ error: 'File name and data are required' });
  }
  if (!name.toLowerCase().endsWith('.pdf')) {
    return res.status(400).json({ error: 'Only PDF files are accepted' });
  }
  if (size > 15 * 1024 * 1024) {
    return res.status(400).json({ error: 'File exceeds 15 MB limit' });
  }

  const id = randomUUID();
  const filePath = path.join(UPLOADS_DIR, `${id}.pdf`);
  const buffer = Buffer.from(data, 'base64');
  await writeFile(filePath, buffer);

  const index = await readIndex();
  const entry = { id, name, size, date: new Date().toISOString(), summarized: false };
  index.push(entry);
  await writeIndex(index);

  console.log(`[Research] Uploaded: ${name} (${(size / 1024).toFixed(1)} KB)`);
  res.json({ success: true, file: entry });
});

// List uploaded files
app.get('/api/research/files', async (req, res) => {
  const index = await readIndex();
  // Check each file still exists on disk
  const files = [];
  for (const entry of index) {
    const filePath = path.join(UPLOADS_DIR, `${entry.id}.pdf`);
    try {
      await readFile(filePath);
      files.push(entry);
    } catch {
      // File was removed from disk but still in index — skip
    }
  }
  res.json({ files });
});

// Get file data (base64) for PDF viewer
app.get('/api/research/file-data/:id', async (req, res) => {
  const { id } = req.params;
  const filePath = path.join(UPLOADS_DIR, `${id}.pdf`);
  try {
    const pdfBuffer = await readFile(filePath);
    const base64 = pdfBuffer.toString('base64');
    res.json({ data: base64 });
  } catch {
    res.status(404).json({ error: 'File not found' });
  }
});

// Delete a file
app.delete('/api/research/files/:id', async (req, res) => {
  const { id } = req.params;
  const index = await readIndex();
  const idx = index.findIndex(e => e.id === id);
  if (idx === -1) return res.status(404).json({ error: 'File not found' });

  index.splice(idx, 1);
  await writeIndex(index);

  try {
    await unlink(path.join(UPLOADS_DIR, `${id}.pdf`));
  } catch {}

  console.log(`[Research] Deleted: ${id}`);
  res.json({ success: true });
});

// Helper: get API key for research (same session-based config as chat)
function getResearchApiKey() {
  const envKeys = { gemini: 'GOOGLE_API_KEY', openai: 'OPENAI_API_KEY', anthropic: 'ANTHROPIC_API_KEY' };
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  const key = process.env[envKeys[provider]];
  if (key) return { provider, key, mode: 'real' };
  return { provider: 'simulated', key: '', mode: 'simulated' };
}

// Summarize a PDF using Gemini inline_data
app.post('/api/research/summarize', async (req, res) => {
  const { fileId, apiKey: requestApiKey } = req.body;
  if (!fileId) return res.status(400).json({ error: 'fileId is required' });

  const index = await readIndex();
  const entry = index.find(e => e.id === fileId);
  if (!entry) return res.status(404).json({ error: 'File not found' });

  const filePath = path.join(UPLOADS_DIR, `${fileId}.pdf`);
  let pdfBuffer;
  try {
    pdfBuffer = await readFile(filePath);
  } catch {
    return res.status(404).json({ error: 'PDF file not found on disk' });
  }

  // Use API key from request, or fall back to env
  const key = requestApiKey || process.env.GOOGLE_API_KEY;
  if (!key) {
    return res.status(400).json({ error: 'No API key. Paste your Gemini key in the research chatbot settings.' });
  }

  const base64Data = pdfBuffer.toString('base64');
  const prompt = `You are a marketing research assistant. Summarize the following PDF document in plain language. Include:
1. The main topic and purpose
2. Key findings or insights (3-5 bullet points)
3. Any data points, statistics, or metrics mentioned
4. Practical takeaways for a marketing team

Format with clear sections using markdown.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: base64Data } },
            { text: prompt }
          ]
        }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error('[Research] Gemini summarize error:', errText);
      return res.status(502).json({ error: parseAiError(response, errText) });
    }
    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Update index with summary
    entry.summary = summary;
    entry.summarized = true;
    await writeIndex(index);

    console.log(`[Research] Summarized: ${entry.name}`);
    res.json({ success: true, summary });
  } catch (err) {
    console.error('[Research] Summarize error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Ask a question about a specific PDF
const docChatSessions = new Map();

app.post('/api/research/ask', async (req, res) => {
  const { fileId, question, apiKey: requestApiKey } = req.body;
  if (!fileId || !question) return res.status(400).json({ error: 'fileId and question are required' });

  const index = await readIndex();
  const entry = index.find(e => e.id === fileId);
  if (!entry) return res.status(404).json({ error: 'File not found' });

  const filePath = path.join(UPLOADS_DIR, `${fileId}.pdf`);
  let pdfBuffer;
  try {
    pdfBuffer = await readFile(filePath);
  } catch {
    return res.status(404).json({ error: 'PDF file not found on disk' });
  }

  // Use API key from request, or fall back to env
  const key = requestApiKey || process.env.GOOGLE_API_KEY;
  if (!key) {
    return res.status(400).json({ error: 'No API key. Paste your Gemini key in the research chatbot settings.' });
  }

  const base64Data = pdfBuffer.toString('base64');

  // Per-document chat history
  if (!docChatSessions.has(fileId)) {
    docChatSessions.set(fileId, []);
  }
  const history = docChatSessions.get(fileId);
  history.push({ role: 'user', question });

  try {
    const contents = [{ role: 'user', parts: [{ inlineData: { mimeType: 'application/pdf', data: base64Data } }, { text: `I have uploaded a PDF named "${entry.name}". I will ask questions about it.` }] }];
    for (const msg of history) {
      contents.push({ role: 'user', parts: [{ text: msg.question }] });
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: 'You are a document analysis assistant. Answer questions based solely on the content of the uploaded PDF. Be concise and cite specific parts of the document.' }] },
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
      })
    });
    if (!response.ok) { const errText = await response.text(); console.error('[Research] Gemini ask error:', errText); return res.status(502).json({ error: parseAiError(response, errText) }); }
    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Trim history
    if (history.length > 20) {
      docChatSessions.set(fileId, history.slice(-20));
    }

    res.json({ success: true, answer });
  } catch (err) {
    console.error('[Research] Ask error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Research Chat (Gemini 2.5 Flash only) ──────────────────
const researchChatSessions = new Map();

app.post('/api/research-chat', async (req, res) => {
  const { message, sessionId, apiKey } = req.body;

  if (!message || !sessionId || !apiKey) {
    return res.status(400).json({ error: 'message, sessionId, and apiKey are required' });
  }

  // Get or initialize session
  if (!researchChatSessions.has(sessionId)) {
    researchChatSessions.set(sessionId, []);
  }
  const history = researchChatSessions.get(sessionId);
  history.push({ role: 'user', parts: [{ text: message }] });

  const systemPrompt = 'You are a research AI assistant specialized in marketing research. Help users analyze documents, explain research methodologies, interpret data findings, and answer questions about marketing analytics, consumer behavior, and market trends. Be concise, cite sources when possible, and provide actionable insights.';

  try {
    const contents = [];
    
    // Add system instruction as first user message if session is new
    if (history.length === 1) {
      contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
      contents.push({ role: 'model', parts: [{ text: 'I understand. I\'m ready to help with your marketing research questions using Gemini 2.5 Flash.' }] });
    }
    
    // Add all history
    for (const msg of history) {
      contents.push(msg);
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Research Chat] Gemini error:', errText);
      const error = parseAiError(response, errText);
      return res.status(502).json({ error });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    history.push({ role: 'model', parts: [{ text: reply }] });

    // Trim old history (keep last 20 exchanges)
    if (history.length > 42) {
      researchChatSessions.set(sessionId, history.slice(-40));
    }

    res.json({ reply, sessionId });
  } catch (err) {
    console.error('[Research Chat] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Performance Marketing AI Agent ────────────────────────
const MARKETING_AGENT_SYSTEM_PROMPT = `ROLE:
You are a senior Performance Marketing AI Agent with expertise in paid media, lead generation, funnel optimization, and data-driven growth. You act like a hybrid of a media buyer, data analyst, and growth strategist.

OBJECTIVE:
- Generate high-quality leads at the lowest CPL
- Improve conversion rates across the funnel
- Optimize campaigns continuously using data
- Provide actionable insights and execution steps (not just theory)

RESPONSIBILITIES:
1. Campaign Setup & Strategy — suggest structure (CBO/ABO), audience segmentation (Cold/Warm/Hot), creatives per funnel stage, ad copy variations
2. Lead Management — analyze lead quality, improve forms, qualification questions, CRM workflows, identify funnel drop-off points
3. Performance Analysis — diagnose why metrics are working or not (Low CTR = creative issue, High CPC = audience/competition, Low CVR = landing page issue)
4. Optimization Plan — step-by-step: what to pause, scale, test next; A/B tests; budget reallocation; timeline (24h / 3 days / 7 days actions)
5. Scaling Strategy — horizontal (new audiences) and vertical (budget increase), risk management
6. Creative Strategy — scroll-stopping hooks, ad copy (short + long), video scripts, angles (pain points, emotional triggers, social proof, urgency)
7. Reporting — client-friendly summaries with wins, issues, next actions

OUTPUT FORMAT — always structure your response as:
1. Key Insights
2. Problems Identified  
3. Recommended Actions (Step-by-Step)
4. Tests to Run
5. Scaling Plan (if applicable)

BEHAVIOR RULES:
- Be practical, not generic
- Give specific actions, not theory
- Think like you are managing real ad spend
- Prioritize ROI and efficiency
- Ask clarifying questions if critical info is missing
- Never give vague advice — always include specific numbers, timelines, and platform steps`;

const ADGEN_SYSTEM_PROMPT = `You are a world-class advertising copywriter specializing in high-converting ad campaigns across Meta, Google, TikTok, LinkedIn, and YouTube. You understand consumer psychology, AIDA framework, and platform-specific best practices.

Generate ad copy that is:
- Scroll-stopping and attention-grabbing
- Emotionally compelling
- Clear and concise
- Platform-optimized
- Conversion-focused

Always provide 3 complete variations.`;

// In-memory session storage for marketing agent conversations
const marketingAgentSessions = new Map();

app.post('/api/marketing-agent', async (req, res) => {
  const { message, history, type } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Get API key from env or user config
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'Gemini API key not configured. Please set GEMINI_API_KEY in your .env file.' });
  }

  const systemPrompt = type === 'adgen' ? ADGEN_SYSTEM_PROMPT : MARKETING_AGENT_SYSTEM_PROMPT;

  try {
    // Build contents from history
    const contents = [];

    // Add system instruction as initial context
    contents.push({
      role: 'user',
      parts: [{ text: systemPrompt }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'I understand. I am your senior Performance Marketing AI Agent. I will analyze your campaign data and provide actionable, data-driven recommendations with specific numbers and timelines. Please share your campaign details.' }]
    });

    // Add conversation history
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });
    }

    console.log(`[Marketing Agent] Request received - Type: ${type || 'analyze'}`);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          topP: 0.9,
          topK: 40
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Marketing Agent] Gemini API error:', errText);

      // Parse error message
      let errorMsg = 'AI service error';
      try {
        const errJson = JSON.parse(errText);
        errorMsg = errJson.error?.message || errorMsg;
      } catch {
        errorMsg = `HTTP ${response.status}`;
      }

      return res.status(502).json({ error: `AI service error: ${errorMsg}` });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!reply) {
      return res.status(500).json({ error: 'Empty response from AI' });
    }

    console.log(`[Marketing Agent] Response generated - ${reply.length} chars`);

    res.json({ reply, type: type || 'analyze' });

  } catch (err) {
    console.error('[Marketing Agent] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// KEYWORD RESEARCH INTELLIGENCE ROUTES
// ═══════════════════════════════════════════════════════════

const KR_SYSTEM_PROMPT = `You are a senior SEO & keyword research strategist. Analyze keywords and provide structured JSON responses. Always return valid JSON when asked for structured data.`;

// ─── 1. Keyword Explorer ──────────────────────────────────
app.post('/api/keyword-explorer', async (req, res) => {
  const { keyword, industry, location, goal, platform } = req.body;
  if (!keyword) return res.status(400).json({ error: 'Keyword is required' });

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'Gemini API key not configured' });

  console.log(`[KR Explorer] Keyword: "${keyword}" Industry: "${industry}" Location: "${location}"`);

  try {
    // 1. Google Autocomplete suggestions
    const suggestions = await fetchAutocompleteSuggestions(keyword);

    // 2. Get AI enrichment
    const prompt = `Given this seed keyword: "${keyword}"
Industry: ${industry || 'general'}
Location: ${location || 'global'}
Goal: ${goal || 'leads'}
Platform: ${platform || 'all'}

Related keywords discovered via autocomplete: ${JSON.stringify(suggestions.slice(0, 80))}

For each keyword, provide a JSON array with objects containing:
{
  "keyword": "...",
  "intent": "Informational|Navigational|Commercial|Transactional",
  "difficulty": "Low|Medium|High",
  "funnel": "TOFU|MOFU|BOFU",
  "priority": 1-10
}

Return ONLY the JSON array, no other text. Include all keywords but deduplicate similar ones. Limit to top 60 keywords.`;

    const contents = [
      { role: 'user', parts: [{ text: KR_SYSTEM_PROMPT + '\n\n' + prompt }] },
      { role: 'model', parts: [{ text: 'I understand. I will provide structured keyword data.' }] },
      { role: 'user', parts: [{ text: prompt }] }
    ];

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.3, maxOutputTokens: 8192, responseMimeType: 'application/json' } })
    });

    if (!aiRes.ok) throw new Error('Gemini API error');
    const aiData = await aiRes.json();
    const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    let keywords;
    try {
      keywords = JSON.parse(text);
      if (!Array.isArray(keywords)) keywords = keywords.keywords || [];
    } catch {
      // Try to extract JSON from text
      const match = text.match(/\[[\s\S]*\]/);
      keywords = match ? JSON.parse(match[0]) : suggestions.map(s => ({
        keyword: s, intent: 'Informational', difficulty: 'Medium', funnel: 'TOFU', priority: 5
      }));
    }

    res.json({ keywords, suggestions });
  } catch (err) {
    console.error('[KR Explorer] Error:', err.message);
    // Fallback: return suggestions with basic enrichment
    const fallback = suggestions.slice(0, 30).map(s => ({
      keyword: s, intent: 'Informational', difficulty: 'Medium', funnel: 'TOFU', priority: 5
    }));
    res.json({ keywords: fallback, suggestions });
  }
});

async function fetchAutocompleteSuggestions(keyword) {
  const seen = new Set();
  const all = [];
  const suffixes = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z',
    'how','what','why','best','near me','for','2025','2026','tips','guide','services','company','cost','price','vs'];

  const promises = suffixes.map(async suffix => {
    try {
      const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(keyword + ' ' + suffix)}`;
      const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
      const data = await r.json();
      const items = data[1] || [];
      items.forEach(item => {
        if (!seen.has(item) && item !== keyword) {
          seen.add(item);
          all.push(item);
        }
      });
    } catch {}
  });

  await Promise.allSettled(promises);

  // Also add base keyword variations
  [keyword, `${keyword} services`, `${keyword} company`, `${keyword} cost`, `${keyword} price`, `${keyword} near me`,
   `best ${keyword}`, `${keyword} for`, `${keyword} tips`, `${keyword} guide`].forEach(k => {
    if (!seen.has(k)) { seen.add(k); all.push(k); }
  });

  return all;
}

// ─── 2. Trend Analysis ────────────────────────────────────
app.post('/api/trend-analysis', async (req, res) => {
  const { keyword, related } = req.body;
  if (!keyword) return res.status(400).json({ error: 'Keyword is required' });

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  console.log(`[KR Trends] Keyword: "${keyword}" Related: ${JSON.stringify(related || [])}`);

  try {
    // Generate synthetic trend data (since we can't access Google Trends API directly)
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const terms = [keyword, ...(related || []).slice(0, 3)];
    const trendData = terms.map((term, ti) => {
      const base = 30 + Math.random() * 40;
      return {
        name: term,
        data: months.map((_, i) => {
          const seasonal = Math.sin((i / 11) * Math.PI * 2) * 15;
          const trend = (ti === 0 ? i * 2 : 0);
          return Math.max(5, Math.round(base + seasonal + trend + (Math.random() - 0.5) * 20));
        })
      };
    });

    const regions = [
      { name: 'UAE', value: 85 + Math.round(Math.random() * 15) },
      { name: 'Saudi Arabia', value: 60 + Math.round(Math.random() * 20) },
      { name: 'India', value: 45 + Math.round(Math.random() * 20) },
      { name: 'UK', value: 30 + Math.round(Math.random() * 15) },
      { name: 'USA', value: 25 + Math.round(Math.random() * 15) },
    ];

    const rising = [
      { text: `${keyword} services 2026`, change: 150 + Math.round(Math.random() * 100) },
      { text: `best ${keyword}`, change: 80 + Math.round(Math.random() * 80) },
      { text: `${keyword} near me`, change: 50 + Math.round(Math.random() * 60) },
      { text: `${keyword} cost`, change: 30 + Math.round(Math.random() * 40) },
      { text: `${keyword} for beginners`, change: 20 + Math.round(Math.random() * 30) },
    ];

    // Get seasonality insights from AI if key available
    let seasonality = '';
    if (apiKey) {
      try {
        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `Based on trend data for "${keyword}" in the ${(related || [keyword])[0]?.split(' ').pop() || ''} market, provide brief seasonality insights:\n- Best months to run ads\n- Seasonal patterns\n- Peak search periods\nKeep it under 4 bullet points.` }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 512 }
          })
        });
        if (aiRes.ok) {
          const d = await aiRes.json();
          seasonality = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch {}
    }

    res.json({ trendData, regions, rising, seasonality });
  } catch (err) {
    console.error('[KR Trends] Error:', err.message);
    res.json({ trendData: [], regions: [], rising: [], seasonality: '' });
  }
});

// ─── 3. AI Keyword Strategy ───────────────────────────────
app.post('/api/ai-keyword-strategy', async (req, res) => {
  const { keyword, keywords, industry, location, goal, platform } = req.body;
  if (!keyword) return res.status(400).json({ error: 'Keyword is required' });

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'Gemini API key not configured' });

  console.log(`[KR Strategy] Keyword: "${keyword}" Keywords: ${keywords?.length || 0}`);

  try {
    const prompt = `Create a comprehensive keyword strategy for: "${keyword}"
Industry: ${industry || 'general'}
Location: ${location || 'global'}
Business Goal: ${goal || 'leads'}
Platform: ${platform || 'all'}

Discovered keywords: ${JSON.stringify((keywords || []).slice(0, 50))}

Generate the following sections using markdown headers:

## 1. KEYWORD CLUSTERS
Group related keywords into 4 clusters:
- "High-intent buyer keywords" (BOFU)
- "Research/awareness keywords" (TOFU)  
- "Long-tail opportunities"
- "Negative keywords to exclude"
List 8-12 keywords per cluster.

## 2. CONTENT IDEAS
For the top 3 clusters, suggest:
- Blog post title
- Landing page headline
- Ad headline (Google/Meta format)
- Meta description (160 chars)

## 3. GOOGLE ADS STRUCTURE
Suggest campaign/ad group structure:
- Campaign name
- 3-4 Ad Groups with themes
- Keywords per ad group (exact/phrase)
- Match type recommendations

## 4. SEO PRIORITY ROADMAP
3-month plan:
- Month 1: Low-difficulty quick wins (list 10 keywords)
- Month 2: Content building targets (list 8 keywords)
- Month 3: Competitive terms (list 6 keywords)

Provide specific, actionable recommendations with real keyword examples.`;

    const contents = [
      { role: 'user', parts: [{ text: KR_SYSTEM_PROMPT + '\n\n' + prompt }] },
      { role: 'model', parts: [{ text: 'I will create a comprehensive keyword strategy with clusters, content ideas, ad structure, and an SEO roadmap.' }] },
      { role: 'user', parts: [{ text: prompt }] }
    ];

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 8192 } })
    });

    if (!aiRes.ok) throw new Error('Gemini API error');
    const aiData = await aiRes.json();
    const strategy = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    res.json({ strategy });
  } catch (err) {
    console.error('[KR Strategy] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── 4. Competitor Keywords ───────────────────────────────
app.post('/api/competitor-keywords', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'Gemini API key not configured' });

  const domain = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  console.log(`[KR Competitor] Domain: ${domain}`);

  try {
    // Scrape the competitor's page
    const scrapedContent = await scrapeCompetitorPage(url);

    const prompt = `Analyze this competitor's website content and identify their keyword strategy:

Website: ${domain}
Content scraped:
${scrapedContent.substring(0, 4000)}

Provide your analysis as JSON with these keys:
{
  "targetedKeywords": ["keyword1", "keyword2", ...up to 15],
  "contentGaps": ["gap1", "gap2", ...up to 10],
  "stealTraffic": ["steal1", "steal2", ...up to 10],
  "strategy": "Your assessment of their SEO strategy in 3-4 paragraphs with specific recommendations"
}

Return ONLY the JSON object.`;

    const contents = [
      { role: 'user', parts: [{ text: KR_SYSTEM_PROMPT + '\n\n' + prompt }] },
      { role: 'model', parts: [{ text: 'I will analyze the competitor website content and provide keyword and strategy insights as structured JSON.' }] },
      { role: 'user', parts: [{ text: prompt }] }
    ];

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.5, maxOutputTokens: 4096, responseMimeType: 'application/json' } })
    });

    if (!aiRes.ok) throw new Error('Gemini API error');
    const aiData = await aiRes.json();
    const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      result = match ? JSON.parse(match[0]) : { targetedKeywords: [], contentGaps: [], stealTraffic: [], strategy: text };
    }

    res.json(result);
  } catch (err) {
    console.error('[KR Competitor] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

async function scrapeCompetitorPage(url) {
  try {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const r = await fetch(fullUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MARKETA/1.0)' }
    });
    const html = await r.text();

    // Extract text content
    let content = '';
    // Title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) content += `Title: ${titleMatch[1]}\n`;
    // Meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (descMatch) content += `Description: ${descMatch[1]}\n`;
    // Headings
    const headings = html.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi) || [];
    content += `Headings:\n${headings.map(h => h.replace(/<[^>]+>/g, '')).join('\n')}\n`;
    // Alt text
    const alts = html.match(/alt=["']([^"']+)["']/gi) || [];
    content += `Image Alt Text:\n${alts.map(a => a.replace(/alt=["']/i, '').replace(/["']$/, '')).join('\n')}\n`;
    // Body text (strip tags)
    const body = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    content += `\nBody text (first 2000 chars):\n${body.substring(0, 2000)}`;

    return content;
  } catch (err) {
    return `Could not fetch ${url}: ${err.message}`;
  }
}

// ═══════════════════════════════════════════════════════════
// SEO CHECKER — ON-PAGE AUDIT, AI ANALYSIS, MOBILE/DESKTOP
// ═══════════════════════════════════════════════════════════

// ─── On-Page SEO Audit (scrape + parse) ──────────────────
app.post('/api/seo-onpage', async (req, res) => {
  let { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  console.log(`[SEO OnPage] Analyzing: ${url}`);

  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MARKETA-SEO/1.0)' }
    });
    const html = await r.text();

    // ── META TAGS ──
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;
    const titleLen = title ? title.length : 0;

    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i)
      || html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i);
    const metaDesc = descMatch ? descMatch[1].trim() : null;
    const descLen = metaDesc ? metaDesc.length : 0;

    const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([\s\S]*?)["']/i)
      || html.match(/<link[^>]*href=["']([\s\S]*?)["'][^>]*rel=["']canonical["']/i);
    const canonical = canonicalMatch ? canonicalMatch[1].trim() : null;

    const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([\s\S]*?)["']/i);
    const robotsContent = robotsMatch ? robotsMatch[1].trim() : null;
    const noindex = robotsContent ? /noindex/i.test(robotsContent) : false;

    // ── HEADINGS ──
    const headings = {};
    for (let i = 1; i <= 6; i++) {
      const regex = new RegExp(`<h${i}[^>]*>([\\s\\S]*?)<\\/h${i}>`, 'gi');
      const matches = [];
      let m;
      while ((m = regex.exec(html)) !== null) {
        matches.push(m[1].replace(/<[^>]+>/g, '').trim());
      }
      headings[`h${i}`] = matches;
    }

    // ── IMAGES ──
    const imgRegex = /<img[^>]*>/gi;
    const images = [];
    let imgMatch;
    while ((imgMatch = imgRegex.exec(html)) !== null) {
      const tag = imgMatch[0];
      const srcMatch = tag.match(/src=["']([^"']+)["']/i);
      const altMatch = tag.match(/alt=["']([^"']*)["']/i);
      const src = srcMatch ? srcMatch[1] : '';
      const alt = altMatch ? altMatch[1] : null;
      const filename = src.split('/').pop().split('?')[0] || src;
      images.push({ src: filename, alt, hasAlt: altMatch !== null });
    }

    // ── LINKS ──
    const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
    const links = { internal: [], external: [] };
    let linkMatch;
    const domain = new URL(url).hostname;
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      const href = linkMatch[1];
      const tag = linkMatch[0];
      const noopener = /rel=["'][^"']*noopener[^"']*["']/i.test(tag);
      const targetBlank = /target=["']_blank["']/i.test(tag);
      try {
        const linkUrl = new URL(href, url);
        const isInternal = linkUrl.hostname === domain || linkUrl.hostname === '';
        const entry = { href, noopener, targetBlank };
        if (isInternal) links.internal.push(entry);
        else links.external.push(entry);
      } catch {}
    }

    // ── STRUCTURED DATA ──
    const schemaRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const schemas = [];
    let schemaMatch;
    while ((schemaMatch = schemaRegex.exec(html)) !== null) {
      try {
        schemas.push(JSON.parse(schemaMatch[1]));
      } catch {}
    }

    // ── ROBOTS.TXT & SITEMAP ──
    let robotsTxt = false, sitemapXml = false;
    try {
      const robotsUrl = new URL('/robots.txt', url).href;
      const robotsRes = await fetch(robotsUrl, { signal: AbortSignal.timeout(3000) });
      robotsTxt = robotsRes.ok;
    } catch {}
    try {
      const sitemapUrl = new URL('/sitemap.xml', url).href;
      const sitemapRes = await fetch(sitemapUrl, { signal: AbortSignal.timeout(3000) });
      sitemapXml = sitemapRes.ok;
    } catch {}

    const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = textContent.split(/\s+/).length;

    res.json({
      success: true,
      url,
      data: {
        meta: { title, description: metaDesc, keywords: null, ogTitle: null, ogDescription: null, ogImage: null, twitterCard: null, viewport: null, canonical, robots: robotsContent },
        headings,
        images,
        links: { internal: links.internal.map(l => l.href), external: links.external.map(l => l.href) },
        structuredData: schemas,
        robotsTxt,
        sitemapXml,
        wordCount
      }
    });
  } catch (err) {
    console.error('[SEO OnPage] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── AI SEO Expert Analysis ──────────────────────────────
app.post('/api/seo-ai-analysis', async (req, res) => {
  const { url, question, systemPrompt, scores, metrics, onpage } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'Gemini API key not configured' });

  console.log(`[SEO AI] Analysis for: ${url}`);

  try {
    const auditSummary = `
URL: ${url}
Scores: Performance ${scores?.performance || 'N/A'}, SEO ${scores?.seo || 'N/A'}, Accessibility ${scores?.accessibility || 'N/A'}, Best Practices ${scores?.bestPractices || 'N/A'}
Core Web Vitals: LCP ${metrics?.lcp?.value || 'N/A'} (${metrics?.lcp?.status || ''}), CLS ${metrics?.cls?.value || 'N/A'} (${metrics?.cls?.status || ''}), INP ${metrics?.inp?.value || 'N/A'} (${metrics?.inp?.status || ''})
Meta Title: ${onpage?.metaTags?.title || 'MISSING'} (${onpage?.metaTags?.titleLen || 0} chars)
Meta Description: ${onpage?.metaTags?.metaDesc || 'MISSING'} (${onpage?.metaTags?.descLen || 0} chars)
Canonical: ${onpage?.metaTags?.canonical || 'MISSING'}
H1 count: ${onpage?.headings?.h1?.length || 0} ${onpage?.headings?.h1?.length !== 1 ? '(ISSUE)' : ''}
H2 count: ${onpage?.headings?.h2?.length || 0}
Images: ${onpage?.images?.length || 0} total, ${onpage?.images?.filter(i => !i.hasAlt).length || 0} missing alt text
Internal links: ${onpage?.links?.internalCount || 0}
External links: ${onpage?.links?.externalCount || 0}
Structured Data: ${onpage?.schemas?.length || 0} schemas found
Robots.txt: ${onpage?.robotsTxt ? 'Found' : 'MISSING'}
Sitemap.xml: ${onpage?.sitemapXml ? 'Found' : 'MISSING'}
Noindex: ${onpage?.metaTags?.noindex ? 'YES (page is deindexed!)' : 'No'}
`;

    let prompt;
    if (systemPrompt) {
      prompt = systemPrompt;
    } else if (question) {
      prompt = `You are an SEO expert. The user asked: "${question}"

Here is the audit context:
${auditSummary}

Provide a clear, actionable answer. Use specific numbers and code examples where applicable. Keep it under 300 words.`;
    } else {
      prompt = `You are an SEO expert. Analyze these audit results and provide a comprehensive expert analysis:

${auditSummary}

Provide your analysis in this exact format with markdown:

## Overall Site Health Verdict
Write 2 sentences summarizing the site's SEO health.

## Critical Issue to Fix Today
Identify the single most important issue. Explain exactly how to fix it with code examples.

## Estimated Traffic Impact
If the top 3 issues are fixed, estimate the potential traffic improvement.

## Meta Tags Recommendations
Specific recommendations for title, description, canonical. Include exact code to add.

## Content Strategy
Recommendations for headings, keyword placement, content structure.

## Technical Fixes
Server-side, rendering, compression, and structural recommendations.

## Competitor Edge
What to improve to outrank competitors in their niche.

Be specific with numbers, code examples, and actionable steps.`;
    }

    const contents = [
      { role: 'user', parts: [{ text: prompt }] }
    ];

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 4096 } })
    });

    if (!aiRes.ok) throw new Error('Gemini API error');
    const aiData = await aiRes.json();
    const analysis = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    res.json({ success: true, answer: analysis });
  } catch (err) {
    console.error('[SEO AI] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Mobile/Desktop Toggle (both strategies) ─────────────
app.post('/api/seo-mobile-desktop', async (req, res) => {
  let { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  const apiKey = process.env.GOOGLE_API_KEY;
  const results = {};

  // Simulated fallback (when PageSpeed API is rate-limited)
  let hash = 0;
  for (let i = 0; i < url.length; i++) { hash = url.charCodeAt(i) + ((hash << 5) - hash); }
  const getScore = (offset) => Math.min(100, Math.max(0, Math.abs((hash + offset * 31) % 41) + 60));

  for (const strategy of ['mobile', 'desktop']) {
    try {
      const categories = ['performance', 'seo', 'accessibility', 'best-practices'];
      let apiUrl = `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&${categories.map(c => `category=${c}`).join('&')}`;
      if (apiKey) apiUrl += `&key=${apiKey}`;

      const apiRes = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) });
      if (!apiRes.ok) throw new Error('API returned ' + apiRes.status);
      const data = await apiRes.json();
      const lh = data.lighthouseResult;
      if (!lh) throw new Error('No lighthouse result');

      const lcpAudit = lh.audits['largest-contentful-paint'];
      const clsAudit = lh.audits['cumulative-layout-shift'];
      let inpDisplay = 'N/A', inpStatus = 'good';
      const fieldInp = data.loadingExperience?.metrics?.INTERACTION_TO_NEXT_PAINT;
      if (fieldInp?.percentile !== undefined) {
        inpDisplay = fieldInp.percentile + ' ms';
        inpStatus = fieldInp.percentile <= 200 ? 'good' : fieldInp.percentile <= 500 ? 'needs-improvement' : 'poor';
      } else {
        const tbt = lh.audits['total-blocking-time'];
        if (tbt) { inpDisplay = tbt.displayValue; inpStatus = tbt.numericValue <= 200 ? 'good' : tbt.numericValue <= 500 ? 'needs-improvement' : 'poor'; }
      }

      results[strategy] = {
        scores: {
          performance: Math.round((lh.categories.performance?.score || 0) * 100),
          seo: Math.round((lh.categories.seo?.score || 0) * 100),
          accessibility: Math.round((lh.categories.accessibility?.score || 0) * 100),
          bestPractices: Math.round((lh.categories['best-practices']?.score || 0) * 100)
        },
        metrics: {
          lcp: { value: lcpAudit?.displayValue || 'N/A', status: lcpAudit?.numericValue <= 2500 ? 'good' : lcpAudit?.numericValue <= 4000 ? 'needs-improvement' : 'poor' },
          cls: { value: clsAudit?.displayValue || '0', status: clsAudit?.numericValue <= 0.1 ? 'good' : clsAudit?.numericValue <= 0.25 ? 'needs-improvement' : 'poor' },
          inp: { value: inpDisplay, status: inpStatus }
        }
      };
    } catch (err) {
      console.warn(`[SEO ${strategy}] API failed, using simulated data:`, err.message);
      // Simulated data with slight differences between mobile and desktop
      const offset = strategy === 'mobile' ? 1 : 2;
      const perfOffset = strategy === 'mobile' ? -8 : 5;
      const lcpBase = strategy === 'mobile' ? 3200 : 1800;
      results[strategy] = {
        simulated: true,
        scores: {
          performance: getScore(offset + perfOffset),
          seo: getScore(offset + 10),
          accessibility: getScore(offset + 20),
          bestPractices: getScore(offset + 30)
        },
        metrics: {
          lcp: { value: (lcpBase / 1000).toFixed(1) + ' s', status: lcpBase <= 2500 ? 'good' : lcpBase <= 4000 ? 'needs-improvement' : 'poor' },
          cls: { value: (Math.abs(hash + offset) % 12 / 100).toFixed(2), status: 'good' },
          inp: { value: (Math.abs(hash + offset) % 180 + 40) + ' ms', status: 'good' }
        }
      };
    }
  }

  res.json({ success: true, mobile: results.mobile, desktop: results.desktop });
});

// Serve main client routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[Server] MARKETA Intelligence running on http://localhost:${PORT}`);
});
