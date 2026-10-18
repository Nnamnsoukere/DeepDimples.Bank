# DeepDimples Bank — visual refresh

This is the refreshed static front-end for the DeepDimples Bank dashboard, styled to match the user's supplied black/charcoal mobile banking reference.

## Included
- Responsive mobile-first dark banking interface
- Black background, charcoal cards, white typography, restrained multicolour accents
- Wallet overview with currency display selector (illustrative values only)
- Search/filter interaction, hide-balance toggle, light/dark appearance toggle
- Quick action cards, market watch layout, transaction empty state, NGN P2P panel
- Bottom navigation and PWA manifest

## Important limitations
This is a front-end preview. It does **not** connect to a real bank account, wallet, exchange, card issuer, transfer, cash-out, live price feed, or P2P feed. Displayed wallet values are sample data. Do not treat them as funds held by the user.

No seed phrases, private keys, or API secrets should ever be added to these static files or committed to GitHub.

## Deploy
Upload `index.html`, `styles.css`, `app.js`, `manifest.json`, and `README.md` to the root of the existing GitHub repository. Vercel should redeploy automatically after the commit.
