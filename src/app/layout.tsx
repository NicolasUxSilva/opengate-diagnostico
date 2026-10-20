import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Nunito_Sans, Open_Sans } from "next/font/google";
import { site } from "@/config/site";
import "./globals.css";

// Famílias usadas em opengatebr.com: Nunito Sans nos títulos, Open Sans no texto.
const display = Nunito_Sans({ subsets: ["latin"], weight: ["400", "700", "800"], variable: "--font-nunito-sans", display: "swap" });
const body = Open_Sans({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-open-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Diagnóstico de Operação | OpenGate",
  description:
    "Diagnóstico gratuito para integradores de segurança eletrônica: entenda sua operação, sua carteira e onde está a próxima oportunidade com controle de acesso.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Diagnóstico de Operação | OpenGate",
    description: "Seis perguntas para integradores de segurança eletrônica. Leitura personalizada da sua operação, sem cadastro.",
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#093954", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body>
        {children}
        {site.metaPixelId && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(site.metaPixelId)});fbq('track','PageView');`}
          </Script>
        )}
      </body>
    </html>
  );
}
