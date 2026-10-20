import { expect, test } from "@playwright/test";
import { questions, type CompleteAnswers } from "@/config/questions";
import { thresholds, weights } from "@/config/scoring";
import { violatesContentRules } from "@/lib/ai/interpret";
import { buildResult } from "@/lib/engine/narrative";
import { qualify } from "@/lib/engine/qualify";
import { validateAnswers } from "@/lib/engine/validate";
import { rateLimit } from "@/lib/rate-limit";

const ids = (qid: string) => questions.find((q) => q.id === qid)!.options.map((o) => o.id);

const base: CompleteAnswers = {
  atuacao: "empresa",
  carteira: "ativa",
  portfolio: ["cftv", "controle_acesso"],
  mercado: "atende",
  comercial: "prospeccao",
  capacidade: "completo",
};
const make = (over: Partial<CompleteAnswers>): CompleteAnswers => ({ ...base, ...over });

/** Portfólios representativos para a varredura completa. */
const portfolios = [["controle_acesso"], ["cftv", "alarmes"], ["outras"], ["nenhuma"]];

function* allCombinations(): Generator<CompleteAnswers> {
  for (const atuacao of ids("atuacao"))
    for (const carteira of ids("carteira"))
      for (const portfolio of portfolios)
        for (const mercado of ids("mercado"))
          for (const comercial of ids("comercial"))
            for (const capacidade of ids("capacidade"))
              yield { atuacao, carteira, portfolio, mercado, comercial, capacidade };
}

