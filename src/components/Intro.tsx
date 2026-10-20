import { questions } from "@/config/questions";

const analyzed = [
  { title: "Atuação no setor", text: "Como você trabalha hoje com segurança eletrônica." },
  { title: "Carteira de clientes", text: "Com quem você tem relacionamento e o que já oferece." },
  { title: "Mercado de hospedagem", text: "Seu acesso a pousadas, imóveis de temporada e negócios parecidos." },
  { title: "Forma de vender", text: "Como você encontra oportunidades e como atuaria com uma nova solução." },
];

export function Intro({ onStart, aiEnabled }: { onStart: () => void; aiEnabled: boolean | null }) {
  return (
    <section className="intro" aria-labelledby="intro-title">
      <p className="eyebrow">Para integradores de segurança eletrônica</p>
      <h1 id="intro-title" tabIndex={-1} data-step-focus className="intro__title">
        Onde está a próxima oportunidade <span className="accent">na sua carteira de clientes?</span>
      </h1>
      <p className="intro__lead">
        Responda {questions.length} perguntas sobre sua operação e receba uma leitura do seu momento: pontos fortes, principal
        oportunidade e um próximo passo prático.
      </p>

      <div className="intro__actions">
        <button type="button" className="btn btn--primary btn--lg" onClick={onStart}>
          Começar diagnóstico
          <span aria-hidden="true">→</span>
        </button>
        <p className="intro__meta">{questions.length} perguntas · cerca de 2 minutos · sem cadastro</p>
      </div>

      <h2 className="intro__subtitle">O que vamos analisar</h2>
      <ul className="analyzed">
        {analyzed.map((item, i) => (
          <li key={item.title} className="analyzed__item">
            <span className="analyzed__num" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="privacy">
        Não pedimos nome, contato ou dados dos seus clientes. Suas respostas não são armazenadas
        {aiEnabled
          ? " e são enviadas a um provedor de inteligência artificial (Anthropic) apenas para redigir a sua leitura."
          : "."}
      </p>
    </section>
  );
}
