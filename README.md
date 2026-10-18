# DeepDimples Bank — personal crypto dashboard

A private, mobile-first personal crypto control panel deployed through GitHub and Vercel. It is **not a regulated bank** and does not custody funds.

## Current implementation
- Responsive dark-first dashboard with a light appearance option
- Local nickname and profile-image preference
- Public spot-market ticker via `/api/market` (no API key); prices are indicative market data, not executable quotes
- NGN P2P offer lookup via `/api/p2p`, with a direct exchange link when live retrieval fails
- Exchange configuration-status endpoint at `/api/connections`; it reports whether server environment variables exist, not whether credentials work
- Baseline security response headers in `vercel.json`

## Not yet connected
- Authenticated wallet balances and transaction history
- Exchange account balances and histories (OKX, Bybit, Bitget, Binance, MEXC)
- Wallet signing, transfers, swaps, bank cash-outs, or card issuance
- Confirmed multi-exchange P2P comparison
- Live chat or voice

Do not present disconnected features as working. The Vercel deployment marked Ready only means deployment completed successfully; runtime behavior must still be tested.

## Exchange credential setup
If you choose to connect exchange accounts, create **read-only** API keys only. Do not enable trading, withdrawals, transfers, or universal permissions. Store keys in Vercel Project Settings → Environment Variables, scoped to the intended environment; never paste them into chat, client-side JavaScript, or GitHub source. Use a separate key per exchange, restrict IPs if supported, and revoke a key immediately if exposed. Never enter a wallet recovery phrase into this app.

Environment-variable names checked by `/api/connections`:
- OKX: `OKX_API_KEY`, `OKX_API_SECRET`, `OKX_API_PASSPHRASE`
- Bybit: `BYBIT_API_KEY`, `BYBIT_API_SECRET`
- Bitget: `BITGET_API_KEY`, `BITGET_API_SECRET`, `BITGET_API_PASSPHRASE`
- Binance: `BINANCE_API_KEY`, `BINANCE_API_SECRET`
- MEXC: `MEXC_API_KEY`, `MEXC_API_SECRET`

Presence of these variables does **not** mean an integration has been tested. Account endpoints must be implemented and validated before account information is shown.

## Deployment
The project is linked to Vercel through the GitHub repository. Commits to the default branch should trigger a deployment. Confirm deployment state and test the app and API endpoints after each change.

## Safety principles
- No seed phrases or private keys in the app or source repository.
- Never fabricate balances, transaction history, market prices, or P2P offers.
- Verify exchange API documentation and terms before using an endpoint.
- Test with read-only access before enabling any financial action.
- Real cash-outs and cards require an eligible external provider and any approvals it requires.
