import { optionLabel, questions, type Answers } from "@/config/questions";

interface Props {
  answers: Answers;
  onEdit: (index: number) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export function Review({ answers, onEdit, onSubmit, onBack }: Props) {
  return (
    <section className="review" aria-labelledby="review-title">
      <div className="progress">
        <div className="progress__label">
          <span>Revisão</span>
          <span className="progress__topic">Todas as perguntas respondidas</span>
        </div>
        <div className="progress__bar" role="progressbar" aria-label="Progresso do diagnóstico" aria-valuemin={0} aria-valuemax={100} aria-valuenow={100}>
          <div className="progress__fill" style={{ width: "100%" }} />
        </div>
      </div>
      <h1 id="review-title" tabIndex={-1} data-step-focus className="question__title">
        Confira suas respostas
      </h1>
      <p className="question__help">Seu resultado depende delas. Se algo não estiver certo, altere antes de continuar.</p>

      <ol className="review__list">
        {questions.map((q, i) => {
          const v = answers[q.id];
          const list = Array.isArray(v) ? v : v ? [v] : [];
          return (
            <li key={q.id} className="review__item">
              <div>
                <p className="review__q">
                  {i + 1}. {q.short}
                </p>
                <p className="review__a">{list.length ? list.map((id) => optionLabel(q.id, id)).join("; ") : "Sem resposta"}</p>
              </div>
              <button type="button" className="btn btn--link" onClick={() => onEdit(i)} aria-label={`Alterar resposta: ${q.short}`}>
                Alterar
              </button>
            </li>
          );
        })}
      </ol>

      <div className="nav">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          <span aria-hidden="true">←</span> Voltar
        </button>
        <button type="button" className="btn btn--primary" onClick={onSubmit}>
          Ver meu diagnóstico <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
