import { requireOwner } from "../lib/owner-session.js";
import crypto from "node:crypto";

function parseSignedReference(txRef, signingSecret) {
  if (typeof txRef !== "string" || !txRef.startsWith("ddb_")) return null;
  const raw = txRef.slice(4);
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = raw.slice(0, dot), signature = raw.slice(dot + 1);
  const expected = crypto.createHmac("sha256", signingSecret).update(payload).digest();
  let received;
  try { received = Buffer.from(signature, "base64url"); } catch { return null; }
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.amount || !data.currency || !data.email || !Number.isFinite(data.exp) || data.exp < Date.now()) return null;
    return data;
  } catch { return null; }
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ error: "Method not allowed" }); }
 if(!requireOwner(req,res))return;
  const secret = process.env.FLW_SECRET_KEY, signingSecret = process.env.APP_SIGNING_SECRET;
  if (!secret || !signingSecret) return res.status(503).json({ error: "Flutterwave verification is not configured." });
  const txRef = String(req.query.tx_ref || "");
  const transactionId = String(req.query.transaction_id || "");
  const expected = parseSignedReference(txRef, signingSecret);
  if (!expected || !/^\d{1,30}$/.test(transactionId)) return res.status(400).json({ status: "unverified", message: "Missing, invalid, or expired payment reference." });
  try {
    const response = await fetch("https://api.flutterwave.com/v3/transactions/" + encodeURIComponent(transactionId) + "/verify", {
      headers: { Authorization: "Bearer " + secret, Accept: "application/json" }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.status !== "success" || !body.data) return res.status(502).json({ status: "unverified", message: "Flutterwave could not verify this transaction. Refresh the activity status later." });
    const tx = body.data;
    const verified = tx.status === "successful" && String(tx.tx_ref) === txRef &&
      String(tx.currency).toUpperCase() === expected.currency &&
      Number(tx.amount) >= Number(expected.amount) &&
      String(tx.customer?.email || "").toLowerCase() === expected.email;
    return res.status(200).json({
      status: verified ? "successful" : (tx.status === "failed" ? "failed" : "pending"),
      verified,
      reference: txRef,
      currency: expected.currency,
      amount: verified ? Number(tx.amount) : Number(expected.amount),
      message: verified ? "Flutterwave verified the payment. This confirmation is not a stored account balance." : "Payment is not verified as successful yet. No balance has been credited."
    });
  } catch {
    return res.status(502).json({ status: "unverified", message: "Could not reach Flutterwave to verify this payment." });
  }
}
