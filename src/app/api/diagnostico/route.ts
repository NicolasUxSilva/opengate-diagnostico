import { NextResponse } from "next/server";
import { interpretWithAi, isAiConfigured } from "@/lib/ai/interpret";
import { buildResult } from "@/lib/engine/narrative";
import { qualify } from "@/lib/engine/qualify";
import { validateAnswers } from "@/lib/engine/validate";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY_BYTES = 4_000;
/** Requisições por IP a cada 10 minutos (por instância). Configurável por RATE_LIMIT_MAX. */
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 12;

/** Informa ao cliente se a leitura terá IA (para o estado de processamento ser honesto). */
export function GET() {
  return NextResponse.json({ ai: isAiConfigured() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(ip, RATE_LIMIT_MAX, 10 * 60_000)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Requisição muito grande." }, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const validation = validateAnswers((body as { answers?: unknown })?.answers);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 422 });

  const answers = validation.answers;
  const qualification = qualify(answers);
  const base = buildResult(answers, qualification);

  // As respostas não são armazenadas: são processadas e descartadas ao fim da requisição.
  const ai = await interpretWithAi(answers, base);
  const result = ai.ok ? { ...base, ...ai.content, source: "ai" as const } : base;

  return NextResponse.json(
    { result, aiStatus: ai.ok ? "ok" : ai.reason },
    { headers: { "Cache-Control": "no-store" } },
  );
}
