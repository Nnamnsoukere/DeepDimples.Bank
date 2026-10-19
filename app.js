const $ = (id) => document.getElementById(id);
const toast = (message) => {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2900);
};

// This front-end never invents wallet balances. Only a wallet/provider integration can supply them.

let hiddenBalance = false;

// Watch-only wallet address: public address only. Never ask for a seed phrase or private key.
const WATCH_WALLET_KEY = "ddb-watch-wallet";
function renderWatchWallet() {
  let address = "";
  try { address = localStorage.getItem(WATCH_WALLET_KEY) || ""; } catch {}
  const state = $("walletConnectionState");
  const subtitle = $("walletSubtitle");
  const button = $("watchWallet");
  if (address) {
    state.textContent = "Watching address: " + address.slice(0, 7) + "…" + address.slice(-5);
    subtitle.textContent = "Public address saved · balances not yet indexed";
    button.textContent = "✎ Change public address";
  } else {
    state.textContent = "Watch-only · no signing or transfers";
    subtitle.textContent = "No wallet connected · watch-only address support";
    button.textContent = "＋ Add public wallet address";
  }
}
$("watchWallet").addEventListener("click", () => {
  let current = "";
  try { current = localStorage.getItem(WATCH_WALLET_KEY) || ""; } catch {}
  const answer = window.prompt("Enter a PUBLIC wallet address to save for watch-only tracking. Never enter a recovery phrase or private key.", current);
  if (answer === null) return;
  const address = answer.trim();
  if (!address) {
    try { localStorage.removeItem(WATCH_WALLET_KEY); } catch {}
    renderWatchWallet();
    toast("Watch-only address cleared from this browser.");
    return;
  }
  if (address.length < 20 || address.length > 128 || /\\s/.test(address)) {
    toast("That does not look like a valid public wallet address. Check it and try again.");
    return;
  }
  try {
    localStorage.setItem(WATCH_WALLET_KEY, address);
    renderWatchWallet();
    toast("Public address saved on this device. No funds were accessed or moved.");
  } catch {
    toast("Could not save the address in this browser.");
  }
});
renderWatchWallet();

$("currency").addEventListener("change", () => {
  $("walletValue").textContent = hiddenBalance ? "••••••••" : "Not connected";
  $("walletSubtitle").textContent = "Display preference only · wallet not connected";
  toast("Currency display changed. No balance conversion is available until an account is connected.");
});
$("hideBalance").addEventListener("click", () => {
  hiddenBalance = !hiddenBalance;
  $("walletValue").textContent = hiddenBalance ? "••••••••" : "Not connected";
  $("hideBalance").textContent = hiddenBalance ? "◎" : "◉";
});
$("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
  $("themeToggle").textContent = document.body.classList.contains("light") ? "☾" : "☼";
  toast(document.body.classList.contains("light") ? "Light appearance enabled." : "Dark appearance enabled.");
});
$("searchToggle").addEventListener("click", () => {
  $("searchWrap").classList.toggle("hidden");
  if (!$("searchWrap").classList.contains("hidden")) $("searchInput").focus();
});
$("searchInput").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase().trim();
  document.querySelectorAll(".asset-row").forEach(row => row.style.display = row.dataset.search.includes(q) ? "flex" : "none");
});
$("notifications").addEventListener("click", () => toast("No new notifications."));
$("activityFilter").addEventListener("click", () => toast("Connect a supported wallet or exchange to display verified activity."));
document.querySelectorAll("[data-note]").forEach(btn => btn.addEventListener("click", () => toast(btn.dataset.note)));
document.querySelectorAll(".summary-card").forEach(btn => btn.addEventListener("click", () => {
  const target = $(btn.dataset.target); if (target) target.scrollIntoView({behavior:"smooth",block:"start"});
}));
document.querySelectorAll("[data-nav]").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll("[data-nav]").forEach(n => n.classList.remove("active")); btn.classList.add("active");
  const key = btn.dataset.nav;
  const target = key === "home" ? document.querySelector(".hero-row") : key === "profile" ? document.querySelector(".topbar") : $(key);
  if (target) target.scrollIntoView({behavior:"smooth",block:"start"});
  if (key === "profile") openProfile();
}));
document.querySelectorAll(".service-card").forEach(btn => btn.addEventListener("click", () => toast(btn.dataset.note)));

