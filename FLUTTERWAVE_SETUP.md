# Flutterwave integration in DeepDimples Bank

This branch implements a first pass of Flutterwave-hosted fiat checkout, server-side checkout verification, V4 stablecoin transfers, transfer status lookup, configured receive-address display, and an NGN bank payout form.

## Vercel environment variables

Set them in Vercel Project → Settings → Environment Variables. Do not put secret keys into HTML or app.js, and never commit their values to GitHub.

### Owner-only access (required)
- `APP_ACCESS_PASSWORD`: a strong, unique password for your private workspace.
- `APP_SESSION_SECRET`: a long random server-only secret used to sign eight-hour HttpOnly session cookies.

### Hosted checkout and transaction verification (Flutterwave Standard / V3 API)
- `FLW_PUBLIC_KEY`: your Flutterwave public key (not exposed by this server code).
- `FLW_SECRET_KEY`: your Flutterwave secret key, test key first.
- `FLW_SECRET_HASH`: webhook secret hash, reserved for webhook verification implementation.
- `APP_BASE_URL`: canonical HTTPS site URL.
- `APP_SIGNING_SECRET`: long random server-only string used to sign checkout references.

### V4 stablecoin transfers and bank payouts
- `FLW_CLIENT_ID`: Flutterwave V4 client ID.
- `FLW_CLIENT_SECRET`: Flutterwave V4 client secret.
- `FLW_V4_ENV`: set to `sandbox` while testing; use `live` only after account/product approval and end-to-end tests.
- `FLW_V4_BASE_URL`: optional explicit API base URL; normally omit and let `FLW_V4_ENV` choose. Sandbox default is `https://developersandbox-api.flutterwave.com`; live default is `https://api.flutterwave.com`.
- `APP_TRANSACTION_PIN`: a strong private PIN/password required for outbound stablecoin transfers, NGN payouts, and viewing configured receive addresses. This is a basic guard, not a substitute for proper owner authentication, rate limiting, and step-up authentication.
- Optional receive addresses copied from your verified Flutterwave dashboard: `FLW_RECEIVE_SOLANA_USDC`, `FLW_RECEIVE_SOLANA_USDT`, `FLW_RECEIVE_ETHEREUM_USDC`, `FLW_RECEIVE_ETHEREUM_USDT`, `FLW_RECEIVE_ETHEREUM_RLUSD`, `FLW_RECEIVE_BASE_USDC`, `FLW_RECEIVE_POLYGON_USDC`, `FLW_RECEIVE_POLYGON_USDT`.

## Current UI flows
- Quick action **Send** opens stablecoin transfer form.
- Quick action **Receive** displays only the receive addresses explicitly configured in Vercel.
- Quick action **Cash out** opens the NGN bank payout form.
- Service card **Flutterwave** opens hosted checkout.
- Checkout return is verified against Flutterwave's transaction verification API. A verified checkout is not shown as a spendable app balance because this repository still has no durable owner ledger or transaction database.

## Supported stablecoin network/token combinations
- Solana: USDT, USDC
- Ethereum: USDT, USDC, RLUSD
- Base: USDC
- Polygon: USDT, USDC

The transfer API uses Flutterwave V4 client credentials and the V4 `/direct-transfers` and `/transfers/{id}` endpoints. Bank payout in this initial UI supports NGN and expects a 10-digit account number plus a three-digit Flutterwave bank code. Check account-specific eligibility, limits, fees, whitelisted IPs, and current documentation before live use.

## Before public production launch
This project currently deploys as a public static website with an owner-password gate and signed HttpOnly session cookie. Before handling real funds, add rate limiting and abuse monitoring, a persistent database ledger, stable idempotency keys stored per operation, verified webhook handling, audit logs, backup/recovery, and end-to-end tests in Flutterwave sandbox. The transaction PIN is an additional step-up check, not a replacement for the owner session. Do not treat a checkout redirect or transfer submission response as settlement. Stablecoin transfers are irreversible; confirm network, token and recipient address before sending.
