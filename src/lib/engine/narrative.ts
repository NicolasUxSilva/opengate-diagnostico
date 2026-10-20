/*
 * Textos do resultado montados por regras a partir das respostas e do perfil calculado.
 * É o conteúdo padrão (sem IA) e o fallback quando a IA falha.
 *
 * Regras editoriais:
 * - Só afirmar sobre o visitante o que ele respondeu.
 * - Só afirmar sobre a OpenGate o que está em opengatebr.com ou na landing page da parceria
 *   (ver `facts` abaixo). Nada de valores, ganhos, prazos ou aprovação garantida.
 */
import { optionLabel, type CompleteAnswers } from "@/config/questions";
import type { Dimension } from "@/config/scoring";
import type { Flag, Level, Profile, Qualification, Reason } from "./qualify";

export type CtaEmphasis = "primary" | "secondary" | "subtle";

export interface DiagnosticContent {
  summary: string;
  strengths: string[];
  opportunity: { title: string; text: string };
  recommendation: string;
  nextStep: string;
}

export interface DiagnosticResult extends DiagnosticContent {
  profile: Profile;
  profileTitle: string;
  profileLead: string;
  /** Observação sobre respostas que parecem não combinar entre si. */
  note?: string;
  cta: { emphasis: CtaEmphasis; text: string };
  dimensions: { id: Dimension; label: string; level: Level }[];
  source: "rules" | "ai";
}

/** Fatos sobre a OpenGate permitidos nos textos (e enviados à IA como única fonte). */
export const facts = [
  "A OpenGate oferece controle de acesso automatizado: acesso por link, código ou permissão temporária, sem chaves físicas.",
  "Permite liberar check-in e acesso a qualquer hora, sem alguém no local, com histórico completo de acessos e controle por tempo, usuário e unidade.",
  "Tem integrações com PMS de hospedagem (Stays, Hospedin) e com fechaduras compatíveis como a TTLock.",
  "Atende hospedagem e também condomínios, coworkings, estacionamentos, ambientes autônomos e empresas (site institucional).",
  "No programa de parceiros, o parceiro indica a solução ou faz a instalação dos dispositivos de acesso; a OpenGate cuida da plataforma, das integrações e do suporte (landing page).",
  "A landing page descreve o perfil buscado: quem já instala fechaduras, câmeras, alarmes ou controle de acesso e tem carteira em hospedagem, condomínios ou empresas.",
  "A página da parceria explica o modelo e tem um formulário; a equipe comercial entra em contato depois. Não há aprovação automática.",
];

export const profileMeta: Record<Profile, { title: string; lead: string }> = {
  A: {
    title: "Potencial de expansão identificado",
    lead: "Sua operação já reúne o que costuma sustentar uma nova linha de solução: atuação no setor, clientes e capacidade de levar oportunidades adiante.",
  },
  B: {
    title: "Oportunidade em desenvolvimento",
    lead: "Você já atua no mercado. Antes de ampliar o portfólio, há um ponto da operação que vale fortalecer.",
  },
  C: {
    title: "Estruturação da operação",
    lead: "Seu momento é de construir a base da operação. Esta leitura mostra por onde começar.",
  },
};

export const dimensionLabels: Record<Dimension, string> = {
  atuacao: "Atuação profissional no setor",
  carteira: "Carteira de clientes",
  mercado: "Acesso ao mercado de hospedagem",
  comercial: "Capacidade comercial",
};

