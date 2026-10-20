import Image from "next/image";
import { site } from "@/config/site";

export function Header() {
  return (
    <header className="header">
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>
      <div className="header__inner">
        <a href={site.institutionalUrl} target="_blank" rel="noopener noreferrer" className="header__logo" aria-label="OpenGate (abre o site institucional em nova aba)">
          <Image src="/opengate-logo.svg" alt="OpenGate" width={142} height={32} priority />
        </a>
        <span className="tag">Diagnóstico de Operação</span>
      </div>
    </header>
  );
}
