import { requireOwner } from "../lib/owner-session.js";
import { listOperations } from "../lib/transaction-db.js";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).end(); }
  if (!requireOwner(req, res)) return;
  try {
    const transactions = await listOperations(req.query?.limit);
    return res.status(200).json({ transactions });
  } catch {
    return res.status(503).json({ error: "Transaction history is unavailable. Check database configuration." });
  }
}