const RELATED = ["cftv", "alarmes", "automacao", "portaria_remota", "redes"];

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function joinPt(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

function portfolioLabels(a: CompleteAnswers) {
  return a.portfolio
    .filter((id) => id !== "nenhuma" && id !== "outras")
    .map((id) => (id === "cftv" ? "CFTV" : lowerFirst(optionLabel("portfolio", id))));
}

function portfolioPhrase(a: CompleteAnswers) {
  if (a.portfolio.includes("nenhuma")) return "ainda não oferece soluções profissionalmente";
  const labels = portfolioLabels(a);
  if (a.portfolio.includes("outras")) labels.push(labels.length ? "outras soluções" : "soluções fora da lista");
  return `oferece ${joinPt(labels)}`;
}

const atuacaoPhrase: Record<string, string> = {
  empresa: "Você tem uma empresa de integração de segurança eletrônica",
  autonomo: "Você atua como integrador ou instalador autônomo",
  colaborador: "Você trabalha em uma empresa do setor de segurança eletrônica",
  iniciando: "Você está começando a atuar no mercado de segurança eletrônica",
  fora: "Você ainda não atua profissionalmente no setor de segurança eletrônica",
};
const carteiraPhrase: Record<string, string> = {
  ativa: "mantém uma carteira ativa, com relacionamento recorrente",
  retomavel: "tem clientes de projetos anteriores com quem consegue retomar contato",
  pequena: "tem poucos clientes ativos no momento",
  nenhuma: "ainda não construiu uma carteira de clientes",
};
const mercadoPhrase: Record<string, string> = {
  atende: "Já atende pousadas, imóveis de temporada ou negócios semelhantes",
  contatos: "Tem contatos no setor de hospedagem que podem se interessar por esse tipo de solução",
  outros_segmentos: "Atende outros segmentos e vê potencial para desenvolver o setor de hospedagem",
  sem_acesso: "Ainda não tem acesso claro a clientes de hospedagem",
};
const comercialPhrase: Record<string, string> = {
  prospeccao: "encontra novas oportunidades com prospecção ativa",
  projetos: "identifica oportunidades durante projetos, atendimentos e conversas",
  indicacoes: "trabalha principalmente com indicações e demanda espontânea",
  sem_processo: "ainda não tem um processo comercial definido",
};
const capacidadePhrase: Record<string, string> = {
  completo: "Com uma nova solução de controle de acesso, você se vê vendendo e fazendo a implantação",
  com_apoio: "Com uma nova solução de controle de acesso, você desenvolveria a oportunidade e executaria com sua equipe ou com terceiros",
  indicacao: "Com uma nova solução de controle de acesso, você identificaria e indicaria clientes, e quer entender melhor o modelo",
  avaliando: "Você ainda está avaliando como trabalharia com uma solução de controle de acesso",
};

export function buildSummary(a: CompleteAnswers): string {
  return [
    `${atuacaoPhrase[a.atuacao]}, ${carteiraPhrase[a.carteira]} e ${portfolioPhrase(a)}.`,
    `${mercadoPhrase[a.mercado]} e ${comercialPhrase[a.comercial]}.`,
    `${capacidadePhrase[a.capacidade]}.`,
  ].join(" ");
}

function buildStrengths(a: CompleteAnswers): string[] {
  const out: string[] = [];
  if (a.atuacao === "empresa")
    out.push("Empresa própria no setor: estrutura para assumir uma nova linha de solução diante do cliente.");
  if (a.atuacao === "autonomo")
    out.push("Atuação autônoma no setor: você conduz a relação com o cliente do início ao fim.");
  if (a.carteira === "ativa")
    out.push("Carteira ativa com relacionamento recorrente: o caminho mais curto para apresentar algo novo.");
  if (a.carteira === "retomavel")
    out.push("Clientes de projetos anteriores, que podem ser retomados com uma oferta nova.");
  if (a.portfolio.includes("controle_acesso")) {
    out.push("Você já oferece controle de acesso, então a solução OpenGate fica muito próxima do que você já vende.");
  } else {
    const related = a.portfolio.filter((id) => RELATED.includes(id));
    if (related.length) {
      const labels = related.map((id) => (id === "cftv" ? "CFTV" : lowerFirst(optionLabel("portfolio", id))));
      out.push(`Portfólio em ${joinPt(labels)}: os mesmos clientes costumam precisar de controle de acesso.`);
    }
  }
  if (a.mercado === "atende")
    out.push("Presença em hospedagem, segmento em que a OpenGate tem integrações com PMS como Stays e Hospedin.");
  if (a.mercado === "contatos") out.push("Contatos no setor de hospedagem, o mercado prioritário desta campanha.");
  if (a.comercial === "prospeccao")
    out.push("Prospecção ativa: você já tem o hábito de levar soluções novas aos clientes.");
  if (a.comercial === "projetos")
    out.push("Você identifica oportunidades no dia a dia dos projetos, onde a necessidade aparece primeiro.");
  if (a.capacidade === "completo") out.push("Capacidade de vender e implantar com autonomia.");
  if (a.capacidade === "com_apoio") out.push("Capacidade de executar com equipe própria ou parceiros.");

  if (out.length === 0) {
    out.push(
      a.portfolio.includes("nenhuma")
        ? "Clareza sobre o ponto de partida: suas respostas mostram o que construir primeiro."
        : `Você já ${portfolioPhrase(a)}, uma base técnica para crescer no setor.`,
    );
  }
  return out.slice(0, 4);
}

type Block = { title: string; text: string; recommendation: string; nextStep: string };

const blocks: Record<string, Block> = {
  // ── Perfil A: oportunidade definida pelo acesso a hospedagem ──
  a_atende: {
    title: "Levar acesso automatizado aos clientes de hospedagem que você já atende",
    text: "Check-in fora de horário, entrega de chaves e senhas fixas são problemas comuns nesse segmento. São exatamente os pontos que a OpenGate trata com acesso por link ou código e integração com PMS.",
    recommendation:
      "Escolha dois ou três clientes de hospedagem com check-in remoto ou alta rotatividade de hóspedes e mapeie como o acesso é entregue hoje. Esses são os primeiros candidatos a uma conversa.",
    nextStep:
      "Conheça a parceria para ver como a OpenGate divide o trabalho com o parceiro e leve a lista desses clientes para a conversa com o comercial.",
  },
  a_contatos: {
    title: "Transformar seus contatos em hospedagem em primeiras oportunidades",
    text: "Você tem carteira e contatos no setor em que a OpenGate tem integrações prontas. O desafio é converter esses contatos em conversas concretas sobre acesso.",
    recommendation:
      "Liste os contatos de hospedagem que você tem hoje e anote como cada um entrega chaves ou senhas aos hóspedes. Comece pelos que têm mais imóveis ou check-in fora de horário.",
    nextStep:
      "Conheça a parceria para entender o modelo e o apoio oferecido, e use essa lista como ponto de partida da conversa com o comercial.",
  },
  a_outros_segmentos: {
    title: "Abrir hospedagem como um novo segmento a partir da sua operação",
    text: "Sua carteira está em outros segmentos. Hospedagem é o foco desta campanha, mas a OpenGate também atende condomínios, coworkings, estacionamentos e empresas, o que pode aproveitar a carteira atual.",
    recommendation:
      "Separe os clientes atuais em que controle de acesso faz sentido (condomínios, empresas, espaços compartilhados) e, em paralelo, identifique pousadas ou imóveis de temporada na sua região.",
    nextStep:
      "Conheça a parceria e confirme com o comercial em quais segmentos da sua carteira o programa se aplica.",
  },
  a_sem_acesso: {
    title: "Partir da carteira atual, além da hospedagem",
    text: "Você ainda não tem acesso claro a hospedagem. A landing page da parceria cita carteiras em hospedagem, condomínios ou empresas, então a sua carteira atual pode ser o melhor ponto de partida.",
    recommendation:
      "Mapeie quais clientes atuais usam chaves, senhas fixas ou portaria para controlar a entrada. Essa lista mostra onde existe oportunidade sem depender de um mercado novo.",
    nextStep:
      "Conheça a parceria e leve essa lista para avaliar com o comercial quais clientes têm aderência à solução.",
  },
  // ── Perfil B: principal lacuna ──
  b_gate_a_carteira: {
    title: "Ampliar a carteira ativa",
    text: "Você atua no setor, mas com poucos clientes ativos. Uma nova solução rende mais quando há uma base de clientes com quem você conversa com frequência.",
    recommendation:
      "Antes de assumir uma nova linha, retome contato com clientes de projetos anteriores e ofereça revisões ou manutenção. É uma forma de reabrir conversas e entender as necessidades atuais deles.",
    nextStep:
      "Conheça a parceria para entender o modelo e avalie quando sua carteira estará pronta para incluir controle de acesso automatizado.",
  },
  b_gate_a_atuacao: {
    title: "Definir como você atuaria com uma nova solução",
    text: "Você trabalha em uma empresa do setor. A parceria envolve indicar ou instalar a solução para os próprios clientes, então é importante saber se isso aconteceria pela empresa ou por conta própria.",
    recommendation:
      "Converse com a empresa em que você trabalha sobre controle de acesso automatizado. Se ela tiver carteira em hospedagem, condomínios ou empresas, a oportunidade pode ser da empresa como um todo.",
    nextStep:
      "Conheça a parceria e, se fizer sentido, compartilhe a página com quem decide sobre novas soluções na empresa.",
  },
  b_gate_a_comercial: {
    title: "Estruturar um processo comercial",
    text: "Você tem atuação e clientes, mas ainda sem um processo para gerar oportunidades. Sem isso, uma solução nova tende a depender de pedidos espontâneos.",
    recommendation:
      "Defina uma rotina simples: um contato por semana com clientes da carteira para entender mudanças na operação deles. Registre quem usa chaves, senhas fixas ou depende de alguém no local para liberar acesso.",
    nextStep:
      "Conheça a parceria para entender o que a OpenGate assume (plataforma, integrações e suporte) e o que ficaria com você.",
  },
  b_gate_a_portfolio: {
    title: "Revisar as soluções que você oferece hoje",
    text: "Você informou ter operação no setor, mas também que ainda não oferece soluções profissionalmente. Essa combinação muda a leitura, então vale confirmar a resposta.",
    recommendation:
      "Se você já oferece alguma solução, refaça o diagnóstico marcando o que vende hoje. Se ainda não oferece, defina o portfólio inicial antes de assumir uma nova linha.",
    nextStep: "Revise suas respostas ou conheça a parceria para entender o perfil que o programa busca.",
  },
  b_mercado: {
    title: "Ganhar acesso ao mercado de hospedagem",
    text: "Sua operação tem base, mas o acesso a hospedagem, segmento central desta campanha, ainda é limitado.",
    recommendation:
      "Identifique pousadas, imóveis de temporada e administradoras na sua região e veja quem já é atendido por clientes ou parceiros seus. Uma indicação costuma abrir a primeira conversa.",
    nextStep:
      "Conheça a parceria e confirme com o comercial se outros segmentos da sua carteira, como condomínios ou empresas, também se aplicam.",
  },
  b_comercial: {
    title: "Tornar a geração de oportunidades mais ativa",
    text: "Suas oportunidades hoje vêm sobretudo de indicações ou de uma intenção ainda indefinida. Uma solução nova precisa ser apresentada, não só pedida.",
    recommendation:
      "Escolha os clientes da carteira com mais rotatividade de pessoas (hóspedes, moradores, colaboradores) e apresente a eles o tema de acesso sem chave. É onde o problema aparece com mais frequência.",
    nextStep:
      "Conheça a parceria para decidir se você atuaria indicando ou instalando, e com que apoio.",
  },
  // ── Perfil C: base a construir ──
  c_gate_c_atuacao: {
    title: "Consolidar sua atuação profissional no setor",
    text: "A parceria é voltada a quem já atua profissionalmente com segurança eletrônica. Hoje, sua prioridade é construir essa atuação.",
    recommendation:
      "Concentre-se em uma ou duas soluções (por exemplo, CFTV ou controle de acesso), conclua os primeiros projetos com qualidade e registre cada cliente atendido. Essa é a base da sua futura carteira.",
    nextStep:
      "Refaça este diagnóstico quando tiver os primeiros clientes recorrentes. A página da parceria continua disponível se quiser conhecer o perfil que o programa busca.",
  },
  c_gate_c_carteira: {
    title: "Construir sua primeira carteira de clientes",
    text: "Você atua no setor, mas ainda sem carteira. A parceria pressupõe clientes a quem apresentar a solução.",
    recommendation:
      "Defina um segmento inicial (condomínios, pequenos comércios ou pousadas da sua região) e transforme cada projeto em relacionamento: pós-venda, manutenção e revisões periódicas.",
    nextStep:
      "Volte ao diagnóstico quando tiver clientes ativos. Se quiser, conheça a página da parceria para entender o perfil buscado.",
  },
  c_score_abaixo_b: {
    title: "Fortalecer carteira e processo comercial",
    text: "Você atua no setor, mas carteira, acesso a hospedagem e geração de oportunidades ainda estão em fase inicial.",
    recommendation:
      "Escolha o ponto mais fraco entre carteira e processo comercial e trabalhe nele primeiro, com metas simples: retomar contato com clientes antigos e registrar cada oportunidade identificada.",
    nextStep:
      "Refaça o diagnóstico quando sua carteira estiver mais ativa. A página da parceria mostra o perfil que o programa busca hoje.",
  },
};

const notes: Partial<Record<Flag, string>> = {
  operacao_sem_portfolio:
    "Você indicou ter operação no setor, mas também que ainda não oferece soluções profissionalmente. Se uma das respostas não estiver certa, revise para uma leitura mais precisa.",
  carteira_sem_atuacao:
    "Você informou ter clientes, mas ainda não atuar profissionalmente no setor. Esses relacionamentos são um ativo, mas a parceria pressupõe atuação profissional em segurança eletrônica.",
  prospeccao_sem_carteira:
    "Você já faz prospecção ativa, o que ajuda a construir a carteira mais rápido.",
};

const B_PRIORITY: Reason[] = ["gate_a_portfolio", "gate_a_atuacao", "gate_a_carteira", "gate_a_comercial"];

function pickBlock(profile: Profile, q: Qualification, a: CompleteAnswers): Block {
  if (profile === "A") return blocks[`a_${a.mercado}`];
  if (profile === "C") return blocks[`c_${q.reasons[0]}`];
  const gate = B_PRIORITY.find((r) => q.reasons.includes(r));
  if (gate) return blocks[`b_${gate}`];
  // Só "score_abaixo_a": a lacuna é a dimensão mais fraca entre mercado e comercial.
  return q.dimensions.mercado.score <= q.dimensions.comercial.score ? blocks.b_mercado : blocks.b_comercial;
}

const ctaText: Record<Profile, { emphasis: CtaEmphasis; text: string }> = {
  A: {
    emphasis: "primary",
    text: "Suas respostas se aproximam do perfil que a OpenGate descreve para o programa de parceiros. Na página da parceria você vê como o modelo funciona e pode enviar seus dados. A avaliação final é feita pela equipe comercial.",
  },
  B: {
    emphasis: "secondary",
    text: "Se quiser entender o modelo antes de decidir, a página da parceria explica como funciona e qual perfil o programa busca.",
  },
  C: {
    emphasis: "subtle",
    text: "A página da parceria descreve o perfil que o programa busca hoje.",
  },
};

export function buildResult(a: CompleteAnswers, q: Qualification): DiagnosticResult {
  const block = pickBlock(q.profile, q, a);
  // A lacuna de portfólio já vira o bloco principal no Perfil B; não repete como observação.
  const note = q.flags
    .filter((f) => !(f === "operacao_sem_portfolio" && q.reasons.includes("gate_a_portfolio")))
    .map((f) => notes[f])
    .find(Boolean);
  return {
    profile: q.profile,
    profileTitle: profileMeta[q.profile].title,
    profileLead: profileMeta[q.profile].lead,
    summary: buildSummary(a),
    strengths: buildStrengths(a),
    opportunity: { title: block.title, text: block.text },
    recommendation: block.recommendation,
    nextStep: block.nextStep,
    note,
    cta: ctaText[q.profile],
    dimensions: (Object.keys(dimensionLabels) as Dimension[]).map((id) => ({
      id,
      label: dimensionLabels[id],
      level: q.dimensions[id].level,
    })),
    source: "rules",
  };
}
