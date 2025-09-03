# AI Customer Service Chatbot (Financial)

A professional, safe-by-default chatbot for a financial institution.

## Highlights

- Human-centered interaction persona (tone, clarity, privacy, escalation)
- Safety filters: redact sensitive inputs, guardrails, rate limiting, Helmet
- Clean architecture with pluggable LLM providers (OpenAI or mock)
- Minimal web UI for quick testing

## Quick Start

### 1. Install dependencies

```bash
cd c:\laragon\www\ai_chatbot
npm install
```

### 2. Run in dev mode (mock provider by default)

```bash
npm run dev
```

Open <http://localhost:3000> in your browser.

### 3. Enable OpenAI

- Copy `.env.example` to `.env` and set `OPENAI_API_KEY`
- Optionally set `OPENAI_MODEL`
- Then run:

```bash
npm run dev
```

## Deployment

### Automated Deployment

This project includes automated CI/CD deployment:

1. **Push to GitHub** automatically triggers deployment
2. **GitHub Actions** runs tests and builds
3. **Render** automatically deploys if tests pass

#### Quick Deploy Commands

```bash
# Add, commit, and push in one go
git add .
git commit -m "your commit message"
git push origin main

# Or use PowerShell script
powershell -ExecutionPolicy Bypass -File deploy.ps1 -CommitMessage "your message"
```

## Project Structure

```text
ai_chatbot/
├── src/
│   ├── core/           # Core types and validation
│   ├── hci/            # Human-Computer Interaction (persona, safety, templates)
│   ├── knowledge/      # Knowledge base management
│   ├── providers/      # LLM providers (OpenAI, mock)
│   ├── services/       # Chat service logic
│   └── index.ts        # Main server entry point
├── public/             # Static web files
├── data/               # Knowledge base data
├── test/               # Test files
└── .github/workflows/  # CI/CD automation
```

## Scripts

- `npm run dev` - Start development server with TypeScript
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run production server
- `npm test` - Run test suite
- `npm run typecheck` - Type check without building

## Notes

- The assistant doesn't access accounts. It provides general information and next steps
- Don't paste sensitive data. The system attempts to redact, but avoid sharing secrets
- For production, add persistent storage, auth, logging pipeline, and robust monitoring