function openProfile() {
  const dialog = $("profileDialog");
  if (!dialog.open) dialog.showModal();
}
$("editProfile").addEventListener("click", openProfile);
$("cancelProfile").addEventListener("click", () => $("profileDialog").close());
const savedProfile = (() => { try { return JSON.parse(localStorage.getItem("ddb-profile") || "{}"); } catch { return {}; } })();
function applyProfile(profile) {
  const name = profile.name || "DeepDimples";
  $("profileName").textContent = name;
  $("nicknameInput").value = name === "DeepDimples" ? "" : name;
  $("profileAvatar").textContent = name.slice(0,2).toUpperCase();
  $("profileAvatar").style.backgroundImage = "";
  if (profile.image) {
    const img = new Image();
    img.onload = () => { $("profileAvatar").textContent = ""; $("profileAvatar").style.backgroundImage = 'url("' + profile.image.replace(/["\\\\]/g,"") + '")'; };
    img.onerror = () => toast("That profile image could not be loaded. The nickname was saved.");
    img.src = profile.image;
  }
  $("avatarInput").value = profile.image || "";
}
applyProfile(savedProfile);
$("profileForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const profile = {name:$("nicknameInput").value.trim().slice(0,32) || "DeepDimples", image:$("avatarInput").value.trim()};
  try { localStorage.setItem("ddb-profile", JSON.stringify(profile)); applyProfile(profile); $("profileDialog").close(); toast("Profile saved on this device."); }
  catch { toast("Could not save the profile in this browser."); }
});

// If a remote coin-logo CDN fails, keep the asset row legible with a symbol fallback.
document.querySelectorAll(".asset-icon img").forEach((img) => {
  img.addEventListener("error", () => {
    const symbol = (img.alt || "Crypto").replace(/ logo$/i, "").slice(0, 3).toUpperCase();
    const fallback = document.createElement("span");
    fallback.className = "asset-logo-fallback";
    fallback.textContent = symbol;
    fallback.setAttribute("aria-label", img.alt || symbol);
    img.replaceWith(fallback);
  }, {once:true});
});

// Public spot market ticker feed; no API key. These are market prices, not wallet balances or guaranteed trade prices.
const marketAssets = [
  {symbol:"BTC", name:"Bitcoin", search:"bitcoin btc"},
  {symbol:"ETH", name:"Ethereum", search:"ethereum eth"},
  {symbol:"SOL", name:"Solana", search:"solana sol"},
  {symbol:"USDT", name:"Tether", search:"tether usdt"}
];
const money = (n) => "$" + Number(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:n < 1 ? 6 : 2});
let marketRequestInFlight = false;
let lastGoodMarketPayload = null;
async function loadMarketPrices() {
  if (marketRequestInFlight) return;
  marketRequestInFlight = true;
  $("marketFreshness").textContent = "Updating public market feed…";
  $("priceStatus").textContent = "Fetching public spot market prices. Market prices are not wallet balances.";
  try {
    const response = await fetch("/api/market", {cache:"no-store"});
    if (!response.ok) throw new Error("Market feed unavailable");
    const payload = await response.json();
    if (!payload.assets || !["BTC","ETH","SOL","USDT"].every(symbol => Number.isFinite(Number(payload.assets[symbol]?.price)) && Number(payload.assets[symbol].price) > 0)) throw new Error("Incomplete market data");
    lastGoodMarketPayload = payload;
    let success = 0;
    for (const asset of marketAssets) {
      const row = document.querySelector('[data-search="' + asset.search + '"]');
      const quote = payload.assets && payload.assets[asset.symbol];
      if (!quote || !Number.isFinite(Number(quote.price))) {
        row.querySelector(".asset-price b").textContent = "Unavailable";
        row.querySelector(".asset-price small").textContent = "Feed unavailable";
        row.querySelector(".asset-change").textContent = "—";
        continue;
      }
      row.querySelector(".asset-price b").textContent = money(quote.price);
      row.querySelector(".asset-price small").textContent = "24h spot market";
      const change = Number(quote.change24h) || 0;
      const changeEl = row.querySelector(".asset-change");
      changeEl.textContent = (change >= 0 ? "+" : "") + change.toFixed(2) + "%";
      changeEl.className = "asset-change " + (change > 0 ? "positive" : change < 0 ? "negative" : "neutral");
      success++;
    }
    const now = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});
    $("marketSummary").textContent = success ? success + "/4 live" : "Feed unavailable";
    $("marketFreshness").textContent = success ? "Updated " + now : "No market data";
    $("priceStatus").textContent = success
      ? "Source: " + (payload.source || "public spot market") + " · refreshed " + now + ". Prices are indicative, not executable quotes. No wallet is connected."
      : "The market feed returned no valid prices. No prices have been fabricated.";
  } catch {
    $("marketSummary").textContent = lastGoodMarketPayload ? "Last known prices" : "Feed unavailable";
    $("marketFreshness").textContent = lastGoodMarketPayload ? "Refresh failed · showing last successful prices" : "Could not reach market feed";
    $("priceStatus").textContent = lastGoodMarketPayload
      ? "The latest refresh failed. Prices below are from the last successful response at " + new Date(lastGoodMarketPayload.fetchedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"}) + "; they may be stale. Retry to update."
      : "Public market data is temporarily unavailable. No prices have been fabricated; try Refresh again.";
    if (!lastGoodMarketPayload) document.querySelectorAll(".asset-row").forEach(row => {
      row.querySelector(".asset-price b").textContent = "Unavailable";
      row.querySelector(".asset-price small").textContent = "Feed unavailable";
      row.querySelector(".asset-change").textContent = "—";
    });
  } finally {
    marketRequestInFlight = false;
  }
}
$("refreshPrices").addEventListener("click", loadMarketPrices);
loadMarketPrices();
setInterval(loadMarketPrices, 60000);

