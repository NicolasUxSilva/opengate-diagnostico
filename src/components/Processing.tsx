export function Processing({ aiEnabled }: { aiEnabled: boolean }) {
  return (
    <section className="processing" aria-live="polite" aria-busy="true">
      <div className="spinner" aria-hidden="true" />
      <h1 tabIndex={-1} data-step-focus className="processing__title">
        {aiEnabled ? "Preparando sua leitura" : "Calculando seu resultado"}
      </h1>
      <p className="processing__text">
        {aiEnabled
          ? "Seu perfil é calculado por regras a partir das respostas. Em seguida, uma IA redige a leitura com base nelas. Isso leva alguns segundos."
          : "Seu perfil é calculado por regras a partir das suas respostas."}
      </p>
    </section>
  );
}
