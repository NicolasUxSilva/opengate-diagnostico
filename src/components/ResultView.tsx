"use client";

import { useEffect, useState } from "react";
import { site } from "@/config/site";
import { track } from "@/lib/analytics";
import type { DiagnosticResult } from "@/lib/engine/narrative";
import { partnerHref } from "@/lib/utm";

/** Tempo máximo que o clique espera o envio do evento antes de navegar. */
const CTA_NAVIGATION_DELAY_MS = 150;

/**
 * Registra DiagnosticCTA e segue para a landing. No clique simples, a navegação espera um instante
 * para o evento sair antes de a página ser trocada; clique com modificador (nova aba) segue o padrão.
 */
function goToPartner(e: React.MouseEvent<HTMLAnchorElement>, href: string, perfil: DiagnosticResult["profile"]) {
  track("DiagnosticCTA", { perfil });
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (!window.fbq) return;
  e.preventDefault();
  window.setTimeout(() => window.location.assign(href), CTA_NAVIGATION_DELAY_MS);
}

const opportunityLabel = { A: "Principal oportunidade", B: "Ponto a desenvolver", C: "Prioridade agora" } as const;
const levelLabel = { forte: "Forte", intermediario: "Em desenvolvimento", inicial: "Inicial" } as const;

interface Props {
  result: DiagnosticResult;
  fallbackNotice: boolean;
  onReview: () => void;
  onRestart: () => void;
}

export function ResultView({ result, fallbackNotice, onReview, onRestart }: Props) {
  const [href, setHref] = useState(site.partnerUrl);
  useEffect(() => setHref(partnerHref()), []);

  const ctaClass =
    result.cta.emphasis === "primary" ? "btn btn--primary btn--lg" : result.cta.emphasis === "secondary" ? "btn btn--outline" : "btn btn--link";

  return (
    <article className={`result result--${result.profile.toLowerCase()}`} aria-labelledby="result-title">
      <header className="result__hero">
        <p className="eyebrow eyebrow--on-dark">Seu resultado</p>
        <h1 id="result-title" tabIndex={-1} data-step-focus className="result__title">
          {result.profileTitle}
        </h1>
        <p className="result__lead">{result.profileLead}</p>
      </header>

      {fallbackNotice && (
        <p className="notice" role="status">
          Não conseguimos falar com o servidor agora. Esta é a leitura calculada por regras no seu navegador, com o mesmo
          resultado.
        </p>
      )}

      <section className="result__section">
        <h2 className="result__h2">Resumo da sua operação</h2>
        <p>{result.summary}</p>
        {result.note && <p className="result__note">{result.note}</p>}
      </section>

      <section className="result__section">
        <h2 className="result__h2">Pontos fortes</h2>
        <ul className="checklist">
          {result.strengths.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section className="result__section result__highlight">
        <h2 className="result__h2">{opportunityLabel[result.profile]}</h2>
        <p className="result__h3">{result.opportunity.title}</p>
        <p>{result.opportunity.text}</p>
      </section>

      <section className="result__section">
        <h2 className="result__h2">Recomendação prática</h2>
        <p>{result.recommendation}</p>
      </section>

      <section className={`result__section next next--${result.cta.emphasis}`}>
        <h2 className="result__h2">Próximo passo</h2>
        <p>{result.nextStep}</p>
        <p className="next__cta-text">{result.cta.text}</p>
        <a className={ctaClass} href={href} onClick={(e) => goToPartner(e, href, result.profile)}>
          {site.partnerCtaLabel} <span aria-hidden="true">→</span>
        </a>
      </section>

      <details className="method">
        <summary>Como chegamos a este resultado</summary>
        <ul className="method__dims">
          {result.dimensions.map((d) => (
            <li key={d.id}>
              <span>{d.label}</span>
              <span className={`level level--${d.level}`}>{levelLabel[d.level]}</span>
            </li>
          ))}
        </ul>
        <p>
          O perfil é definido por regras fixas: atuação no setor e carteira de clientes pesam mais, seguidas de acesso ao
          mercado de hospedagem e capacidade comercial. Algumas condições são obrigatórias para cada perfil, então uma resposta
          forte não compensa a falta de outra essencial.
          {result.source === "ai"
            ? " O texto desta leitura foi redigido com apoio de inteligência artificial a partir das suas respostas; a classificação não é feita pela IA."
            : " O texto desta leitura foi montado a partir das suas respostas."}
        </p>
        <p>Este diagnóstico é uma leitura inicial e não representa aprovação ou recusa no programa de parceiros.</p>
      </details>

      <div className="result__actions">
        <button type="button" className="btn btn--ghost" onClick={onReview}>
          Revisar respostas
        </button>
        <button type="button" className="btn btn--ghost" onClick={onRestart}>
          Refazer diagnóstico
        </button>
      </div>
    </article>
  );
}