const FORBIDDEN_IN_RULES_TEXT = [/R\$/, /\d+\s?%/, /garant/i, /\blucr/i, /\bfatur/i, /aprovad/i, /undefined/, /\[object/];

test.describe("configuração", () => {
  test("pesos somam 1 e limites são coerentes", () => {
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
    expect(thresholds.profileA).toBeGreaterThan(thresholds.profileB);
  });
});

test.describe("perfis de referência", () => {
  test("A: empresa com carteira ativa, hospedagem e prospecção", () => {
    const q = qualify(base);
    expect(q.profile).toBe("A");
    expect(q.score).toBe(100);
    expect(q.reasons).toEqual(["criterios_a_atendidos"]);
  });

  test("A: autônomo com clientes retomáveis, contatos em hospedagem e indicação", () => {
    const q = qualify(make({ atuacao: "autonomo", carteira: "retomavel", mercado: "contatos", comercial: "projetos", capacidade: "indicacao" }));
    expect(q.profile).toBe("A");
  });

  test("B: atua no setor com poucos clientes", () => {
    const q = qualify(make({ carteira: "pequena" }));
    expect(q.profile).toBe("B");
    expect(q.reasons).toContain("gate_a_carteira");
  });

  test("B: colaborador de empresa do setor nunca chega a A, mesmo com tudo forte", () => {
    const q = qualify(make({ atuacao: "colaborador" }));
    expect(q.profile).toBe("B");
    expect(q.reasons).toContain("gate_a_atuacao");
  });

  test("B: sem processo comercial não chega a A", () => {
    const q = qualify(make({ comercial: "sem_processo" }));
    expect(q.score).toBeGreaterThanOrEqual(thresholds.profileA);
    expect(q.profile).toBe("B");
    expect(q.reasons).toContain("gate_a_comercial");
  });

  test("B: pontuação abaixo de A por falta de mercado e intenção", () => {
    const q = qualify(make({ atuacao: "autonomo", carteira: "retomavel", mercado: "sem_acesso", comercial: "indicacoes", capacidade: "avaliando" }));
    expect(q.score).toBeLessThan(thresholds.profileA);
    expect(q.profile).toBe("B");
    expect(q.reasons).toEqual(["score_abaixo_a"]);
  });

  test("C: ainda não atua profissionalmente", () => {
    expect(qualify(make({ atuacao: "fora" })).profile).toBe("C");
    expect(qualify(make({ atuacao: "iniciando" })).profile).toBe("C");
  });

  test("C: sem carteira", () => {
    const q = qualify(make({ carteira: "nenhuma" }));
    expect(q.profile).toBe("C");
    expect(q.reasons).toContain("gate_c_carteira");
  });

  test("C: colaborador com poucos clientes e respostas iniciais fica abaixo do limite de B", () => {
    const q = qualify(make({ atuacao: "colaborador", carteira: "pequena", mercado: "sem_acesso", comercial: "sem_processo", capacidade: "avaliando" }));
    expect(q.score).toBeLessThan(thresholds.profileB);
    expect(q.profile).toBe("C");
    expect(q.reasons).toEqual(["score_abaixo_b"]);
  });
});

test.describe("respostas contraditórias", () => {
  test("operação própria sem portfólio: sinaliza e limita a B", () => {
    const q = qualify(make({ portfolio: ["nenhuma"] }));
    expect(q.flags).toContain("operacao_sem_portfolio");
    expect(q.profile).toBe("B");
    expect(q.reasons).toContain("gate_a_portfolio");
    const r = buildResult(make({ portfolio: ["nenhuma"] }), q);
    expect(r.opportunity.title).toMatch(/Revisar as soluções/);
    expect(r.note).toBeUndefined(); // não repete a mesma observação
  });

  test("carteira ativa sem atuação profissional: C, com observação", () => {
    const a = make({ atuacao: "fora", carteira: "ativa" });
    const q = qualify(a);
    expect(q.profile).toBe("C");
    expect(q.flags).toContain("carteira_sem_atuacao");
    expect(buildResult(a, q).note).toMatch(/não atuar profissionalmente/);
  });

  test("prospecção ativa sem carteira: C", () => {
    const q = qualify(make({ carteira: "nenhuma", comercial: "prospeccao" }));
    expect(q.profile).toBe("C");
    expect(q.flags).toContain("prospeccao_sem_carteira");
  });

  test("não oferecer controle de acesso não exclui do Perfil A", () => {
    expect(qualify(make({ portfolio: ["cftv", "alarmes"] })).profile).toBe("A");
  });
});

test.describe("varredura de todas as combinações", () => {
  test("invariantes de regra, reprodutibilidade e textos", () => {
    // Acumula as violações e verifica uma vez: milhares de expect() individuais deixam o teste lento.
    const failures: string[] = [];
    const check = (cond: boolean, msg: string, a: CompleteAnswers) => {
      if (!cond && failures.length < 20) failures.push(`${msg} :: ${JSON.stringify(a)}`);
    };
    let count = 0;
    const seen = { A: 0, B: 0, C: 0 };
    for (const a of allCombinations()) {
      count++;
      const q = qualify(a);
      seen[q.profile]++;

      // Reprodutível
      check(JSON.stringify(qualify(a)) === JSON.stringify(q), "resultado não reprodutível", a);
      check(q.score >= 0 && q.score <= 100, "pontuação fora de 0–100", a);

      // Critérios essenciais nunca são compensados por respostas secundárias
      if (["iniciando", "fora"].includes(a.atuacao) || a.carteira === "nenhuma") check(q.profile === "C", "gate C ignorado", a);
      if (q.profile === "A") {
        check(["empresa", "autonomo"].includes(a.atuacao), "A sem operação própria", a);
        check(["ativa", "retomavel"].includes(a.carteira), "A sem carteira", a);
        check(a.comercial !== "sem_processo", "A sem processo comercial", a);
        check(!a.portfolio.includes("nenhuma"), "A sem portfólio", a);
        check(q.score >= thresholds.profileA, "A abaixo do limite", a);
      }

      // Texto do resultado completo, sem promessas nem valores
      const r = buildResult(a, q);
      check(r.profile === q.profile, "perfil do texto diverge", a);
      const texts = [r.summary, ...r.strengths, r.opportunity.title, r.opportunity.text, r.recommendation, r.nextStep, r.cta.text, r.note ?? ""];
      for (const t of texts) {
        check(typeof t === "string", "texto ausente", a);
        for (const re of FORBIDDEN_IN_RULES_TEXT) check(!re.test(String(t)), `${re} em "${t}"`, a);
      }
      check(r.strengths.length >= 1 && r.strengths.length <= 4, "pontos fortes fora de 1–4", a);
      const emphasis = q.profile === "A" ? "primary" : q.profile === "B" ? "secondary" : "subtle";
      check(r.cta.emphasis === emphasis, "ênfase do CTA errada", a);
    }
    expect(failures).toEqual([]);
    expect(count).toBe(5 * 4 * portfolios.length * 4 * 4 * 4);
    expect(seen.A).toBeGreaterThan(0);
    expect(seen.B).toBeGreaterThan(0);
    expect(seen.C).toBeGreaterThan(0);
    console.log(`Combinações testadas: ${count} · A=${seen.A} B=${seen.B} C=${seen.C}`);
  });

  test("os três perfis geram resultados distintos", () => {
    const a = buildResult(base, qualify(base));
    const bAns = make({ carteira: "pequena" });
    const b = buildResult(bAns, qualify(bAns));
    const cAns = make({ atuacao: "fora", carteira: "nenhuma", portfolio: ["nenhuma"] });
    const c = buildResult(cAns, qualify(cAns));
    expect(new Set([a.profileTitle, b.profileTitle, c.profileTitle]).size).toBe(3);
    expect(new Set([a.opportunity.title, b.opportunity.title, c.opportunity.title]).size).toBe(3);
  });

  test("resumo reflete as respostas, sem atribuir o que não foi informado", () => {
    const r = buildResult(make({ portfolio: ["cftv", "alarmes"] }), qualify(make({ portfolio: ["cftv", "alarmes"] })));
    expect(r.summary).toContain("empresa de integração");
    expect(r.summary).toContain("CFTV e alarmes e sensores");
    expect(r.summary).not.toMatch(/controle de acesso e|oferece controle de acesso/);
    expect(r.strengths.join(" ")).not.toMatch(/já oferece controle de acesso/);
  });
});

test.describe("validação de entrada", () => {
  test("aceita respostas completas e normaliza a ordem do portfólio", () => {
    const v = validateAnswers({ ...base, portfolio: ["controle_acesso", "cftv"] });
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.answers.portfolio).toEqual(["cftv", "controle_acesso"]);
  });

  test("rejeita respostas incompletas, desconhecidas, extras e combinações inválidas", () => {
    expect(validateAnswers({ ...base, atuacao: undefined }).ok).toBe(false);
    expect(validateAnswers({ ...base, atuacao: "hacker" }).ok).toBe(false);
    expect(validateAnswers({ ...base, email: "x@y.com" }).ok).toBe(false);
    expect(validateAnswers({ ...base, portfolio: [] }).ok).toBe(false);
    expect(validateAnswers({ ...base, portfolio: ["cftv", "cftv"] }).ok).toBe(false);
    expect(validateAnswers({ ...base, portfolio: ["nenhuma", "cftv"] }).ok).toBe(false);
    expect(validateAnswers(null).ok).toBe(false);
    expect(validateAnswers("texto").ok).toBe(false);
  });
});

