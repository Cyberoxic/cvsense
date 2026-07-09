// ─────────────────────────────────────────────
//  Smart Resume Analyzer — app.js
//  Works BOTH locally and on Netlify automatically
// ─────────────────────────────────────────────

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ── LOCAL DEV KEY ────────────────────────────
// Only used when running on localhost.
// On Netlify this is ignored — key stays on server.
const LOCAL_API_KEY = 'YOUR_GROQ_API_KEY_HERE';
// ─────────────────────────────────────────────

const IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

// ── DOM refs ──
const pdfInput    = document.getElementById('pdf-input');
const jobDesc     = document.getElementById('job-desc');
const analyzeBtn  = document.getElementById('analyze-btn');
const dropzone    = document.getElementById('dropzone');
const fileBadge   = document.getElementById('file-badge');
const fileNameEl  = document.getElementById('file-name');
const errorMsg    = document.getElementById('error-msg');
const loadingText = document.getElementById('loading-text');

let pdfFile = null;

function checkReady() {
  analyzeBtn.disabled = !(pdfFile !== null && jobDesc.value.trim().length > 20);
}
jobDesc.addEventListener('input', checkReady);

// ── File selection ──
pdfInput.addEventListener('change', () => {
  const file = pdfInput.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showError('PDF too large. Max 5 MB.'); return; }
  pdfFile = file;
  fileNameEl.textContent = file.name;
  fileBadge.style.display = 'inline-flex';
  checkReady();
});

// ── Drag & drop ──
dropzone.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') {
    pdfInput.files = e.dataTransfer.files;
    pdfInput.dispatchEvent(new Event('change'));
  }
});

function showError(msg) {
  errorMsg.innerHTML = `<div class="error-box">${msg}</div>`;
}

// ── Robust JSON extractor ──
// Handles ALL the ways Groq might wrap its response:
// - plain JSON
// - ```json ... ```
// - ```  ... ```
// - text before/after the JSON object
function extractJSON(raw) {
  if (!raw) throw new Error('Empty response from AI.');

  // 1. Strip markdown code fences
  let clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // 2. Try parsing the whole thing first
  try { return JSON.parse(clean); } catch (_) {}

  // 3. Find the first { and last } and extract just that block
  const start = clean.indexOf('{');
  const end   = clean.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(clean.slice(start, end + 1)); } catch (_) {}
  }

  // 4. Nothing worked — throw with the raw text for debugging
  throw new Error(`Could not parse AI response. Raw: ${raw.slice(0, 200)}`);
}

// ── STEP 1: Extract text from PDF using PDF.js ──
async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf         = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let   fullText    = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += '\n' + content.items.map(item => item.str).join(' ');
  }
  return fullText.trim();
}

// ── Shared prompt ──
function buildPrompt(resumeText, jobRequirements) {
  return `Analyze the resume below against the job requirements and return a JSON report.

=== JOB REQUIREMENTS ===
${jobRequirements}

=== RESUME TEXT ===
${resumeText}

Return ONLY this exact JSON structure, nothing else. No extra text, no markdown:
{
  "verdict": "Strong Match",
  "score": 7,
  "summary": "Two sentence summary here.",
  "matched_keywords": ["keyword1", "keyword2"],
  "missing_keywords": ["keyword1", "keyword2"],
  "ats": { "formatting": 80, "keywords": 60, "readability": 90, "structure": 75 },
  "issues": [
    { "priority": "high", "area": "Skills", "problem": "problem here", "fix": "fix here" }
  ],
  "strengths": ["strength1", "strength2"],
  "quick_wins": ["win1", "win2"]
}
Rules: issues 3–6 items high→low, matched/missing 4–10 items, strengths 3–5, quick_wins 3–4.`;
}

// ── STEP 2a: Call Groq directly (LOCAL only) ──
async function analyzeLocal(resumeText, jobRequirements) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${LOCAL_API_KEY}`
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      temperature: 0.1,   // lower = more predictable JSON output
      max_tokens: 1500,
      response_format: { type: 'json_object' }, // force JSON mode
      messages: [
        {
          role: 'system',
          content: 'You are a resume analysis expert. Always respond with valid JSON only. No markdown, no explanation.'
        },
        { role: 'user', content: buildPrompt(resumeText, jobRequirements) }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Groq error ${response.status}`);
  }

  const data = await response.json();
  const raw  = data.choices?.[0]?.message?.content || '';
  return extractJSON(raw);
}

