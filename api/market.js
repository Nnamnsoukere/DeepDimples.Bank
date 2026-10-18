// Public, read-only market-data proxy. No API key or private credentials are used.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=45");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const symbols = encodeURIComponent(JSON.stringify(["BTCUSDT", "ETHUSDT", "SOLUSDT", "USDCUSDT"]));
    const upstream = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbols=" + symbols, {
      headers: { "Accept": "application/json" }
    });
    if (!upstream.ok) throw new Error("Market provider returned " + upstream.status);
    const rows = await upstream.json();
    const mapped = {};
    for (const row of rows) {
      const symbol = row.symbol === "USDCUSDT" ? "USDT" : row.symbol.replace("USDT", "");
      mapped[symbol] = {
        price: Number(row.lastPrice),
        change24h: Number(row.priceChangePercent),
        sourceSymbol: row.symbol
      };
    }
    return res.status(200).json({
      source: "Binance public spot ticker",
      fetchedAt: new Date().toISOString(),
      assets: mapped
    });
  } catch (error) {
    return res.status(502).json({ error: "Public market feed temporarily unavailable" });
  }
}
