/*
 * Questionário do Diagnóstico de Operação.
 *
 * Para alterar a redação, edite `title`, `help` e `label`. Os `id` das perguntas e das
 * alternativas são usados pelo motor de qualificação (src/config/scoring.ts) e pelos
 * textos do resultado (src/lib/engine/narrative.ts) — se renomear um id, atualize-os também.
 * A finalidade estratégica de cada pergunta está em `purpose` (não é exibida ao visitante).
 */

export type QuestionId = "atuacao" | "carteira" | "portfolio" | "mercado" | "comercial" | "capacidade";

export interface Option {
  id: string;
  label: string;
  /** Em perguntas de múltipla escolha, marca a alternativa que desmarca as demais. */
  exclusive?: boolean;
}

export interface Question {
  id: QuestionId;
  type: "single" | "multiple";
  /** Rótulo curto exibido na revisão e no progresso. */
  short: string;
  title: string;
  help?: string;
  purpose: string;
  options: Option[];
}

export const questions: Question[] = [
  {
    id: "atuacao",
    type: "single",
    short: "Atuação",
    title: "Como você atua hoje no mercado de segurança eletrônica?",
    purpose: "Compreender a atuação profissional atual (critério essencial).",
    options: [
      { id: "empresa", label: "Tenho uma empresa de integração de segurança eletrônica." },
      { id: "autonomo", label: "Trabalho como integrador ou instalador autônomo." },
      { id: "colaborador", label: "Trabalho em uma empresa do setor." },
      { id: "iniciando", label: "Estou começando a atuar nesse mercado." },
      { id: "fora", label: "Ainda não atuo profissionalmente no setor." },
    ],
  },
  {
    id: "carteira",
    type: "single",
    short: "Carteira de clientes",
    title: "Como está sua carteira de clientes hoje?",
    purpose: "Avaliar o acesso a potenciais compradores (critério essencial).",
    options: [
      { id: "ativa", label: "Tenho uma carteira ativa e mantenho relacionamento recorrente com os clientes." },
      { id: "retomavel", label: "Tenho clientes de projetos anteriores e consigo retomar o contato." },
      { id: "pequena", label: "Tenho poucos clientes ativos." },
      { id: "nenhuma", label: "Ainda não construí uma carteira de clientes." },
    ],
  },
  {
    id: "portfolio",
    type: "multiple",
    short: "Soluções oferecidas",
    title: "Quais soluções você já oferece aos seus clientes?",
    help: "Marque todas que se aplicam.",
    purpose: "Contextualizar a proximidade do portfólio com controle de acesso. Não exclui ninguém.",
    options: [
      { id: "cftv", label: "CFTV" },
      { id: "controle_acesso", label: "Controle de acesso" },
      { id: "alarmes", label: "Alarmes e sensores" },
      { id: "automacao", label: "Automação" },
      { id: "portaria_remota", label: "Portaria remota" },
      { id: "redes", label: "Redes e infraestrutura" },
      { id: "outras", label: "Outras soluções" },
      { id: "nenhuma", label: "Ainda não ofereço soluções profissionalmente", exclusive: true },
    ],
  },
  {
    id: "mercado",
    type: "single",
    short: "Hospedagem e outros segmentos",
    title: "Você atende ou tem acesso a clientes do setor de hospedagem?",
    help: "Pousadas, imóveis de temporada, administradoras e negócios parecidos.",
    purpose: "Medir a proximidade com o mercado prioritário apresentado na campanha.",
    options: [
      { id: "atende", label: "Já atendo pousadas, imóveis de temporada ou negócios semelhantes." },
      { id: "contatos", label: "Tenho contatos que poderiam se interessar por esse tipo de solução." },
      { id: "outros_segmentos", label: "Atendo outros segmentos e vejo potencial para desenvolver esse mercado." },
      { id: "sem_acesso", label: "Ainda não tenho acesso claro a esse tipo de cliente." },
    ],
  },
  {
    id: "comercial",
    type: "single",
    short: "Novas oportunidades",
    title: "Como você costuma identificar novas oportunidades na sua carteira?",
    purpose: "Avaliar a capacidade de desenvolver oportunidades comerciais.",
    options: [
      { id: "prospeccao", label: "Faço prospecção ativa e apresento novas soluções aos clientes." },
      { id: "projetos", label: "Identifico oportunidades durante projetos, atendimentos e conversas." },
      { id: "indicacoes", label: "Trabalho principalmente com indicações e demanda espontânea." },
      { id: "sem_processo", label: "Ainda não tenho um processo comercial definido." },
    ],
  },
  {
    id: "capacidade",
    type: "single",
    short: "Forma de atuação",
    title: "Como você poderia trabalhar com uma nova solução de controle de acesso?",
    purpose: "Compreender a modalidade de participação possível (indicação ou instalação, conforme a landing page).",
    options: [
      { id: "completo", label: "Posso identificar clientes, vender a solução e fazer a implantação." },
      { id: "com_apoio", label: "Posso desenvolver a oportunidade e executar com minha equipe ou com terceiros." },
      { id: "indicacao", label: "Posso identificar e indicar clientes, mas preciso entender melhor o modelo." },
      { id: "avaliando", label: "Ainda estou avaliando como poderia trabalhar com esse tipo de solução." },
    ],
  },
];

export type Answers = {
  atuacao?: string;
  carteira?: string;
  portfolio?: string[];
  mercado?: string;
  comercial?: string;
  capacidade?: string;
};

export type CompleteAnswers = Required<Answers>;

export function getQuestion(id: QuestionId): Question {
  const q = questions.find((x) => x.id === id);
  if (!q) throw new Error(`Pergunta desconhecida: ${id}`);
  return q;
}

export function optionLabel(id: QuestionId, optionId: string): string {
  return getQuestion(id).options.find((o) => o.id === optionId)?.label ?? optionId;
}
