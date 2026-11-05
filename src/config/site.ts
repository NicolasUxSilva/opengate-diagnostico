/*
 * Configuração pública do diagnóstico. Valores vêm de variáveis de ambiente NEXT_PUBLIC_*
 * (embutidas no build) com padrão seguro. Ver .env.example.
 */
export const site = {
  name: "Diagnóstico de Operação",
  brand: "OpenGate",
  /** Landing page comercial da parceria (destino do CTA). */
  partnerUrl: process.env.NEXT_PUBLIC_PARTNER_URL || "https://opengate-integradores.vercel.app",
  partnerCtaLabel: "Conhecer a parceria OpenGate",
  /** Site institucional da OpenGate (links do logo e do rodapé). */
  institutionalUrl: process.env.NEXT_PUBLIC_INSTITUTIONAL_URL || "https://site-opengate.vercel.app",
  /**
   * Meta Pixel "Pixel Site OpenGate" (o mesmo da landing de integradores). O ID é público por design.
   * NEXT_PUBLIC_META_PIXEL_ID substitui o padrão; "off" desliga o Pixel.
   */
  metaPixelId: pixelId(process.env.NEXT_PUBLIC_META_PIXEL_ID),
};

/** Parâmetros de campanha preservados no encaminhamento para a landing page. */
export const forwardedParams = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"];

/** Identificação da origem do tráfego na landing page (sem dados do visitante). */
export const originParam = { key: "origem", value: "diagnostico" };

function pixelId(value: string | undefined): string {
  if (value === "off") return "";
  return value || "351480523756375";
}
