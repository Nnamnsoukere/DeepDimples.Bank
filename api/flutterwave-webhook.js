import crypto from "node:crypto";
import { findOperation, recordWebhookEvent, updateOperation, markWebhookProcessed } from "../lib/transaction-db.js";

const finalStatuses = new Set(["SUCCESSFUL", "FAILED", "REVERSED"]);
function normalizedStatus(value) {
  const s = String(value || "").toUpperCase();
  if (["SUCCESSFUL", "SUCCESS", "COMPLETED"].includes(s)) return "SUCCESSFUL";
  if (["FAILED", "FAILURE", "REJECTED"].includes(s)) return "FAILED";
  if (["REVERSED", "REFUNDED"].includes(s)) return "REVERSED";
  if (["PENDING", "PROCESSING", "NEW", "QUEUED"].includes(s)) return s === "PROCESSING" || s === "QUEUED" ? "PENDING" : s;
  return null;
}
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).end(); }
  const expected = process.env.FLW_SECRET_HASH;
  if (!expected || !safeEqual(String(req.headers["verif-hash"] || ""), expected)) return res.status(401).json({ error: "Invalid webhook signature." });
  const body = req.body || {};
  const data = body.data || body;
  const providerId = data.id || data.transfer_id || data.transaction_id || null;
  const reference = data.reference || data.tx_ref || null;
  const eventKey = String(body.id || data.id || data.transfer_id || data.transaction_id || reference || "");
  if (!eventKey) return res.status(400).json({ error: "Missing event identifier." });
  let event;
  try {
    const recorded = await recordWebhookEvent({ event_key: eventKey, event_type: String(body.type || body.event || "unknown"), provider_id: providerId ? String(providerId) : null, payload: body });
    event = recorded.event;
    if (recorded.duplicate && event?.processed_at) return res.status(200).json({ received: true, duplicate: true });
    if (recorded.duplicate && event?.processing_error) {
      // A previous processing attempt failed; retry processing this event.
    } else if (recorded.duplicate && !event) {
      return res.status(503).json({ error: "Webhook could not be persisted." });
    }
    const tx = await findOperation(providerId, reference);
    if (tx) {
      const incoming = normalizedStatus(data.status || data.transfer_status);
      const current = String(tx.status || "").toUpperCase();
      // Do not downgrade a terminal state due to delayed events.
      if (incoming && !(finalStatuses.has(current) && !finalStatuses.has(incoming))) {
        await updateOperation(tx.id, { status: incoming, provider_id: providerId ? String(providerId) : tx.provider_id, provider_payload: body });
      }
    }
    await markWebhookProcessed(event?.id);
    return res.status(200).json({ received: true });
  } catch (e) {
    try { if (event?.id) await markWebhookProcessed(event.id, e.message); } catch {}
    return res.status(503).json({ error: "Webhook processing could not be completed; Flutterwave may retry." });
  }
}
