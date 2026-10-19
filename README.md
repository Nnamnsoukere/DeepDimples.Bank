# DeepDimples Bank — personal crypto dashboard

DeepDimples Bank is a private, mobile-first personal crypto dashboard. It is **not a regulated bank, custodian, or payment institution**. The selected architecture is **hybrid self-custody plus read-only exchange connections**. Real-money actions remain disabled until the relevant provider, security, and production tests pass.

## Release audit — current verified scope

| Capability | Current state | What is still required |
|---|---|---|
| Responsive dashboard, dark/light appearance, local profile preference | Implemented in the front end | Browser/device regression tests |
| Public spot prices for BTC, ETH, SOL and USDT | API implemented with Binance/Coinbase fallback | Production endpoint and freshness checks |
| NGN P2P provider directory for OKX, Bybit and Bitget | Provider links and access caveats only; **no live offers or in-app rates** | Eligible provider/merchant API access, compliant endpoint, verified offer parsing and live tests |
| Exchange connection status | Configuration-presence check only | Read-only account endpoints, signature/authentication tests, permissions audit and sanitized error handling |
| Self-custody wallet connection and address display | Not implemented | Wallet adapter, supported-chain/network validation, signing through wallet provider and device tests |
| Exchange balances and transaction history | Not implemented | Read-only keys entered only through Vercel environment settings, provider-specific signed API clients and production verification |
| Send, swaps/conversions, bank cash-outs | Not enabled | Explicit wallet signing or authorized provider integration, risk controls, transaction confirmation and end-to-end tests |
| Debit card | Not implemented | Eligible card issuer/processor onboarding, KYC/eligibility where required, issuer APIs and authorization tests |
| Live chat/voice | Not implemented | Selected service, privacy/security configuration and end-to-end tests |

**Important:** a Vercel deployment state of READY confirms that Vercel completed a deployment; it does not confirm that API routes work, exchange credentials are valid, balances are connected, or money can move.

## Current API behavior

- GET /api/market returns public indicative market prices; these are not wallet balances or executable quotes.
- GET /api/p2p?asset=USDT&side=SELL (also supports USDC/BTC and BUY/SELL) returns a provider directory with **zero asserted offers** until verified provider access is available. The dashboard must not fabricate P2P rates.
- GET /api/connections reports whether expected environment variables exist. It does **not** authenticate with exchanges or read balances.

## Exchange credentials — read-only only

If you decide to connect existing exchange accounts, create **read-only** API keys only. Do not enable trading, withdrawals, transfers, or universal permissions. Store keys in Vercel Project Settings → Environment Variables, scoped to the intended environment. Never paste keys into chat, client-side JavaScript, or GitHub source. Use a separate key per exchange, restrict IPs if supported, and revoke any exposed key immediately. Never enter a wallet recovery phrase or private key into this app or share it in chat.

Environment-variable names currently checked by /api/connections:
- OKX: OKX_API_KEY, OKX_API_SECRET, OKX_API_PASSPHRASE
- Bybit: BYBIT_API_KEY, BYBIT_API_SECRET
- Bitget: BITGET_API_KEY, BITGET_API_SECRET, BITGET_API_PASSPHRASE
- Binance: BINANCE_API_KEY, BINANCE_API_SECRET
- MEXC: MEXC_API_KEY, MEXC_API_SECRET

Presence of these variables does **not** prove a key is valid, read-only, or connected. Account endpoints must be implemented and validated before account information is shown. Never expose secret values in logs or API responses.

## Deployment and production acceptance checklist

1. Confirm the latest intended Git commit has a successful production deployment and the production alias points to it.
2. Smoke-test the homepage and all API routes on the deployed URL; check status codes, JSON schema, CORS/cache behavior, security headers, and error handling.
3. Verify public market prices against provider responses and ensure timestamps/freshness are honest.
4. Confirm P2P shows no invented offers and links open the correct asset, fiat and trade side.
5. Test exchange integrations with separately created read-only keys; verify permissions and returned account identity without exposing secrets.
6. Test wallet connection and chain/network mismatch handling without asking for seed phrases.
7. Keep send/swap/withdraw/card actions unavailable until a supported provider is authorized and a full end-to-end test succeeds.
8. Run mobile Safari, accessibility, dependency, and security checks; review production runtime logs and errors.

The current Vercel integration can confirm deployment metadata, but production runtime error/log access may be blocked by account scope. When that happens, the runtime audit is **unverified**, not passed.

## Safety principles

- Never invent balances, transactions, executable quotes, or P2P offers.
- Do not store recovery phrases/private keys in the app or on a server.
- Do not label configuration presence as a successful connection.
- Do not enable real-money operations until provider authorization, permission checks, risk controls and production tests pass.
- External cash-outs and debit cards require an eligible provider and any onboarding, identity, legal or geographic approvals it requires.