async function loadP2POffers() {
  const asset = $("p2pAsset").value;
  const side = $("p2pSide").value;
  const container = $("p2pOffers");
  $("p2pStatus").textContent = "Checking supported NGN P2P providers…";
  container.textContent = "Checking providers…";
  try {
    const response = await fetch("/api/p2p?asset=" + encodeURIComponent(asset) + "&side=" + encodeURIComponent(side), {cache:"no-store"});
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Provider directory unavailable");
    container.replaceChildren();
    for (const provider of payload.providers || []) {
      const card = document.createElement("article");
      card.className = "p2p-offer";
      const heading = document.createElement("div");
      heading.className = "p2p-offer-top";
      const name = document.createElement("b");
      name.textContent = provider.name;
      const status = document.createElement("span");
      status.className = "connection-state";
      status.textContent = "Live feed not connected";
      heading.append(name, status);
      const details = document.createElement("p");
      details.textContent = provider.message;
      const link = document.createElement("a");
      link.href = provider.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Open " + provider.name + " marketplace ↗";
      card.append(heading, details, link);
      container.append(card);
    }
    const time = new Date(payload.fetchedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});
    $("p2pStatus").textContent = "Provider directory checked " + time + ". No live offers are being claimed. Select a provider to view its current marketplace.";
  } catch {
    container.replaceChildren();
    const note = document.createElement("p");
    note.className = "data-note";
    note.textContent = "Provider status could not be loaded. Try refreshing; no sample rates are displayed.";
    container.append(note);
    $("p2pStatus").textContent = "The P2P provider directory is temporarily unavailable.";
  }
}
$("refreshP2P").addEventListener("click", loadP2POffers);
loadP2POffers();
$("p2pAsset").addEventListener("change", loadP2POffers);
$("p2pSide").addEventListener("change", loadP2POffers);
$("p2pInfo").addEventListener("click", () => toast("Check the exact asset, NGN amount, merchant completion history, payment method and order limits on the exchange before paying. Never release crypto before confirming receipt of payment."));
async function loadConnectionStatus() {
  const list = $("connectionList");
  list.replaceChildren();
  const loading = document.createElement("p"); loading.className = "data-note"; loading.textContent = "Checking server configuration…"; list.append(loading);
  try {
    const response = await fetch("/api/connections", {cache:"no-store"});
    if (!response.ok) throw new Error("Status endpoint unavailable");
    const data = await response.json();
    list.replaceChildren();
    for (const provider of data.providers || []) {
      const row = document.createElement("div"); row.className = "connection-row";
      const name = document.createElement("b"); name.textContent = provider.name;
      const status = document.createElement("span"); status.className = provider.configured ? "connection-state configured" : "connection-state";
      status.textContent = provider.configured ? "Credentials configured · not verified" : "Not configured";
      row.append(name, status); list.append(row);
    }
    const note = document.createElement("p"); note.className = "data-note";
    note.textContent = "Checked " + new Date(data.checkedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"}) + ". Configuration presence alone does not verify credentials or connect account data.";
    list.append(note);
  } catch {
    list.replaceChildren();
    const note = document.createElement("p"); note.className = "data-note";
    note.textContent = "Connection status could not be loaded. The server status endpoint may still be deploying.";
    list.append(note);
  }
}
$("refreshConnections").addEventListener("click", loadConnectionStatus);
loadConnectionStatus();
