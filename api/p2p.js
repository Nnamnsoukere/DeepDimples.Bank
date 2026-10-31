// Vercel serverless function: GET /api/p2p?asset=USDT&side=BUY
// Reads public NGN P2P offers from OKX, Bybit and Bitget. These are the
// exchanges' own website endpoints (not official APIs), so any one of them
// can fail or change. Each provider is fetched separately.

const ASSETS = ['USDT', 'USDC', 'BTC'];

async function tf(url, opts) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 8000);
  try {
    const o = opts || {};
    return await fetch(url, {
      method: o.method || 'GET',
      body: o.body,
      signal: c.signal,
      headers: Object.assign(
        { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36', Accept: 'application/json' },
        o.headers || {}
      )
    });
  } finally {
    clearTimeout(t);
  }
}

const num = v => { const n = parseFloat(v); return isFinite(n) ? n : null; };

async function okx(asset, side) {
  const s = side === 'BUY' ? 'sell' : 'buy';
  const url = 'https://www.okx.com/v3/c2c/tradingOrders/books?quoteCurrency=NGN&baseCurrency=' + asset +
    '&side=' + s + '&paymentMethod=all&userType=all&receivingAds=false';
  const r = await tf(url);
  if (!r.ok) throw new Error('http ' + r.status);
  const j = await r.json();
  const list = (j.data && j.data[s]) || [];
  return list.map(o => ({ price: num(o.price), min: num(o.quoteMinAmountPerOrder), max: num(o.quoteMaxAmountPerOrder), merchant: o.nickName }));
}

async function bybit(asset, side) {
  const r = await tf('https://api2.bybit.com/fiat/otc/item/online', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: '', tokenId: asset, currencyId: 'NGN', payment: [],
      side: side === 'BUY' ? '1' : '0', size: '10', page: '1', amount: '',
      authMaker: false, canTrade: false
    })
  });
  if (!r.ok) throw new Error('http ' + r.status);
  const j = await r.json();
  const list = (j.result && j.result.items) || [];
  return list.map(o => ({ price: num(o.price), min: num(o.minAmount), max: num(o.maxAmount), merchant: o.nickName }));
}

async function bitget(asset, side) {
  const r = await tf('https://www.bitget.com/v1/p2p/pub/adv/queryAdvList', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      side: side === 'BUY' ? 1 : 2, pageNo: 1, pageSize: 10,
      coinCode: asset, fiatCode: 'NGN', languageType: 0
    })
  });
  if (!r.ok) throw new Error('http ' + r.status);
  const j = await r.json();
  const list = (j.data && j.data.dataList) || [];
  return list.map(o => ({ price: num(o.price), min: num(o.minAmount), max: num(o.maxAmount), merchant: o.nickName }));
}

module.exports = async (req, res) => {
  const asset = String(req.query.asset || 'USDT').toUpperCase();
  const side = String(req.query.side || 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
  if (!ASSETS.includes(asset)) {
    res.status(400).json({ error: 'Unsupported asset' });
    return;
  }
  const jobs = [['OKX', okx], ['Bybit', bybit], ['Bitget', bitget]];
  const results = await Promise.allSettled(jobs.map(j => j[1](asset, side)));
  const providers = results.map((r, i) => {
    if (r.status !== 'fulfilled') return { name: jobs[i][0], ok: false };
    const offers = r.value
      .filter(o => o.price)
      .sort((a, b) => (side === 'BUY' ? a.price - b.price : b.price - a.price))
      .slice(0, 5)
      .map(o => ({ price: o.price, min: o.min, max: o.max, merchant: String(o.merchant || '').slice(0, 32) }));
    return { name: jobs[i][0], ok: offers.length > 0, offers };
  });
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  res.status(200).json({ asset, side, updated: Date.now(), providers });
};
