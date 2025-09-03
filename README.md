# AI Customer Service Chatbot (Financial)

A professional, safe-by-default chatbot for a financial institution.

Highlights
- Human-centered interaction persona (tone, clarity, privacy, escalation).
- Safety filters: redact sensitive inputs, guardrails, rate limiting, Helmet.
- Clean architecture with pluggable LLM providers (OpenAI or mock).
- Minimal web UI for quick testing.

## Quick start

1) Install dependencies

```powershell
cd c:\laragon\www\ai_chatbot
npm install
```

2) Run in dev mode (mock provider by default)

```powershell
npm run dev
```
Open http://localhost:3000 in your browser.

3) Enable OpenAI
- Copy `.env.example` to `.env` and set `OPENAI_API_KEY`.
- Optionally set `OPENAI_MODEL`.
- Then run:

```powershell
npm run dev
```

## Notes
- The assistant doesn’t access accounts. It provides general information and next steps.
- Don’t paste sensitive data. The system attempts to redact, but avoid sharing secrets.
- For production, add persistent storage, auth, logging pipeline, and robust monitoring.
