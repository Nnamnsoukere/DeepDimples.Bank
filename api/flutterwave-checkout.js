import crypto from "node:crypto";

const ALLOWED_CURRENCIES = new Set(["NGN", "USD", "GBP", "EUR"]);
const json = (res, status, body) => res.status(status).json(body);
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return json(res, 405, { error: "Method not allowed" }); }
  const secret = process.env.FLW_SECRET_KEY;
  const baseUrl = process.env.APP_BASE_URL;
  const signingSecret = process.env.APP_SIGNING_SECRET;
  if (!secret || !baseUrl || !signingSecret) return json(res, 503, { error: "Flutterwave checkout is not configured. Set FLW_SECRET_KEY, APP_BASE_URL, and APP_SIGNING_SECRET in Vercel." });
  const { amount, currency, email, name } = req.body || {};
  const value = Number(amount);
  const code = String(currency || "NGN").toUpperCase();
  if (!Number.isFinite(value) || value <= 0 || value > 100000000 || !/^\d+(\.\d{1,2})?$/.test(String(amount))) return json(res, 400, { error: "Enter a valid amount with up to two decimal places." });
  if (!ALLOWED_CURRENCIES.has(code)) return json(res, 400, { error: "That checkout currency is not enabled in this integration yet." });
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return json(res, 400, { error: "Enter a valid email address for the payment receipt." });
  const customerName = typeof name === "string" ? name.trim().slice(0, 100) : "";
  const payload = Buffer.from(JSON.stringify({ amount: value.toFixed(2), currency: code, email: email.toLowerCase(), exp: Date.now() + 30 * 60 * 1000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", signingSecret).update(payload).digest("base64url");
  const txRef = "ddb_" + payload + "." + signature;
  try {
    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: { Authorization: "Bearer " + secret, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        tx_ref: txRef, amount: value.toFixed(2), currency: code,
        redirect_url: baseUrl.replace(/\/$/, "") + "/?flw_return=1",
        customer: { email: email.toLowerCase(), ...(customerName ? { name: customerName } : {}) },
        customizations: { title: "DeepDimples Bank", description: "Personal account funding" }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.status !== "success" || typeof data.data?.link !== "string" || !data.data.link.startsWith("https://checkout.flutterwave.com/")) {
      return json(res, 502, { error: "Flutterwave could not create checkout. Check your account, enabled payment methods, and server logs." });
    }
    return json(res, 200, { checkoutUrl: data.data.link, tx_ref: txRef });
  } catch {
    return json(res, 502, { error: "Could not reach Flutterwave. Please try again." });
  }
}
