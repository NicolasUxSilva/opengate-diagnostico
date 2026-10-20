import { expect, test, type Page } from "@playwright/test";

const PARTNER = "https://integradores-opengate.framer.website";

type Pick = { single?: string; multi?: string[] };

/** Respostas por texto visível da alternativa, na ordem das perguntas. */
const PROFILE_A: Pick[] = [
  { single: "Tenho uma empresa de integração" },
  { single: "Tenho uma carteira ativa" },
  { multi: ["CFTV", "Controle de acesso"] },
  { single: "Já atendo pousadas" },
  { single: "Faço prospecção ativa" },
  { single: "Posso identificar clientes, vender" },
];
const PROFILE_B: Pick[] = [
  { single: "Trabalho como integrador ou instalador autônomo" },
  { single: "Tenho poucos clientes ativos" },
  { multi: ["Alarmes e sensores"] },
  { single: "Atendo outros segmentos" },
  { single: "Trabalho principalmente com indicações" },
  { single: "Posso identificar e indicar" },
];
const PROFILE_C: Pick[] = [
  { single: "Ainda não atuo profissionalmente" },
  { single: "Ainda não construí uma carteira" },
  { multi: ["Ainda não ofereço soluções"] },
  { single: "Ainda não tenho acesso claro" },
  { single: "Ainda não tenho um processo comercial" },
  { single: "Ainda estou avaliando" },
];

async function answer(page: Page, pick: Pick) {
  for (const label of pick.multi ?? [pick.single!]) {
    await page.locator("label.option", { hasText: label }).click();
  }
}

