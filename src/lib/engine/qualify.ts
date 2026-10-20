/*
 * Motor de qualificação: determinístico, explicável e reproduzível.
 * Recebe respostas já validadas (validate.ts) e devolve o perfil comercial.
 * A IA nunca altera o que sai daqui.
 */
import type { CompleteAnswers } from "@/config/questions";
import { comercialMix, gates, optionScores, thresholds, weights, type Dimension } from "@/config/scoring";

export type Profile = "A" | "B" | "C";
export type Level = "forte" | "intermediario" | "inicial";

/** Situações que o motor sinaliza para o texto do resultado e para auditoria. */
export type Flag =
  | "operacao_sem_portfolio" // diz ter operação própria, mas não oferece soluções
  | "carteira_sem_atuacao" // informa carteira, mas não atua profissionalmente
  | "prospeccao_sem_carteira" // prospecta ativamente, mas não tem carteira
  | "colaborador" // atua como colaborador de empresa do setor
  | "oferece_controle_acesso"; // já oferece controle de acesso

/** Por que o perfil foi definido (códigos estáveis, usados em testes e no texto). */
export type Reason =
  | "gate_c_atuacao"
  | "gate_c_carteira"
  | "score_abaixo_b"
  | "gate_a_atuacao"
  | "gate_a_carteira"
  | "gate_a_comercial"
  | "gate_a_portfolio"
  | "score_abaixo_a"
  | "criterios_a_atendidos";

export interface Qualification {
  profile: Profile;
  /** Pontuação ponderada, 0–100, arredondada para uma casa decimal. */
  score: number;
  dimensions: Record<Dimension, { score: number; level: Level }>;
  reasons: Reason[];
  flags: Flag[];
}

function level(score: number): Level {
  if (score >= 75) return "forte";
  if (score >= 45) return "intermediario";
  return "inicial";
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function qualify(a: CompleteAnswers): Qualification {
  const s = optionScores;
  const raw: Record<Dimension, number> = {
    atuacao: s.atuacao[a.atuacao as keyof typeof s.atuacao],
    carteira: s.carteira[a.carteira as keyof typeof s.carteira],
    mercado: s.mercado[a.mercado as keyof typeof s.mercado],
    comercial:
      s.comercial[a.comercial as keyof typeof s.comercial] * comercialMix.comercial +
      s.capacidade[a.capacidade as keyof typeof s.capacidade] * comercialMix.capacidade,
  };
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v !== "number" || Number.isNaN(v)) throw new Error(`Resposta sem pontuação: ${k}`);
  }

  const score = round1(
    (Object.keys(weights) as Dimension[]).reduce((sum, d) => sum + raw[d] * weights[d], 0),
  );
  const dimensions = Object.fromEntries(
    (Object.keys(raw) as Dimension[]).map((d) => [d, { score: round1(raw[d]), level: level(raw[d]) }]),
  ) as Qualification["dimensions"];

  const ownOperation = gates.profileAAtuacao.includes(a.atuacao);
  const noPortfolio = a.portfolio.includes("nenhuma");
  const flags: Flag[] = [];
  if (ownOperation && noPortfolio) flags.push("operacao_sem_portfolio");
  if (gates.profileCAtuacao.includes(a.atuacao) && gates.profileACarteira.includes(a.carteira))
    flags.push("carteira_sem_atuacao");
  if (a.carteira === "nenhuma" && a.comercial === "prospeccao") flags.push("prospeccao_sem_carteira");
  if (a.atuacao === "colaborador") flags.push("colaborador");
  if (a.portfolio.includes("controle_acesso")) flags.push("oferece_controle_acesso");

  // 1. Critérios que levam direto ao Perfil C: nenhuma pontuação secundária compensa.
  const cReasons: Reason[] = [];
  if (gates.profileCAtuacao.includes(a.atuacao)) cReasons.push("gate_c_atuacao");
  if (gates.profileCCarteira.includes(a.carteira)) cReasons.push("gate_c_carteira");
  if (cReasons.length) return { profile: "C", score, dimensions, reasons: cReasons, flags };

  if (score < thresholds.profileB)
    return { profile: "C", score, dimensions, reasons: ["score_abaixo_b"], flags };

  // 2. Perfil A exige todos os critérios essenciais e pontuação mínima.
  const aMissing: Reason[] = [];
  if (!ownOperation) aMissing.push("gate_a_atuacao");
  if (!gates.profileACarteira.includes(a.carteira)) aMissing.push("gate_a_carteira");
  if (gates.profileABlockComercial.includes(a.comercial)) aMissing.push("gate_a_comercial");
  if (noPortfolio) aMissing.push("gate_a_portfolio");
  if (score < thresholds.profileA) aMissing.push("score_abaixo_a");

  if (aMissing.length) return { profile: "B", score, dimensions, reasons: aMissing, flags };
  return { profile: "A", score, dimensions, reasons: ["criterios_a_atendidos"], flags };
}
