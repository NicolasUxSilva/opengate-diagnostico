import { forwardedParams, originParam, site } from "@/config/site";

const KEY = "og-diag-campaign";

/** Guarda os parâmetros de campanha da URL de entrada (só os da lista permitida). */
export function captureCampaignParams() {
  try {
    const url = new URL(window.location.href);
    const found: Record<string, string> = {};
    for (const key of forwardedParams) {
      const v = url.searchParams.get(key);
      if (v) found[key] = v.slice(0, 200);
    }
    if (Object.keys(found).length) sessionStorage.setItem(KEY, JSON.stringify(found));
  } catch {
    // sessionStorage indisponível: segue sem preservar parâmetros.
  }
}

/** URL da landing page com os parâmetros de campanha preservados e a origem do tráfego. */
export function partnerHref(): string {
  const url = new URL(site.partnerUrl);
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || "{}") as Record<string, string>;
    for (const key of forwardedParams) if (saved[key]) url.searchParams.set(key, saved[key]);
  } catch {
    // ignora
  }
  url.searchParams.set(originParam.key, originParam.value);
  return url.toString();
}
