export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { resumeText, jobRequirements } = await req.json();

    if (!resumeText || !jobRequirements)
      return new Response(JSON.stringify({ error: 'Missing resumeText or jobRequirements' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });

    if (resumeText.length < 100)
      return new Response(JSON.stringify({ error: "Resume text too short. Make sure it's not a scanned image PDF." }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY)
      return new Response(JSON.stringify({ error: 'API key not configured on server.' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });

    const userPrompt = `Analyze the resume below against the job requirements and return a JSON report.

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
Rules: issues 3-6 items high to low, matched/missing 4-10 items, strengths 3-5, quick_wins 3-4.`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are a resume analysis expert. Always respond with valid JSON only. No markdown, no explanation.' },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!groqResponse.ok) {
      const err = await groqResponse.json().catch(() => ({}));
      throw new Error(err.error?.message || `Groq API error ${groqResponse.status}`);
    }

    const groqData = await groqResponse.json();
    const raw = groqData.choices?.[0]?.message?.content || '';
    if (!raw) throw new Error('Empty response from AI.');

    let result;
    try {
      result = JSON.parse(raw);
    } catch (_) {
      const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const start = clean.indexOf('{');
      const end   = clean.lastIndexOf('}');
      if (start !== -1 && end > start) {
        result = JSON.parse(clean.slice(start, end + 1));
      } else {
        throw new Error('Could not parse AI response.');
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
