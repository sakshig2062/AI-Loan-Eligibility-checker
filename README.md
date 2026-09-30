# Finwise · AI Loan Eligibility Checker

An educational personal-finance MVP for exploring a transparent loan-affordability estimate, credit-health signals, EMI schedules and practical financial guidance. It is a browser-first single-page application with an optional Python API for Claude and Google Sheets.

## Features

- Loan eligibility estimate with age, income, employment stability, credit score, current commitments, requested amount and term.
- Credit profile analysis with score bands, payment history, utilization, history length and inquiries.
- Live EMI, interest and total repayment calculations using the standard reducing-balance formula.
- Goal-based financial guide, generated locally by default. With a server-side Anthropic key, the application can request Claude guidance and falls back to local rules on any service failure.
- Optional server-side Google Sheets storage and retrieval. User-entered financial records are sensitive: configure the integration only in a controlled environment.
- Responsive navigation, inline validation, accessible result announcements, reduced-motion support and privacy disclosures.

## Stack and structure

- HTML5, CSS and JavaScript ES modules; Python 3.10+, FastAPI for optional server endpoints.
- `index.html`, `styles.css`, `app.js`: interface and orchestration.
- `frontend/modules/`: reusable calculations, validation, deterministic analyses, guidance and storage client.
- `backend/server.py`: optional Claude and Sheets API boundary.
- `requirements.txt`, `.env.example`: backend dependencies and configuration template.

## Run locally

Python 3.10 or newer is needed for the optional API server.

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python backend/server.py
```

Open `http://127.0.0.1:8000`. The financial calculators and local guidance work without external credentials. If Python dependencies are unavailable, serve the project root with any static HTTP server; modules require HTTP rather than `file://`. The optional integrations will then use their documented local fallback.

## Environment and integrations

Set values only in the untracked `.env` file. Never put a key or credential in browser code.

### Claude guidance

Set `ANTHROPIC_API_KEY` and, optionally, `ANTHROPIC_MODEL`. The server sends only the context fields submitted to the Money Guide endpoint. Do not submit account numbers, identity documents or other direct identifiers. The endpoint has input bounds, a 15-second provider timeout and a structured JSON response check. Missing configuration, network/provider errors, invalid responses and rate limits fall back to the local guide, clearly labelled “On-device guide”. The Claude API request may be subject to Anthropic's current terms and data controls; review those before enabling it for real users.

### Google Sheets

1. Create a Google Cloud service account and enable the Google Sheets API.
2. Create a spreadsheet with a `Records` tab and headings `timestamp`, `kind`, `payload` in row 1.
3. Share the sheet with the service account email as an editor.
4. Store the downloaded service-account JSON outside the public web root, set its path in `GOOGLE_SERVICE_ACCOUNT_FILE`, and set `GOOGLE_SHEET_ID`.

The backend appends timestamped, typed JSON records and offers a bounded read endpoint. Storage is off when configuration is missing. The client does not report a save unless the API confirms it. Restrict API access before deploying: this local MVP has no authentication or per-user authorization and must not be exposed as a public financial-record service.

## Transparent calculation methodology

### Loan estimate

This demo uses a 45% total-EMI-to-income guide, with requested EMI calculated at the user-entered illustrative rate. It estimates the principal that fits within `45% × monthly income − existing monthly EMI` over the requested term. The request is capped at the requested principal. The illustrative minimum income is ₹25,000; a hard stop is used below ₹15,000. Age 21–60 is a positive factor (18–69 can still be evaluated with a risk flag; 70+ is a hard stop). Credit score below 550 and existing commitments at/above available capacity are hard stops; below 650 and short employment history add risk. Salaried experience is assessed against 0.75 years; self-employed/contract against 1.5 years. Two or more risk factors result in “Review your borrowing plan.” These are example rules, not bank underwriting thresholds or a probability of approval.

### Credit analysis

Score bands: Excellent 800–900; Good 750–799; Fair 650–749; Needs improvement 300–649. The insight rules use payment history, a 30% utilization guide, five years of history and up to two recent inquiries. This is not a bureau score model; it has no access to a user's credit file.

### EMI

For principal `P`, monthly rate `r = annual percentage rate / 1200`, and `n = years × 12`, the monthly payment is `P × r × (1+r)^n / ((1+r)^n − 1)`. At zero interest it is `P / n`. Total interest is total payments minus principal. Intermediate values are not rounded; displayed rupee totals are rounded to whole rupees.

## Privacy and security

Calculations and local rules run in the browser. Inputs are not kept in local storage. Optional Claude guidance sends the guide fields to the configured backend/provider after the user requests a guide. Records are sent only to the optional backend when the server integration is enabled. In production, add authentication, explicit record-storage consent, CSRF/origin controls, retention/deletion workflows, HTTPS, request limits, monitoring and a privacy review before handling real financial information. Never log payloads or deploy service-account credentials with static assets.

## Verification

Run the built-in deterministic checks with `npm test` (Node.js 18 or newer). They cover EMI known values and edge cases, eligibility thresholds, credit bands and local guidance. For the browser, open the app at mobile and desktop widths and submit both valid and invalid values in each form. The project includes no browser automation dependency.

## Deployment

For a static-only deployment, publish the project root behind HTTPS on a static host. The calculations and local guidance work; Claude and Sheets endpoints will be unavailable and use their stated fallback. To deploy integrations, run the FastAPI service behind a TLS terminating reverse proxy, use a secrets manager for `.env` values/credentials, configure authentication and origin protections, and serve the built static files from a properly isolated web root. The local server is intentionally bound to `127.0.0.1`.

## Limitations and future work

This MVP has no lender offer data, bureau connection, account linkage, login, multi-user data isolation, authenticated record editing/deletion, deployment automation or browser-driven visual regression suite. Next improvements: explicit per-record consent and data deletion, authenticated user workspaces, audited lender rate sources, localization, an accessible chart view, backend rate limiting and CSRF protection, a real browser test suite, and privacy/security review before any real-data launch.
