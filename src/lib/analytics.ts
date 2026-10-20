/*
 * Eventos de mensuração. Nenhum evento leva respostas individuais ou dados pessoais:
 * só o nome do evento e, quando aplicável, o perfil calculado (A, B ou C).
 *
 * Destinos:
 * - Meta Pixel (`fbq`), se NEXT_PUBLIC_META_PIXEL_ID estiver configurado (ver layout.tsx).
 * - `window.dataLayer`, se existir (Google Tag Manager ou similar).
 * Sem configuração, as chamadas não fazem nada.
 */
export type AnalyticsEvent =
  | "DiagnosticStart"
  | "DiagnosticComplete"
  | "DiagnosticResultView"
  | "PartnerCtaClick";

type Params = { perfil?: "A" | "B" | "C" };

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

export function track(event: AnalyticsEvent, params: Params = {}) {
  if (typeof window === "undefined") return;
  try {
    window.fbq?.("trackCustom", event, params);
    window.dataLayer?.push({ event: `opengate_${event}`, ...params });
    if (process.env.NODE_ENV !== "production") console.debug("[analytics]", event, params);
  } catch {
    // Mensuração nunca deve interromper a experiência.
  }
}
