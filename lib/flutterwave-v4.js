import crypto from "node:crypto";

export const apiBase = () => process.env.FLW_V4_BASE_URL || (process.env.FLW_V4_ENV === "live" ? "https://api.flutterwave.com" : "https://developersandbox-api.flutterwave.com");
export const idempotencyHeaders = (key) => ({
  "X-Trace-Id": crypto.randomUUID(),
  "X-Idempotency-Key": key || crypto.randomUUID()
});
export async function getAccessToken() {
  const clientId = process.env.FLW_CLIENT_ID;
  const clientSecret = process.env.FLW_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing FLW_CLIENT_ID or FLW_CLIENT_SECRET.");
  const response = await fetch("https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) throw new Error("Flutterwave API authentication failed. Check the V4 credentials and environment.");
  return body.access_token;
}
export function transactionPinValid(req) {
  const expected = process.env.APP_TRANSACTION_PIN;
  const supplied = req.headers["x-transaction-pin"];
  if (!expected || typeof supplied !== "string") return false;
  const a = Buffer.from(expected), b = Buffer.from(supplied);
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}
export async function flwRequest(path, options = {}) {
  const { idempotencyKey, headers: extraHeaders, ...fetchOptions } = options;
  const token = await getAccessToken();
  const response = await fetch(apiBase() + path, {
    ...fetchOptions,
    headers: { Authorization: "Bearer " + token, Accept: "application/json", ...(fetchOptions.body ? { "Content-Type": "application/json" } : {}), ...idempotencyHeaders(idempotencyKey), ...(extraHeaders || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.status !== "success") {
    const error = new Error(body.message || "Flutterwave request failed.");
    error.status = response.status;
    throw error;
  }
  return body.data;
}
