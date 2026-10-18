// Reports configuration state only. Never returns credentials or requests account data.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({error:"Method not allowed"}); }
  const providers = {
    OKX: Boolean(process.env.OKX_API_KEY && process.env.OKX_API_SECRET && process.env.OKX_API_PASSPHRASE),
    Bybit: Boolean(process.env.BYBIT_API_KEY && process.env.BYBIT_API_SECRET),
    Bitget: Boolean(process.env.BITGET_API_KEY && process.env.BITGET_API_SECRET && process.env.BITGET_API_PASSPHRASE),
    Binance: Boolean(process.env.BINANCE_API_KEY && process.env.BINANCE_API_SECRET),
    MEXC: Boolean(process.env.MEXC_API_KEY && process.env.MEXC_API_SECRET)
  };
  return res.status(200).json({
    checkedAt: new Date().toISOString(),
    providers: Object.entries(providers).map(([name, configured]) => ({name, configured, permissionMode:"read-only recommended"})),
    note:"Configured means only that required environment variables exist. It does not prove credentials are valid or account data is connected."
  });
}
