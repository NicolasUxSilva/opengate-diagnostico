/*
 * Interpretação do resultado por IA (Claude, via API da Anthropic). Só roda no servidor.
 *
 * A IA recebe as respostas, o perfil JÁ CALCULADO pelo motor de regras e a leitura por regras,
 * e devolve apenas texto. Ela não decide nem altera o perfil, a ênfase do CTA ou os níveis
 * das dimensões. A saída é validada (estrutura + conteúdo proibido); qualquer falha devolve
 * `null` e a rota usa a leitura por regras. Importado só por src/app/api (código de servidor).
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { getQuestion, optionLabel, questions, type CompleteAnswers } from "@/config/questions";
import { facts, type DiagnosticContent, type DiagnosticResult } from "@/lib/engine/narrative";

export const aiOutputSchema = z.object({
  summary: z.string().min(80).max(700),
  strengths: z.array(z.string().min(15).max(220)).min(1).max(4),
  opportunityTitle: z.string().min(10).max(110),
  opportunityText: z.string().min(40).max(500),
  recommendation: z.string().min(40).max(500),
  nextStep: z.string().min(30).max(350),
});
export type AiOutput = z.infer<typeof aiOutputSchema>;

/**
 * Conteúdo que nunca pode aparecer: valores, percentuais, promessas, aprovação garantida,
 * contatos e links (o CTA é fixo, fora da IA).
 */
const FORBIDDEN = [
  /R\$/i,
  /\d+(?:[.,]\d+)?\s?%/,
  /\bgarant/i,
  /\baprovad[oa]\b/i,
  /\baprovação\b/i,
  /\blucr/i,
  /\bfatur/i,
  /\brenda\b/i,
  /\bcomiss/i,
  /\bmensalidade/i,
  /\bpreço/i,
  /https?:\/\//i,
  /www\./i,
  /@/,
  /\b\d{4,}\b/,
];

export function violatesContentRules(out: AiOutput): boolean {
  const texts = [out.summary, ...out.strengths, out.opportunityTitle, out.opportunityText, out.recommendation, out.nextStep];
  return texts.some((t) => FORBIDDEN.some((re) => re.test(t)));
}

export function isAiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY) && process.env.AI_ENABLED !== "false";
}

const SYSTEM = `Você escreve a leitura final do "Diagnóstico de Operação", uma ferramenta da OpenGate (controle de acesso automatizado) para integradores de segurança eletrônica no Brasil.

O perfil do visitante já foi calculado por regras e é definitivo. Seu trabalho é só redigir, em português do Brasil, uma leitura clara, profissional e específica para as respostas recebidas.

Regras obrigatórias:
- Use somente o que o visitante respondeu. Não suponha tamanho da empresa, cidade, faturamento, número de clientes, anos de experiência ou qualquer dado não informado.
- Sobre a OpenGate, use somente os fatos fornecidos. Não crie benefícios, condições comerciais, requisitos de parceria, prazos ou preços.
- Não mencione valores em reais, percentuais, ganhos, renda, comissões, lucro ou faturamento. Não prometa resultados nem aprovação na parceria.
- Não contradiga o perfil calculado nem sugira que ele poderia ser outro.
- Não inclua links, e-mails, telefones nem chamadas para clicar: o botão para a página da parceria já existe fora do seu texto.
- Tom: direto, respeitoso, de consultor experiente para profissional do setor. Trate o visitante por "você". Sem jargão de marketing, sem exclamações, sem linguagem de reprovação.
- Os pontos fortes devem vir apenas do que está na leitura de referência; você pode reescrevê-los, não inventar novos.
- Mantenha o tamanho de cada campo próximo ao da leitura de referência.`;

function buildPrompt(a: CompleteAnswers, base: DiagnosticResult): string {
  const answerLines = questions.map((q) => {
    const value = a[q.id];
    const labels = Array.isArray(value) ? value.map((v) => optionLabel(q.id, v)) : [optionLabel(q.id, value)];
    return `- ${getQuestion(q.id).title}\n  Resposta: ${labels.join("; ")}`;
  });
  const reference: DiagnosticContent = {
    summary: base.summary,
    strengths: base.strengths,
    opportunity: base.opportunity,
    recommendation: base.recommendation,
    nextStep: base.nextStep,
  };
  return [
    "<respostas>",
    ...answerLines,
    "</respostas>",
    "",
    `<perfil_calculado>${base.profile} — ${base.profileTitle}</perfil_calculado>`,
    base.note ? `<observacao>${base.note}</observacao>` : "",
    "",
    "<fatos_opengate>",
    ...facts.map((f) => `- ${f}`),
    "</fatos_opengate>",
    "",
    "<leitura_de_referencia>",
    JSON.stringify(reference, null, 2),
    "</leitura_de_referencia>",
    "",
    "Reescreva a leitura de referência de forma mais natural e conectada às respostas, mantendo o mesmo sentido, a mesma oportunidade principal e o mesmo próximo passo.",
  ].join("\n");
}

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic({ timeout: 25_000, maxRetries: 1 });
  return client;
}

export type InterpretOutcome =
  | { ok: true; content: DiagnosticContent }
  | { ok: false; reason: "not_configured" | "api_error" | "refusal" | "invalid_output" };

export async function interpretWithAi(a: CompleteAnswers, base: DiagnosticResult): Promise<InterpretOutcome> {
  if (!isAiConfigured()) return { ok: false, reason: "not_configured" };
  try {
    const response = await getClient().beta.messages.parse({
      model: process.env.AI_MODEL || "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(aiOutputSchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: buildPrompt(a, base) }],
    });
    if (response.stop_reason === "refusal") return { ok: false, reason: "refusal" };
    const parsed = aiOutputSchema.safeParse(response.parsed_output);
    if (!parsed.success || violatesContentRules(parsed.data)) return { ok: false, reason: "invalid_output" };
    const o = parsed.data;
    return {
      ok: true,
      content: {
        summary: o.summary,
        strengths: o.strengths,
        opportunity: { title: o.opportunityTitle, text: o.opportunityText },
        recommendation: o.recommendation,
        nextStep: o.nextStep,
      },
    };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error(`[diagnostico] IA indisponível (${error.status ?? "sem status"}): ${error.name}`);
    } else {
      console.error("[diagnostico] Falha ao interpretar com IA:", error instanceof Error ? error.name : "erro");
    }
    return { ok: false, reason: "api_error" };
  }
}
