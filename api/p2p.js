// DeepDimples Bank NGN P2P provider directory.
// Official provider APIs are merchant-gated; this endpoint deliberately does not invent public offers.
const allowedAssets = new Set(["USDT", "USDC", "BTC"]);
const allowedSides = new Set(["BUY", "SELL"]);
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
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
  const action = side === "BUY" ? "buy" : "sell";
  const providers = [
    {
      id: "okx",
      name: "OKX P2P",
      status: "merchant_api_access_required",
      message: "Automated P2P API access is restricted to eligible merchants. Public offers have not been verified by this dashboard.",
      url: "https://www.okx.com/p2p-markets/ngn/" + action + "-" + asset.toLowerCase()
    },
    {
      id: "bybit",
      name: "Bybit P2P",
      status: "advertiser_api_access_required",
      message: "Bybit's official P2P ad API requires advertiser status. Public offers have not been verified by this dashboard.",
      url: "https://www.bybit.com/fiat/trade/otc/?actionType=" + (side === "BUY" ? "1" : "0") + "&token=" + encodeURIComponent(asset) + "&fiat=NGN"
    },
    {
      id: "bitget",
      name: "Bitget P2P",
      status: "verified_merchant_api_access_required",
      message: "Bitget's P2P API requires verified-merchant status and P2P API permissions. Public offers have not been verified by this dashboard.",
      url: "https://www.bitget.com/p2p-trade?fiat=NGN&coin=" + encodeURIComponent(asset)
    }
  ];
  return res.status(200).json({
    fiat: "NGN",
    asset,
    side,
    fetchedAt: new Date().toISOString(),
    source: "Official provider access-status directory",
    count: 0,
    offers: [],
    providers,
    note: "No live offers are shown until a provider feed can be accessed and verified. Open a provider to see its current marketplace."
  });
}
