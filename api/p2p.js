// Read-only public Binance P2P offer lookup. No order is created and no credentials are used.
const allowedAssets = new Set(["USDT", "USDC", "BTC"]);
const allowedSides = new Set(["BUY", "SELL"]);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=60");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({error:"Method not allowed"});
  }
  const asset = String(req.query.asset || "USDT").toUpperCase();
  const side = String(req.query.side || "BUY").toUpperCase();
  if (!allowedAssets.has(asset) || !allowedSides.has(side)) {
    return res.status(400).json({error:"Unsupported asset or trade side"});
  }

  try {
    // Binance's public C2C ad-list endpoint expects a JSON POST body, not query-string GET parameters.
    const upstream = await fetch("https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search", {
      method:"POST",
      headers:{
        "Accept":"application/json",
        "Content-Type":"application/json",
        "User-Agent":"Mozilla/5.0 DeepDimplesBank/1.0"
      },
      body:JSON.stringify({
        page:1,
        rows:10,
        payTypes:[],
        countries:[],
        publisherType:null,
        asset,
        fiat:"NGN",
        tradeType:side,
        transAmount:"",
        proMerchantAds:false,
        shieldMerchantAds:false,
        filterType:"all",
        periods:[],
        additionalKycVerifyFilter:false,
        classifies:["mass","profession"]
      }),
      signal:AbortSignal.timeout(9000)
    });
    if (!upstream.ok) throw new Error("P2P provider returned HTTP " + upstream.status);
    const body = await upstream.json();
    if (body?.success === false) throw new Error("P2P provider rejected the request");
    const rows = Array.isArray(body?.data) ? body.data : [];
    const offers = rows.map(row => {
      const ad = row?.adv || {};
      const trader = row?.advertiser || {};
      const price = Number(ad.price);
      if (!Number.isFinite(price) || price <= 0) return null;
      const methods = Array.isArray(ad.tradeMethods) ? ad.tradeMethods : [];
      return {
        trader:String(trader.nickName || "Marketplace advertiser").slice(0,80),
        priceNGN:price,
        minNGN:Number(ad.minSingleTransAmount) || null,
        maxNGN:Number(ad.maxSingleTransAmount) || null,
        availableAsset:Number(ad.surplusAmount) || null,
        paymentMethods:methods.map(m => String(m.tradeMethodName || m.identifier || "").slice(0,40)).filter(Boolean).slice(0,8),
        online:typeof trader.isOnline === "boolean" ? trader.isOnline : null,
        offerId:String(ad.advNo || "").slice(0,100)
      };
    }).filter(Boolean).sort((a,b) => side === "BUY" ? a.priceNGN-b.priceNGN : b.priceNGN-a.priceNGN);

    return res.status(200).json({
      source:"Binance public P2P marketplace",
      fiat:"NGN",
      asset,
      side,
      fetchedAt:new Date().toISOString(),
      count:offers.length,
      offers,
      note:"Offers can change or disappear. Verify advertiser, limits, payment terms and final price on Binance before trading."
    });
  } catch {
    return res.status(502).json({
      error:"P2P offers could not be retrieved from Binance's public provider.",
      source:"Binance public P2P marketplace",
      fiat:"NGN",
      asset,
      side,
      fetchedAt:new Date().toISOString(),
      offers:[]
    });
  }
}
