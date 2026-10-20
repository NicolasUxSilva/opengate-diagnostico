import { z } from "zod";
import { questions, type CompleteAnswers } from "@/config/questions";

function optionIds(id: string): [string, ...string[]] {
  const q = questions.find((x) => x.id === id);
  if (!q) throw new Error(`Pergunta desconhecida: ${id}`);
  return q.options.map((o) => o.id) as [string, ...string[]];
}

const portfolioIds = optionIds("portfolio");
const exclusivePortfolio = questions
  .find((q) => q.id === "portfolio")!
  .options.filter((o) => o.exclusive)
  .map((o) => o.id);

/** Esquema das respostas completas. Rejeita alternativas desconhecidas e campos extras. */
export const answersSchema = z
  .object({
    atuacao: z.enum(optionIds("atuacao")),
    carteira: z.enum(optionIds("carteira")),
    portfolio: z
      .array(z.enum(portfolioIds))
      .min(1)
      .max(portfolioIds.length)
      .refine((list) => new Set(list).size === list.length, "Alternativas repetidas")
      .refine(
        (list) => list.length === 1 || !list.some((id) => exclusivePortfolio.includes(id)),
        "Alternativa exclusiva combinada com outras",
      ),
    mercado: z.enum(optionIds("mercado")),
    comercial: z.enum(optionIds("comercial")),
    capacidade: z.enum(optionIds("capacidade")),
  })
  .strict();

export type ValidationResult = { ok: true; answers: CompleteAnswers } | { ok: false; error: string };

/** Valida e normaliza (ordena o portfólio na ordem das alternativas). */
export function validateAnswers(input: unknown): ValidationResult {
  const parsed = answersSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Respostas inválidas ou incompletas." };
  const a = parsed.data;
  return {
    ok: true,
    answers: { ...a, portfolio: portfolioIds.filter((id) => a.portfolio.includes(id)) },
  };
}
