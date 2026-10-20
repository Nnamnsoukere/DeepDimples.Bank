// Reports integration readiness only. Never returns keys or initiates money movement.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const hasSecret = Boolean(process.env.FLW_SECRET_KEY);
  const hasPublic = Boolean(process.env.FLW_PUBLIC_KEY);
  const hasWebhookHash = Boolean(process.env.FLW_SECRET_HASH);
  const baseUrl = process.env.APP_BASE_URL || "";
  const liveMode = hasSecret && !process.env.FLW_SECRET_KEY.includes("_TEST-");

  return res.status(200).json({
    provider: "Flutterwave",
    checkedAt: new Date().toISOString(),
    configured: hasSecret && hasPublic && hasWebhookHash && Boolean(baseUrl),
    credentialsPresent: { publicKey: hasPublic, secretKey: hasSecret, webhookSecret: hasWebhookHash, appBaseUrl: Boolean(baseUrl) },
    environment: hasSecret ? (liveMode ? "live-key-detected" : "test-or-unrecognized-key") : "not-configured",
    capabilities: {
      hostedCheckout: "not-enabled",
      paymentVerification: "not-enabled",
      bankPayouts: "not-enabled",
      stablecoinTransfers: "not-enabled"
    },
    safety: "This endpoint only checks whether environment variables exist. It does not validate credentials, prove account approval, or enable transactions."
  });
}
