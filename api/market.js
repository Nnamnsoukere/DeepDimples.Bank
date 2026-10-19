// Public, read-only market-data proxy. No API key or private credentials are used.
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "USDCUSDT"];

async function fetchJson(url, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {headers: {"Accept":"application/json"}, signal: controller.signal});
    if (!response.ok) throw new Error("Provider HTTP " + response.status);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function binancePrices() {
  const symbols = encodeURIComponent(JSON.stringify(SYMBOLS));
  const rows = await fetchJson("https://api.binance.com/api/v3/ticker/24hr?symbols=" + symbols);
  const assets = {};
  for (const row of rows) {
    const symbol = row.symbol;
    const price = Number(row.lastPrice);
    const change = Number(row.priceChangePercent);
    if (!Number.isFinite(price) || price <= 0) continue;
    if (symbol === "BTCUSDT" || symbol === "ETHUSDT" || symbol === "SOLUSDT") {
      assets[symbol.slice(0, -4)] = {price, change24h:Number.isFinite(change) ? change : 0, sourceSymbol:symbol};
    } else if (symbol === "USDCUSDT") {
      // USDC is quoted in USDT. Its inverse is a reasonable public-market estimate for USDT in USD.
      assets.USDT = {price:1 / price, change24h:Number.isFinite(change) ? -change : 0, sourceSymbol:symbol, note:"Estimated from inverse USDC/USDT spot price"};
    }
  }
  if (!["BTC","ETH","SOL","USDT"].every(k => assets[k])) throw new Error("Incomplete Binance market response");
  return {source:"Binance public spot ticker", assets};
}

async function coinbasePrices() {
  const products = [
    ["BTC","BTC-USD"], ["ETH","ETH-USD"], ["SOL","SOL-USD"], ["USDT","USDT-USD"]
  ];
  const pairs = await Promise.all(products.map(async ([asset, product]) => {
    const stats = await fetchJson("https://api.exchange.coinbase.com/products/" + product + "/stats");
    const price = Number(stats.last);
    const open = Number(stats.open);
    if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid Coinbase price for " + asset);
    return [asset, {price, change24h:Number.isFinite(open) && open > 0 ? ((price-open)/open)*100 : 0, sourceSymbol:product}];
  }));
  return {source:"Coinbase Exchange public 24h stats", assets:Object.fromEntries(pairs)};
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=45");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({error:"Method not allowed"}); }
  try {
    let result;
    try { result = await binancePrices(); }
    catch { result = await coinbasePrices(); }
    return res.status(200).json({...result, fetchedAt:new Date().toISOString()});
  } catch {
    return res.status(502).json({error:"Public market feed temporarily unavailable", hint:"Both public market providers failed. Retry shortly."});
  }
}
