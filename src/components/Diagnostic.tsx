"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { questions, type Answers, type CompleteAnswers } from "@/config/questions";
import { site } from "@/config/site";
import { track } from "@/lib/analytics";
import { buildResult, type DiagnosticResult } from "@/lib/engine/narrative";
import { qualify } from "@/lib/engine/qualify";
import { validateAnswers } from "@/lib/engine/validate";
import { captureCampaignParams } from "@/lib/utm";
import { Header } from "./Header";
import { Intro } from "./Intro";
import { Processing } from "./Processing";
import { QuestionStep } from "./QuestionStep";
import { ResultView } from "./ResultView";
import { Review } from "./Review";

type Step = { kind: "intro" } | { kind: "question"; index: number } | { kind: "review" } | { kind: "processing" } | { kind: "result" };

const STORAGE_KEY = "og-diag-state";

interface Saved {
  answers: Answers;
  step: Step;
  result?: DiagnosticResult;
  fallbackNotice?: boolean;
}

function readSaved(): Saved | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

export function Diagnostic() {
  const [step, setStep] = useState<Step>({ kind: "intro" });
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState(false);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [returnToReview, setReturnToReview] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const hydrated = useRef(false);

  // Restaura o progresso da aba (sessionStorage é apagado ao fechar a aba).
  useEffect(() => {
    captureCampaignParams();
    const saved = readSaved();
    if (saved) {
      setAnswers(saved.answers ?? {});
      if (saved.step.kind === "result" && saved.result) {
        setResult(saved.result);
        setFallbackNotice(Boolean(saved.fallbackNotice));
        setStep(saved.step);
      } else if (saved.step.kind === "question" || saved.step.kind === "review") {
        setStep(saved.step);
      }
    }
    hydrated.current = true;
    fetch("/api/diagnostico", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { ai: false }))
      .then((d: { ai?: boolean }) => setAiEnabled(Boolean(d.ai)))
      .catch(() => setAiEnabled(false));
  }, []);

  useEffect(() => {
    if (!hydrated.current || step.kind === "processing") return;
    try {
      const data: Saved = { answers, step, result: result ?? undefined, fallbackNotice };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // segue sem persistência
    }
  }, [answers, step, result, fallbackNotice]);

  // Leva o foco ao conteúdo novo a cada etapa (leitores de tela e teclado).
  const go = useCallback((next: Step) => {
    setStep(next);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0 });
      mainRef.current?.querySelector<HTMLElement>("[data-step-focus]")?.focus({ preventScroll: true });
    });
  }, []);

  const start = () => {
    track("DiagnosticStart");
    go({ kind: "question", index: 0 });
  };

  const restart = () => {
    setAnswers({});
    setResult(null);
    setFallbackNotice(false);
    setReturnToReview(false);
    go({ kind: "intro" });
  };

  const setAnswer = (id: keyof Answers, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const next = (index: number) => {
    if (returnToReview || index === questions.length - 1) {
      setReturnToReview(false);
      go({ kind: "review" });
    } else {
      go({ kind: "question", index: index + 1 });
    }
  };

  const back = (index: number) => {
    if (returnToReview) {
      setReturnToReview(false);
      go({ kind: "review" });
    } else if (index === 0) go({ kind: "intro" });
    else go({ kind: "question", index: index - 1 });
  };

  const edit = (index: number) => {
    setReturnToReview(true);
    go({ kind: "question", index });
  };

  const submit = async () => {
    const validation = validateAnswers(answers);
    if (!validation.ok) {
      const firstMissing = questions.findIndex((q) => {
        const v = answers[q.id];
        return !v || (Array.isArray(v) && v.length === 0);
      });
      go({ kind: "question", index: Math.max(firstMissing, 0) });
      return;
    }
    track("DiagnosticComplete");
    go({ kind: "processing" });
    const final = await fetchResult(validation.answers);
    setResult(final.result);
    setFallbackNotice(final.fallback);
    go({ kind: "result" });
  };

  useEffect(() => {
    if (step.kind === "result" && result) track("DiagnosticResultView", { perfil: result.profile });
  }, [step.kind, result]);

  return (
    <div className="app">
      <Header />
      <main ref={mainRef} className="main" id="conteudo">
        {step.kind === "intro" && <Intro onStart={start} aiEnabled={aiEnabled} />}
        {step.kind === "question" && (
          <QuestionStep
            key={step.index}
            index={step.index}
            total={questions.length}
            question={questions[step.index]}
            value={answers[questions[step.index].id]}
            onChange={(v) => setAnswer(questions[step.index].id, v)}
            onNext={() => next(step.index)}
            onBack={() => back(step.index)}
            nextLabel={returnToReview ? "Salvar e voltar à revisão" : step.index === questions.length - 1 ? "Revisar respostas" : "Avançar"}
          />
        )}
        {step.kind === "review" && (
          <Review answers={answers} onEdit={edit} onSubmit={submit} onBack={() => go({ kind: "question", index: questions.length - 1 })} />
        )}
        {step.kind === "processing" && <Processing aiEnabled={Boolean(aiEnabled)} />}
        {step.kind === "result" && result && (
          <ResultView
            result={result}
            fallbackNotice={fallbackNotice}
            onReview={() => go({ kind: "review" })}
            onRestart={restart}
          />
        )}
      </main>
      <footer className="footer">
        <p>
          © {new Date().getFullYear()} OpenGate ·{" "}
          <a href={site.institutionalUrl} target="_blank" rel="noopener noreferrer">
            {new URL(site.institutionalUrl).hostname}
          </a>
        </p>
      </footer>
    </div>
  );
}

/**
 * Pede a leitura ao servidor. Se o servidor falhar ou não responder, calcula a leitura
 * por regras no próprio navegador (o mesmo motor), para a experiência nunca travar.
 */
async function fetchResult(answers: CompleteAnswers): Promise<{ result: DiagnosticResult; fallback: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35_000);
  try {
    const res = await fetch("/api/diagnostico", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { result?: DiagnosticResult };
    if (!data.result?.profile) throw new Error("Resposta sem resultado");
    // O perfil exibido é sempre o do motor de regras.
    const local = qualify(answers);
    if (data.result.profile !== local.profile) throw new Error("Perfil divergente");
    return { result: data.result, fallback: false };
  } catch {
    return { result: buildResult(answers, qualify(answers)), fallback: true };
  } finally {
    clearTimeout(timer);
  }
}