async function completeQuiz(page: Page, picks: Pick[]) {
  await page.getByRole("button", { name: "Começar diagnóstico" }).click();
  for (let i = 0; i < picks.length; i++) {
    await expect(page.getByText(`Pergunta ${i + 1} de ${picks.length}`)).toBeVisible();
    await answer(page, picks[i]);
    await page.locator("form.question button[type=submit]").click();
  }
  await expect(page.getByRole("heading", { name: "Confira suas respostas" })).toBeVisible();
  await page.getByRole("button", { name: "Ver meu diagnóstico" }).click();
  await expect(page.getByText("Seu resultado")).toBeVisible();
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

// Cada teste roda em um contexto novo do navegador, então o sessionStorage começa vazio.

test("entrada carrega com título, CTA e sem erros de console", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("próxima oportunidade");
  await expect(page.getByText("6 perguntas · cerca de 2 minutos · sem cadastro")).toBeVisible();
  await expect(page.getByRole("button", { name: "Começar diagnóstico" })).toBeVisible();
  // Destaque do título no verde dos botões e links para o site institucional atual
  await expect(page.locator(".intro__title .accent")).toHaveCSS("color", "rgb(146, 177, 16)");
  await expect(page.locator(".header__logo")).toHaveAttribute("href", "https://site-opengate.vercel.app");
  await expect(page.locator(".footer a")).toHaveAttribute("href", "https://site-opengate.vercel.app");
  await expect(page.locator(".footer a")).toHaveText("site-opengate.vercel.app");
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("Perfil A: fluxo completo, CTA prioritário com parâmetros de campanha", async ({ page }) => {
  await page.goto("/?utm_source=meta&utm_campaign=integradores&nome=Fulano");
  await completeQuiz(page, PROFILE_A);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Potencial de expansão identificado");
  await expect(page.getByText("Principal oportunidade")).toBeVisible();
  await expect(page.getByText("Levar acesso automatizado aos clientes de hospedagem")).toBeVisible();
  await expect(page.getByText(/Você tem uma empresa de integração/)).toBeVisible();

  const cta = page.getByRole("link", { name: /Conhecer a parceria OpenGate/ });
  await expect(cta).toHaveClass(/btn--primary/);
  const href = await cta.getAttribute("href");
  const url = new URL(href!);
  expect(`${url.origin}`).toBe(PARTNER);
  expect(url.searchParams.get("utm_source")).toBe("meta");
  expect(url.searchParams.get("utm_campaign")).toBe("integradores");
  expect(url.searchParams.get("origem")).toBe("diagnostico");
  // Nada além dos parâmetros permitidos (nem respostas, nem dados pessoais)
  expect([...url.searchParams.keys()].sort()).toEqual(["origem", "utm_campaign", "utm_source"]);
  await expectNoHorizontalScroll(page);
});

test("Perfil B: resultado distinto e CTA secundário", async ({ page }) => {
  await page.goto("/");
  await completeQuiz(page, PROFILE_B);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Oportunidade em desenvolvimento");
  await expect(page.getByText("Ponto a desenvolver")).toBeVisible();
  await expect(page.getByText("Ampliar a carteira ativa")).toBeVisible();
  await expect(page.getByRole("link", { name: /Conhecer a parceria OpenGate/ })).toHaveClass(/btn--outline/);
  await expectNoHorizontalScroll(page);
});

test("Perfil C: resultado distinto, sem recomendação prioritária da parceria", async ({ page }) => {
  await page.goto("/");
  await completeQuiz(page, PROFILE_C);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Estruturação da operação");
  await expect(page.getByText("Prioridade agora")).toBeVisible();
  await expect(page.getByText("Consolidar sua atuação profissional no setor")).toBeVisible();
  const cta = page.getByRole("link", { name: /Conhecer a parceria OpenGate/ });
  await expect(cta).toHaveClass(/btn--link/);
  await expect(page.getByText(/reprovad|desqualificad|não serve/i)).toHaveCount(0);
});

test("navegação: validação, voltar mantém resposta, progresso e revisão com edição", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Começar diagnóstico" }).click();

  // Avançar sem resposta mostra erro e não avança
  await page.locator("form.question button[type=submit]").click();
  await expect(page.locator(".field-error")).toHaveText("Selecione uma alternativa para continuar.");
  await expect(page.getByText("Pergunta 1 de 6")).toBeVisible();

  const bar = page.getByRole("progressbar");
  await expect(bar).toHaveAttribute("aria-valuenow", "0");
  await answer(page, PROFILE_A[0]);
  await expect(bar).toHaveAttribute("aria-valuenow", "17");
  await expect(page.locator(".field-error")).toHaveCount(0);
  await page.locator("form.question button[type=submit]").click();
  await expect(page.getByText("Pergunta 2 de 6")).toBeVisible();

  // Voltar preserva a resposta anterior
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page.getByText("Pergunta 1 de 6")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Tenho uma empresa de integração/ })).toBeChecked();
  await page.locator("form.question button[type=submit]").click();

  for (let i = 1; i < PROFILE_A.length; i++) {
    await answer(page, PROFILE_A[i]);
    await page.locator("form.question button[type=submit]").click();
  }

  // Revisão: alterar a carteira muda o perfil para B
  await expect(page.getByText("Tenho uma carteira ativa e mantenho relacionamento")).toBeVisible();
  await page.getByRole("button", { name: "Alterar resposta: Carteira de clientes" }).click();
  await expect(page.getByText("Pergunta 2 de 6")).toBeVisible();
  await answer(page, { single: "Tenho poucos clientes ativos" });
  await page.getByRole("button", { name: /Salvar e voltar à revisão/ }).click();
  await expect(page.getByText("Tenho poucos clientes ativos.")).toBeVisible();
  await page.getByRole("button", { name: "Ver meu diagnóstico" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Oportunidade em desenvolvimento");

  // Refazer volta ao início e limpa as respostas
  await page.getByRole("button", { name: "Refazer diagnóstico" }).click();
  await page.getByRole("button", { name: "Começar diagnóstico" }).click();
  await expect(page.getByRole("radio", { name: /Tenho uma empresa de integração/ })).not.toBeChecked();
});

