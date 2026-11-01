/* Cloudflare Web Analytics: no cookies and no personal data. The token only
   identifies the site and ships in the page anyway, so it isn't a secret. */
export const ANALYTICS_TOKEN = "a3d0e609a5ee4e1e8d517b08dcd37fec";

export function startAnalytics() {
  if (!ANALYTICS_TOKEN || !import.meta.env.PROD) return;
  const script = document.createElement("script");
  script.type = "module";
  script.src = "https://static.cloudflareinsights.com/beacon.min.js";
  script.dataset.cfBeacon = JSON.stringify({ token: ANALYTICS_TOKEN });
  document.head.appendChild(script);
}
