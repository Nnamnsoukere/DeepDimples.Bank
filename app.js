const $ = (id) => document.getElementById(id);
const toast = (message) => {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2900);
};

// This front-end never invents wallet balances. Only a wallet/provider integration can supply them.
let hiddenBalance = false;
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
$("p2pInfo").addEventListener("click", () => toast("P2P quotes will be shown only when a permitted source supplies real offers and timestamps."));
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

// Public spot market ticker feed; no API key. These are market prices, not wallet balances or guaranteed trade prices.
const marketAssets = [
  {symbol:"BTC", name:"Bitcoin", search:"bitcoin btc"},
  {symbol:"ETH", name:"Ethereum", search:"ethereum eth"},
  {symbol:"SOL", name:"Solana", search:"solana sol"},
  {symbol:"USDT", name:"Tether", search:"tether usdt"}
];
const money = (n) => "$" + Number(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:n < 1 ? 6 : 2});
async function loadMarketPrices() {
  $("marketFreshness").textContent = "Updating public market feed…";
  $("priceStatus").textContent = "Fetching public spot market prices. Market prices are not wallet balances.";
  try {
    const response = await fetch("/api/market", {cache:"no-store"});
    if (!response.ok) throw new Error("Market feed unavailable");
    const payload = await response.json();
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
    $("marketSummary").textContent = "Feed unavailable";
    $("marketFreshness").textContent = "Could not reach market feed";
    $("priceStatus").textContent = "Public market data is temporarily unavailable. No prices have been fabricated; try Refresh again.";
    document.querySelectorAll(".asset-row").forEach(row => {
      row.querySelector(".asset-price b").textContent = "Unavailable";
      row.querySelector(".asset-price small").textContent = "Feed unavailable";
      row.querySelector(".asset-change").textContent = "—";
    });
  }
}
$("refreshPrices").addEventListener("click", loadMarketPrices);

setInterval(loadMarketPrices, 60000);
