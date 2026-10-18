const $ = (id) => document.getElementById(id);
const toast = (message) => {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2900);
};
const demoValues = {USD:"$12,640.54",EUR:"€11,650.20",GBP:"£9,920.10",NGN:"₦19,230,000",USDT:"12,640.54 USDT",USDC:"12,640.54 USDC",BTC:"0.1842 BTC",HB:"— HB"};
let hiddenBalance = false;
$("currency").addEventListener("change", () => {
  $("walletValue").textContent = hiddenBalance ? "••••••••" : demoValues[$("currency").value];
  $("walletSubtitle").textContent = "Illustrative balance · not connected";
  toast("Display currency changed. This is still sample data.");
});
$("hideBalance").addEventListener("click", () => {
  hiddenBalance = !hiddenBalance;
  $("walletValue").textContent = hiddenBalance ? "••••••••" : demoValues[$("currency").value];
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
$("refreshPrices").addEventListener("click", () => toast("Live market data is not connected yet; no prices have been fabricated."));
$("p2pInfo").addEventListener("click", () => toast("P2P quotes will be shown only when we have a permitted, verifiable source and timestamp."));
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
  if (key === "profile") toast("Settings and secure account connections will be added in later phases.");
}));
document.querySelectorAll(".service-card").forEach(btn => btn.addEventListener("click", () => toast(btn.dataset.note)));
