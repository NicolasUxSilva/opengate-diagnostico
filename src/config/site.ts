/*
 * Configuração pública do diagnóstico. Valores vêm de variáveis de ambiente NEXT_PUBLIC_*
 * (embutidas no build) com padrão seguro. Ver .env.example.
 */
export const site = {
  name: "Diagnóstico de Operação",
  brand: "OpenGate",
  /** Landing page comercial da parceria (destino do CTA). */
  partnerUrl: process.env.NEXT_PUBLIC_PARTNER_URL || "https://integradores-opengate.framer.website",
  partnerCtaLabel: "Conhecer a parceria OpenGate",
  institutionalUrl: "https://opengatebr.com",
  /** Meta Pixel: só carrega se o ID estiver configurado. */
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || "",
};

/** Parâmetros de campanha preservados no encaminhamento para a landing page. */
export const forwardedParams = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"];

/** Identificação da origem do tráfego na landing page (sem dados do visitante). */
export const originParam = { key: "origem", value: "diagnostico" };