test("múltipla escolha: alternativa exclusiva desmarca as demais", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Começar diagnóstico" }).click();
  for (let i = 0; i < 2; i++) {
    await answer(page, PROFILE_A[i]);
    await page.locator("form.question button[type=submit]").click();
  }
  await expect(page.getByText("Pergunta 3 de 6")).toBeVisible();
  const cftv = page.getByRole("checkbox", { name: "CFTV" });
  const nenhuma = page.getByRole("checkbox", { name: /Ainda não ofereço/ });
  await answer(page, { multi: ["CFTV", "Automação"] });
  await expect(cftv).toBeChecked();
  await answer(page, { multi: ["Ainda não ofereço"] });
  await expect(nenhuma).toBeChecked();
  await expect(cftv).not.toBeChecked();
  await answer(page, { multi: ["CFTV"] });
  await expect(nenhuma).not.toBeChecked();
});

test("teclado: responder e avançar sem mouse", async ({ page, isMobile }) => {
  test.skip(isMobile, "fluxo de teclado validado no desktop");
  await page.goto("/");
  await page.getByRole("button", { name: "Começar diagnóstico" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Pergunta 1 de 6")).toBeVisible();
  await page.keyboard.press("Tab"); // primeiro radio
  await page.keyboard.press("Space");
  await expect(page.getByRole("radio", { name: /Tenho uma empresa de integração/ })).toBeChecked();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: /autônomo/ })).toBeChecked();
  await page.keyboard.press("Tab"); // Voltar
  await page.keyboard.press("Tab"); // Avançar
  await page.keyboard.press("Enter");
  await expect(page.getByText("Pergunta 2 de 6")).toBeVisible();
});

test("falha do servidor não trava: mostra leitura por regras com aviso", async ({ page }) => {
  await page.route("**/api/diagnostico", (route) =>
    route.request().method() === "POST" ? route.fulfill({ status: 500, body: "erro" }) : route.continue(),
  );
  await page.goto("/");
  await completeQuiz(page, PROFILE_A);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Potencial de expansão identificado");
  await expect(page.getByRole("status")).toContainText("Não conseguimos falar com o servidor");
});

test("perfil divergente vindo do servidor é descartado (a IA não altera a classificação)", async ({ page }) => {
  await page.route("**/api/diagnostico", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const res = await route.fetch();
    const json = await res.json();
    json.result.profile = "A";
    json.result.profileTitle = "Potencial de expansão identificado";
    await route.fulfill({ response: res, json });
  });
  await page.goto("/");
  await completeQuiz(page, PROFILE_C);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Estruturação da operação");
});

test("progresso sobrevive a recarregar a página", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Começar diagnóstico" }).click();
  await answer(page, PROFILE_A[0]);
  await page.locator("form.question button[type=submit]").click();
  await expect(page.getByText("Pergunta 2 de 6")).toBeVisible();
  await page.evaluate(() => window.location.reload());
  await expect(page.getByText("Pergunta 2 de 6")).toBeVisible();
});

test.describe("API", () => {
  test("GET informa se a IA está ativa", async ({ request }) => {
    const res = await request.get("/api/diagnostico");
    expect(res.ok()).toBe(true);
    expect(typeof (await res.json()).ai).toBe("boolean");
  });

  test("POST rejeita respostas inválidas e aceita válidas", async ({ request }) => {
    const bad = await request.post("/api/diagnostico", { data: { answers: { atuacao: "x" } } });
    expect(bad.status()).toBe(422);
    const extra = await request.post("/api/diagnostico", {
      data: { answers: { atuacao: "empresa", carteira: "ativa", portfolio: ["cftv"], mercado: "atende", comercial: "prospeccao", capacidade: "completo", email: "a@b.c" } },
    });
    expect(extra.status()).toBe(422);
    const ok = await request.post("/api/diagnostico", {
      data: { answers: { atuacao: "empresa", carteira: "ativa", portfolio: ["cftv"], mercado: "atende", comercial: "prospeccao", capacidade: "completo" } },
    });
    expect(ok.status()).toBe(200);
    const body = await ok.json();
    expect(body.result.profile).toBe("A");
    expect(["rules", "ai"]).toContain(body.result.source);
  });
});
