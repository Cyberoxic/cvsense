# Cvsense

AI-powered resume analysis. 100% free via Groq API.

---

## Project Structure

```
resume-analyzer-groq/
├── index.html   ← markup (loads PDF.js from CDN)
├── style.css    ← all styling
├── app.js       ← PDF text extraction + Groq API calls
└── README.md
```

---

## How It Works

1. **PDF.js** (free, open-source) extracts all text from your resume PDF in the browser
2. That text is sent to **Groq's free API** with the job requirements
3. **GPT OSS 120B** (running on Groq) returns a structured JSON analysis
4. The app renders the results — score, verdict, issues, keywords, ATS scores

---

## How to Run

### Option A — visit [CVsense](https://cvsense.netlify.app/) (recommended)

### Option B — VS Code Live Server (recommended)
1. Open the `resume-analyzer-groq` folder in VS Code
2. Install **Live Server** extension (by Ritwick Dey)
3. Right-click `index.html` → **Open with Live Server**

### Option C — Just open the file
Double-click `index.html` in Chrome, Edge, or Firefox.

---

## Getting Your Free Groq API Key

1. Go to https://console.groq.com
2. Sign up with Google or GitHub (free, no credit card)
3. Go to **API Keys** → **Create API Key**
4. Copy the key (starts with `gsk_...`)
5. Paste it into the **Groq API Key** field in the app

---

## Free Tier Limits (Groq)

| Model               | Requests/min | Tokens/min  | Requests/day |
|---------------------|--------------|-------------|--------------|
| gpt-oss-120b        | 30           | 8,000       | 1,000        |

More than enough for personal use.

---

## Why Groq Instead of Gemini?

- No quota activation issues
- Faster responses (Groq uses custom AI chips)
- No billing setup required at all
- GPT OSS 120B is a powerful open-weight model

---

## Tech Stack

| Tool        | Purpose                        | Cost  |
|-------------|--------------------------------|-------|
| HTML/CSS/JS | UI — zero frameworks           | Free  |
| PDF.js      | Extract text from PDF          | Free  |
| Groq API    | AI analysis (GPT OSS 120B)     | Free  |

---

## Limitations

- Cannot read **scanned/image-based PDFs** (PDF.js extracts text only)
  - Fix: Use a text-based PDF resume, not a scanned photo
- Groq free tier has a daily limit of 1,000 requests

