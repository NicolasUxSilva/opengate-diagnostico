/*
 * Matriz de qualificação — HIPÓTESES INICIAIS, a validar com o comercial da OpenGate.
 * Documentação completa: docs/qualificacao.md. Testes: tests/unit/qualify.spec.ts.
 *
 * Cada dimensão recebe uma nota de 0 a 100 a partir das respostas; a pontuação final é a
 * média ponderada pelos pesos abaixo. A pontuação sozinha NÃO define o perfil: os critérios
 * essenciais (gates) vêm antes, para que respostas secundárias não compensem a ausência de
 * atuação profissional, de carteira ou de processo comercial.
 */

export type Dimension = "atuacao" | "carteira" | "mercado" | "comercial";

/** Pesos das dimensões (devem somar 1). */
export const weights: Record<Dimension, number> = {
  atuacao: 0.3, // Atuação profissional no setor
  carteira: 0.3, // Carteira de clientes
  mercado: 0.2, // Acesso ao mercado prioritário
  comercial: 0.2, // Capacidade e intenção comercial
};

/** Nota (0–100) de cada alternativa. */
export const optionScores = {
  atuacao: { empresa: 100, autonomo: 85, colaborador: 50, iniciando: 20, fora: 0 },
  carteira: { ativa: 100, retomavel: 70, pequena: 35, nenhuma: 0 },
  mercado: { atende: 100, contatos: 75, outros_segmentos: 50, sem_acesso: 10 },
  // "Capacidade e intenção comercial" combina como o visitante encontra oportunidades
  // (pergunta 5) e como poderia atuar com a solução (pergunta 6).
  comercial: { prospeccao: 100, projetos: 80, indicacoes: 45, sem_processo: 10 },
  // Indicar é uma modalidade oficial ("Você indica ou instala", landing page), por isso
  // "indicacao" não é tratada como fraca; "avaliando" indica intenção ainda indefinida.
  capacidade: { completo: 100, com_apoio: 90, indicacao: 70, avaliando: 25 },
} as const;

/** Peso da pergunta 5 dentro da dimensão "comercial" (o restante vem da pergunta 6). */
export const comercialMix = { comercial: 0.5, capacidade: 0.5 };

/** Limites de pontuação. */
export const thresholds = {
  /** Pontuação mínima para o Perfil A (além dos critérios essenciais). */
  profileA: 70,
  /** Abaixo disso o visitante fica no Perfil C, mesmo que passe nos critérios mínimos de B. */
  profileB: 45,
};

/** Critérios essenciais (gates). */
export const gates = {
  /** Atuações que podem chegar ao Perfil A (operação própria). */
  profileAAtuacao: ["empresa", "autonomo"],
  /** Carteiras que podem chegar ao Perfil A. */
  profileACarteira: ["ativa", "retomavel"],
  /** Processos comerciais que impedem o Perfil A (sem capacidade de desenvolver oportunidades). */
  profileABlockComercial: ["sem_processo"],
  /** Atuações que levam direto ao Perfil C (sem atuação profissional consolidada). */
  profileCAtuacao: ["iniciando", "fora"],
  /** Carteiras que levam direto ao Perfil C. */
  profileCCarteira: ["nenhuma"],
};
