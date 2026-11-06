import { expect, test } from "@playwright/test";

// fbevents.js real; os envios para facebook.com/tr são interceptados e descartados (nada chega à Meta).
test("âncoras e etapas do diagnóstico não geram PageView extra", async ({ page }) => {
  const sent: string[] = [];
  await page.route(/facebook\.com\/tr/, (route) => {
    sent.push(new URL(route.request().url()).searchParams.get("ev") || "");
    return route.abort();
  });
  await page.goto("/");
  await expect.poll(() => sent.filter((e) => e === "PageView").length, { timeout: 15000 }).toBe(1);
  await page.keyboard.press("Tab");
  await page.getByRole("link", { name: "Ir para o conteúdo" }).click();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Começar diagnóstico" }).click();
  await page.waitForTimeout(1200);
  await page.goBack();
  await page.waitForTimeout(1200);
  expect(sent.filter((e) => e === "PageView")).toHaveLength(1);
});
