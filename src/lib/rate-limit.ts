/*
 * Limite de requisições em memória, por IP, em janela deslizante.
 * Em ambiente serverless cada instância tem sua própria memória: é uma proteção de melhor
 * esforço contra abuso do endpoint de IA, não um limite global. Para um limite global,
 * use um armazenamento compartilhado (ver README, "Limite de requisições").
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, list] of hits) if (list.every((t) => now - t >= windowMs)) hits.delete(k);
  }
  return true;
}
