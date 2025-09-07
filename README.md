# AI Customer Service Chatbot (Financial)

A professional, safe-by-default chatbot for a financial institution.

## Highlights

- Human-centered interaction persona (tone, clarity, privacy, escalation)
- Safety filters: redact sensitive inputs, guardrails, rate limiting, Helmet
- Clean architecture with pluggable LLM providers (OpenAI or mock)
- Minimal web UI for quick testing
- Human handover with escalation heuristics, rate limiting, and optional notifications

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

### 4. Enable Text‑to‑Speech (Twi/Akan)

There are two ways to get audio replies:

1. Azure Speech (recommended, higher quality)

	 - Copy `.env.example` to `.env` and set:
		 - `AZURE_SPEECH_KEY`
		 - `AZURE_SPEECH_REGION` (or `AZURE_SPEECH_ENDPOINT`)
		 - `AZURE_SPEECH_VOICE` (e.g., `en-GH-AkuaNeural` or `en-GH-AmaNeural`)
	 - Start the server and in the web UI enable Voice, set Language = Twi

2. Keyless fallback (Windows): eSpeak NG

	- Install via Chocolatey: `choco install espeak-ng -y`
	- The backend auto-uses eSpeak NG if no cloud keys are set
	- Some Windows builds don’t include a Twi/Akan voice; in that case, it will fall back to Ghanaian English (en‑GB/en)

Verify locally (PowerShell):

```powershell
# With server running on :3000
$body = @{ text = 'Akwaaba! Welcome to the bank.'; lang = 'twi' } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3000/api/tts -Method POST -ContentType 'application/json' -Body $body -OutFile .\tts_resp.mp3
```

Open `tts_resp.mp3` to confirm audio output.

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

## Human Handover

When the bot cannot resolve an issue (based on an unresolved streak or when the user asks to speak to a person), it shows a “Talk to a person” button and an inline form. Submissions are sent to `/api/handover`.

### Frontend validation

- Basic Ghana phone check: accepts `0XXXXXXXXX` or `+233XXXXXXXXX` (spaces/dashes ignored).

### Backend protections

- Global rate limit plus per-endpoint limiter for `/api/handover` (default 5/min per IP). Configure via `HANDOVER_RATE_MAX` in `.env`.

### Notifications (optional)

Enable one or more notification channels via environment variables:

- Webhook: `HANDOVER_WEBHOOK_URL` (receives JSON payload per request)
- Ticketing webhook (generic): `TICKETING_WEBHOOK_URL`
- Email via SMTP: set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `HANDOVER_EMAIL_TO`
- SMS via Twilio: set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`, and recipient lists `HANDOVER_SMS_TO` or `ESCALATION_SMS_TO`
- SMS via SMSOnlineGH (preferred local): set `SMSONLINEGH_KEY`, `SMSONLINEGH_SENDER` (optional `SMSONLINEGH_URL`); takes precedence over Twilio when configured
	- Recipients are automatically merged as: all branch phone numbers + `HANDOVER_SMS_TO`/`ESCALATION_SMS_TO` + `EXTRA_SMS_RECIPIENTS` (deduplicated)

Example `.env` excerpt:

```env
HANDOVER_RATE_MAX=5

# Webhooks
HANDOVER_WEBHOOK_URL=https://hooks.example.com/handover
TICKETING_WEBHOOK_URL=https://tickets.example.com/create

# Email via SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=secret
SMTP_FROM=chatbot@example.com
HANDOVER_EMAIL_TO=support@example.com

# SMS via Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_FROM=+1234567890
HANDOVER_SMS_TO=+23324XXXXXXX,+23320YYYYYYY
ESCALATION_SMS_TO=+23324ZZZZZZZ

# Extra recipients merged into all SMS (comma-separated). Branch phone numbers are included automatically
EXTRA_SMS_RECIPIENTS=0243082750,0248862932,0246892797,0242312059

# SMS via SMSOnlineGH (preferred local)
SMSONLINEGH_KEY=your_api_key
SMSONLINEGH_SENDER=YOUR_SENDER_NAME
# Optional override (defaults to v5 endpoint shown below)
# SMSONLINEGH_URL=https://api.smsonlinegh.com/v5/message/sms/send

# Escalation notifications
NOTIFY_ON_ESCALATION=true
ESCALATION_WEBHOOK_URL=https://hooks.example.com/escalation
```

If none are configured, the server logs each request with a `ticketId` and returns `{ ok: true, status: 'queued' }`.

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
