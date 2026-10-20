"use client";

import { useState } from "react";
import type { Question } from "@/config/questions";

interface Props {
  index: number;
  total: number;
  question: Question;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
  onNext: () => void;
  onBack: () => void;
  nextLabel: string;
}

export function QuestionStep({ index, total, question, value, onChange, onNext, onBack, nextLabel }: Props) {
  const [showError, setShowError] = useState(false);
  const multiple = question.type === "multiple";
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const answered = selected.length > 0;
  const errorId = `erro-${question.id}`;
  const progress = Math.round(((index + (answered ? 1 : 0)) / total) * 100);

  const toggle = (optionId: string) => {
    setShowError(false);
    if (!multiple) return onChange(optionId);
    const option = question.options.find((o) => o.id === optionId);
    if (selected.includes(optionId)) return onChange(selected.filter((id) => id !== optionId));
    if (option?.exclusive) return onChange([optionId]);
    const exclusiveIds = question.options.filter((o) => o.exclusive).map((o) => o.id);
    onChange([...selected.filter((id) => !exclusiveIds.includes(id)), optionId]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answered) return setShowError(true);
    onNext();
  };

  return (
    <form className="question" onSubmit={submit} noValidate>
      <div className="progress">
        <div className="progress__label">
          <span>
            Pergunta {index + 1} de {total}
          </span>
          <span className="progress__topic">{question.short}</span>
        </div>
        <div
          className="progress__bar"
          role="progressbar"
          aria-label="Progresso do diagnóstico"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className="progress__fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <fieldset className="question__fieldset" aria-describedby={showError ? errorId : undefined}>
        <legend className="question__legend">
          <h1 tabIndex={-1} data-step-focus className="question__title">
            {question.title}
          </h1>
          {question.help && <p className="question__help">{question.help}</p>}
        </legend>

        <div className="options">
          {question.options.map((option) => {
            const checked = selected.includes(option.id);
            return (
              <label key={option.id} className={`option${checked ? " option--checked" : ""}${multiple ? " option--multi" : ""}`}>
                <input
                  type={multiple ? "checkbox" : "radio"}
                  name={question.id}
                  value={option.id}
                  checked={checked}
                  onChange={() => toggle(option.id)}
                  className="option__input"
                />
                <span className="option__indicator" aria-hidden="true" />
                <span className="option__label">{option.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {showError && (
        <p className="field-error" id={errorId} role="alert">
          {multiple ? "Selecione ao menos uma alternativa para continuar." : "Selecione uma alternativa para continuar."}
        </p>
      )}

      <div className="nav">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          <span aria-hidden="true">←</span> Voltar
        </button>
        <button type="submit" className={`btn btn--primary${answered ? "" : " btn--pending"}`}>
          {nextLabel} <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  );
}