// ── STEP 2b: Call Netlify backend (PRODUCTION only) ──
async function analyzeViaBackend(resumeText, jobRequirements) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText, jobRequirements })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Server error ${response.status}`);
  return data;
}

// ── Main flow ──
analyzeBtn.addEventListener('click', async () => {
  errorMsg.innerHTML = '';
  document.getElementById('input-section').style.display   = 'none';
  document.getElementById('loading-section').style.display = 'block';

  try {
    loadingText.textContent = 'Reading your PDF…';
    const resumeText = await extractTextFromPDF(pdfFile);

    if (resumeText.length < 100)
      throw new Error("Could not extract enough text. Make sure it's not a scanned image PDF.");

    loadingText.textContent = 'Analyzing with AI…';

    const result = IS_LOCAL
      ? await analyzeLocal(resumeText, jobDesc.value.trim())
      : await analyzeViaBackend(resumeText, jobDesc.value.trim());

    renderResults(result);

  } catch (err) {
    document.getElementById('loading-section').style.display = 'none';
    document.getElementById('input-section').style.display   = 'block';

    let msg = err.message;
    if (msg.includes('401') || msg.includes('invalid_api_key'))
      msg = 'Invalid API key. Open app.js and check LOCAL_API_KEY on line 12.';
    else if (msg.includes('429') || msg.includes('rate_limit'))
      msg = 'Rate limit hit. Wait 30 seconds and try again.';

    showError(`Analysis failed: ${msg}`);
  }
});

// ── Helpers ──
const verdictClass = v => v === 'Strong Match' ? 'great' : v === 'Needs Improvement' ? 'improve' : 'weak';
const verdictIcon  = v => v === 'Strong Match' ? '✅' : v === 'Needs Improvement' ? '⚠️' : '❌';

// ── Render results ──
function renderResults(r) {
  document.getElementById('loading-section').style.display = 'none';
  const vc     = verdictClass(r.verdict);
  const scoreW = Math.round((r.score / 10) * 100);

  const issuesHTML    = (r.issues || []).map(i => `
    <li class="issue-item">
      <div class="issue-dot ${i.priority}"></div>
      <div>
        <div class="issue-text"><strong>${i.area}</strong> — ${i.problem}</div>
        <div class="issue-fix"><strong>Fix:</strong> ${i.fix}</div>
      </div>
    </li>`).join('');

  const matchedHTML   = (r.matched_keywords || []).map(k => `<span class="tag found">${k}</span>`).join('');
  const missingHTML   = (r.missing_keywords  || []).map(k => `<span class="tag missing">${k}</span>`).join('');
  const strengthsHTML = (r.strengths         || []).map(s => `<span class="tag neutral">${s}</span>`).join('');
  const winsHTML      = (r.quick_wins        || []).map(w => `<li class="quick-win-item">⚡ ${w}</li>`).join('');

  const ats = r.ats || {};
  const atsRows = [['Formatting', ats.formatting], ['Keywords', ats.keywords],
                   ['Readability', ats.readability], ['Structure', ats.structure]]
    .map(([label, val]) => `
      <div class="ats-row">
        <span class="ats-label">${label}</span>
        <div class="ats-bar-bg"><div class="ats-bar-fill" style="width:${val||0}%"></div></div>
        <span class="ats-score">${val||0}</span>
      </div>`).join('');

  document.getElementById('results-section').innerHTML = `
    <div class="verdict-banner ${vc}">
      <div class="verdict-icon">${verdictIcon(r.verdict)}</div>
      <div>
        <div class="verdict-title">${r.verdict}</div>
        <div class="verdict-sub">${r.summary || ''}</div>
        <div class="score-row">
          <div class="score-number">${r.score}<span style="font-size:1.4rem;opacity:0.4">/10</span></div>
          <div class="score-bar-wrap">
            <div class="score-bar-bg"><div class="score-bar-fill" id="score-fill" style="width:0%"></div></div>
            <div class="score-label">Overall CV score</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="section-title">Issues &amp; How to Fix Them</div>
      <ul class="issue-list">${issuesHTML}</ul>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="card-label">Matched Keywords</div>
        <div class="tag-group">${matchedHTML || '<span style="color:var(--muted)">None found</span>'}</div>
        ${missingHTML ? `<div class="card-label" style="margin-top:1.5rem">Missing Keywords</div><div class="tag-group">${missingHTML}</div>` : ''}
      </div>
      <div class="card">
        <div class="card-label">ATS Compatibility</div>
        <div class="ats-meter">${atsRows}</div>
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="card-label">Your Strengths</div>
        <div class="tag-group">${strengthsHTML || '<span style="color:var(--muted)">—</span>'}</div>
      </div>
      <div class="card">
        <div class="card-label">Quick Wins</div>
        <ul style="list-style:none;padding:0">${winsHTML}</ul>
      </div>
    </div>

    <div style="text-align:center;padding-bottom:2rem">
      <button class="reset-btn" id="reset-btn">← Analyze another CV</button>
      <p class="page-footer">Made with ❤️ by Souvik (@cyberoxic)</p>
    </div>`;

  document.getElementById('results-section').style.display = 'block';

  setTimeout(() => {
    const fill = document.getElementById('score-fill');
    if (fill) fill.style.width = scoreW + '%';
  }, 100);

  document.getElementById('reset-btn').addEventListener('click', () => {
    document.getElementById('results-section').style.display = 'none';
    document.getElementById('results-section').innerHTML = '';
    document.getElementById('input-section').style.display = 'block';
    pdfFile = null; pdfInput.value = '';
    fileBadge.style.display = 'none';
    jobDesc.value = ''; analyzeBtn.disabled = true; errorMsg.innerHTML = '';
  });
}
