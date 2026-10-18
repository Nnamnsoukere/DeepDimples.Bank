// Read-only public P2P offer lookup. No order is created and no credentials are used.
const allowedAssets = new Set(["USDT", "USDC", "BTC"]);
const allowedSides = new Set(["BUY", "SELL"]);
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=60");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const asset = String(req.query.asset || "USDT").toUpperCase();
  const side = String(req.query.side || "BUY").toUpperCase();
  if (!allowedAssets.has(asset) || !allowedSides.has(side)) {
    return res.status(400).json({ error: "Unsupported asset or trade side" });
  }
  try {
    const url = new URL("https://www.binance.com/bapi/c2c/v1/public/c2c/agent/ad-list");
    url.searchParams.set("fiat", "NGN");
    url.searchParams.set("asset", asset);
    url.searchParams.set("tradeType", side);
    url.searchParams.set("limit", "10");
    const upstream = await fetch(url.toString(), {
      headers: { "Accept": "application/json", "User-Agent": "DeepDimplesBank/1.0" }
    });
    if (!upstream.ok) throw new Error("P2P provider returned " + upstream.status);
    const body = await upstream.json();
    const root = body && body.data;
    const rows = Array.isArray(root) ? root : Array.isArray(root?.data) ? root.data : Array.isArray(root?.list) ? root.list : [];
    const offers = rows.map((row) => {
      const ad = row.adv || row.ad || row;
      const trader = row.advertiser || row.user || {};
      const price = Number(ad.price ?? row.price);
      if (!Number.isFinite(price) || price <= 0) return null;
      const methods = ad.tradeMethods || ad.payTypes || ad.paymentMethods || [];
      return {
        trader: String(trader.nickName || trader.nickname || ad.nickName || "Marketplace advertiser").slice(0, 80),
        priceNGN: price,
        minNGN: Number(ad.minSingleTransAmount ?? ad.minAmount ?? row.minAmount) || null,
        maxNGN: Number(ad.maxSingleTransAmount ?? ad.maxAmount ?? row.maxAmount) || null,
        availableAsset: Number(ad.surplusAmount ?? ad.availableAmount ?? ad.quantity) || null,
        paymentMethods: Array.isArray(methods) ? methods.map(m => String(m.tradeMethodName || m.identifier || m.payType || m).slice(0, 40)).slice(0, 8) : [],
        online: trader.isOnline ?? ad.isOnline ?? null,
        offerId: String(ad.advNo || ad.id || ad.advId || "").slice(0, 100)
      };
    }).filter(Boolean).sort((a,b) => side === "BUY" ? a.priceNGN - b.priceNGN : b.priceNGN - a.priceNGN);
    return res.status(200).json({
      source: "Binance public C2C marketplace",
      fiat: "NGN",
      asset,
      side,
      fetchedAt: new Date().toISOString(),
      count: offers.length,
      offers,
      note: "Public offers can change or disappear. Verify the offer and payment terms on the exchange before acting."
    });
  } catch {
    return res.status(502).json({
      error: "P2P offers could not be retrieved from the public provider.",
      source: "Binance public C2C marketplace",
      fiat: "NGN",
      asset,
      side,
      fetchedAt: new Date().toISOString(),
      offers: []
    });
  }
}
