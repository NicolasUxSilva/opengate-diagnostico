/*
 * Eventos de mensuração do funil. Nenhum evento leva respostas individuais ou dados pessoais:
 * só o nome do evento e, quando aplicável, o perfil calculado (A, B ou C).
 *
 * Funil: PageView (layout.tsx) → DiagnosticStarted → DiagnosticCompleted → DiagnosticCTA.
 * Nenhum destes é um lead: o evento `Lead` só existe na landing de integradores, após o envio
 * confirmado do formulário.
 *
 * Destinos:
 * - Meta Pixel (`fbq('trackCustom', ...)`), carregado em layout.tsx.
 * - `window.dataLayer`, se existir (Google Tag Manager ou similar), como `opengate_<Evento>`.
 */
export type AnalyticsEvent = "DiagnosticStarted" | "DiagnosticCompleted" | "DiagnosticCTA";

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
