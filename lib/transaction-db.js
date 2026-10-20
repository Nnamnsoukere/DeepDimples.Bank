import crypto from "node:crypto";

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Transaction storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  return { url: url.replace(/\/$/, ""), key };
}
async function rest(path, options = {}) {
  const { url, key } = config();
  const response = await fetch(url + "/rest/v1/" + path, {
    ...options,
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) {
    const error = new Error("Transaction storage request failed (" + response.status + ").");
    error.status = response.status;
    throw error;
  }
  return data;
}
export const newRequestId = () => crypto.randomUUID();
export const hashRequest = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function beginOperation(row) {
  const payload = { ...row, idempotency_key: row.idempotency_key || crypto.randomUUID() };
  const inserted = await rest("ddb_transactions?on_conflict=request_id&select=id,request_id,request_hash,idempotency_key,provider_reference,status,provider_id,kind,amount,currency,network,created_at", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify(payload)
  });
  if (Array.isArray(inserted) && inserted[0]) {
    if (inserted[0].request_hash !== row.request_hash) throw Object.assign(new Error("This request ID was already used for different transaction details."), { status: 409 });
    return { row: inserted[0], created: true };
  }
  const existing = await rest("ddb_transactions?request_id=eq." + encodeURIComponent(row.request_id) + "&select=id,request_id,request_hash,idempotency_key,provider_reference,status,provider_id,kind,amount,currency,network,created_at");
  if (!Array.isArray(existing) || !existing[0]) throw new Error("Could not confirm transaction request state. Do not retry with a new request ID until you check transaction history.");
  if (existing[0].request_hash !== row.request_hash) throw Object.assign(new Error("This request ID was already used for different transaction details."), { status: 409 });
  return { row: existing[0], created: false };
}
export async function updateOperation(id, patch) {
  const rows = await rest("ddb_transactions?id=eq." + encodeURIComponent(id) + "&select=id,request_id,provider_reference,status,provider_id,kind,amount,currency,network,created_at,updated_at", {
    method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch)
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}
export async function findOperation(providerId, reference) {
  if (providerId) {
    const rows = await rest("ddb_transactions?provider_id=eq." + encodeURIComponent(String(providerId)) + "&select=id,provider_reference,status,provider_id");
    if (Array.isArray(rows) && rows[0]) return rows[0];
  }
  if (reference) {
    const rows = await rest("ddb_transactions?provider_reference=eq." + encodeURIComponent(String(reference)) + "&select=id,provider_reference,status,provider_id");
    if (Array.isArray(rows) && rows[0]) return rows[0];
  }
  return null;
}
export async function listOperations(limit = 50) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  return await rest("ddb_transactions?select=id,kind,provider_reference,provider_id,status,amount,currency,network,recipient_address,account_last4,metadata,created_at,updated_at&order=created_at.desc&limit=" + safeLimit) || [];
}
export async function recordWebhookEvent(event) {
  const rows = await rest("ddb_webhook_events?on_conflict=event_key&select=id,event_key,processed_at,processing_error", {
    method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=representation" }, body: JSON.stringify(event)
  });
  if (Array.isArray(rows) && rows[0]) return { event: rows[0], duplicate: false };
  const existing = await rest("ddb_webhook_events?event_key=eq." + encodeURIComponent(event.event_key) + "&select=id,event_key,processed_at,processing_error");
  return { event: Array.isArray(existing) ? existing[0] : null, duplicate: true };
}
export async function markWebhookProcessed(id, error = null) {
  if (!id) return;
  await rest("ddb_webhook_events?id=eq." + encodeURIComponent(id), {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ processed_at: error ? null : new Date().toISOString(), processing_error: error ? String(error).slice(0, 500) : null })
  });
}