test.describe("guarda da saída da IA", () => {
  const ok = {
    summary: "Você tem uma empresa de integração e mantém uma carteira ativa, com relacionamento recorrente com os clientes.",
    strengths: ["Carteira ativa com relacionamento recorrente."],
    opportunityTitle: "Levar acesso automatizado à hospedagem",
    opportunityText: "Check-in fora de horário e senhas fixas são problemas comuns nesse segmento.",
    recommendation: "Escolha dois ou três clientes de hospedagem e mapeie como o acesso é entregue hoje.",
    nextStep: "Conheça a parceria e leve essa lista para a conversa com o comercial.",
  };

  test("aceita texto dentro das regras", () => {
    expect(violatesContentRules(ok)).toBe(false);
  });

  test("bloqueia valores, percentuais, promessas, links e contatos", () => {
    for (const bad of [
      "Você pode ganhar R$ 5.000 por mês.",
      "Aumento de 30% na receita.",
      "Resultado garantido.",
      "Você foi aprovado para a parceria.",
      "Acesse https://exemplo.com",
      "Escreva para contato@exemplo.com",
      "Uma nova renda para você.",
    ]) {
      expect(violatesContentRules({ ...ok, recommendation: bad }), bad).toBe(true);
    }
  });
});

test.describe("limite de requisições", () => {
  test("bloqueia acima do limite e libera após a janela", () => {
    const key = `teste-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 1000, 0)).toBe(true);
    expect(rateLimit(key, 3, 1000, 10)).toBe(false);
    expect(rateLimit(key, 3, 1000, 1500)).toBe(true);
  });
});
