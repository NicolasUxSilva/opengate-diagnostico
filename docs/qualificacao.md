# Motor de qualificação — matriz, regras e premissas

Código: `src/config/scoring.ts` (valores) e `src/lib/engine/qualify.ts` (lógica).
Testes: `tests/unit/qualify.spec.ts` (inclui varredura de 5.120 combinações de respostas).

> Todos os pesos, notas e limites abaixo são **hipóteses iniciais** construídas a partir do documento
> "Estratégia OpenGate" e da landing page da parceria. Precisam ser validados pelo comercial da OpenGate
> com dados reais de leads (ver "Decisões a validar").

## Fontes usadas

| Fonte | O que foi extraído |
|---|---|
| Estratégia OpenGate (PDF, 4 p.) | Público: integrador profissional, com clientes, postura comercial ("Eu tenho clientes e posso apresentar isso para eles"). Fora do foco: quem não atua profissionalmente, não tem carteira ou busca renda extra. Funil: cada etapa filtra; o formulário confirma se trabalha com segurança eletrônica, se tem empresa, carteira e cliente com oportunidade. |
| Landing page da parceria | Modelo: "Você indica ou instala"; OpenGate cuida da plataforma, integrações e suporte. Perfil buscado: já instala fechaduras, câmeras, alarmes ou controle de acesso; carteira em hospedagem, condomínios ou empresas. Não é para quem busca ganho rápido ou não quer acompanhar os clientes. |
| Site institucional (site-opengate.vercel.app; auditado quando estava em opengatebr.com) | Soluções (hospedagem, condomínios, coworking, estacionamentos, ambientes autônomos, corporativo), integrações com PMS (Stays, Hospedin) e TTLock, acesso por link/código, operação 24h, rastreabilidade. |

## Dimensões e pesos

| Dimensão | Peso | Pergunta(s) |
|---|---|---|
| Atuação profissional no setor | 30% | 1 |
| Carteira de clientes | 30% | 2 |
| Acesso ao mercado prioritário (hospedagem) | 20% | 4 |
| Capacidade e intenção comercial | 20% | 5 (50%) + 6 (50%) |

A pergunta 3 (portfólio) **não pontua**: contextualiza o texto e não exclui quem ainda não oferece controle
de acesso. Ela só pesa em um caso de contradição (abaixo).

## Notas por alternativa (0–100)

| Pergunta | Alternativas |
|---|---|
| 1 Atuação | empresa própria 100 · autônomo 85 · colaborador de empresa do setor 50 · começando 20 · não atua 0 |
| 2 Carteira | ativa e recorrente 100 · clientes retomáveis 70 · poucos clientes 35 · sem carteira 0 |
| 4 Hospedagem | já atende 100 · tem contatos 75 · outros segmentos com potencial 50 · sem acesso 10 |
| 5 Oportunidades | prospecção ativa 100 · durante projetos 80 · indicações/demanda espontânea 45 · sem processo 10 |
| 6 Forma de atuação | vende e implanta 100 · executa com equipe/terceiros 90 · indica 70 · avaliando 25 |

"Indicar" recebe nota alta porque a landing page apresenta a indicação como modalidade oficial
("Você indica ou instala"). A pontuação final é a média ponderada, de 0 a 100.

## Regras (aplicadas nesta ordem)

1. **Perfil C direto** (critérios essenciais ausentes — nenhuma outra resposta compensa):
   - atuação = "começando" ou "não atua"; **ou**
   - carteira = "ainda não construí".
2. **Perfil C por pontuação**: pontuação < **45**.
3. **Perfil A** exige **todos**:
   - atuação = empresa própria ou autônomo (operação própria);
   - carteira = ativa ou retomável;
   - pergunta 5 ≠ "sem processo comercial definido" (capacidade de desenvolver oportunidades);
   - portfólio ≠ "ainda não ofereço soluções" (contradição com operação própria);
   - pontuação ≥ **70**.
4. **Perfil B**: todos os demais. O motivo (qual critério de A faltou) define o "ponto a desenvolver".

### Contradições tratadas

| Situação | Tratamento |
|---|---|
| Diz ter empresa/ser autônomo, mas "ainda não oferece soluções" | Máximo B; o resultado pede para revisar a resposta. |
| Diz ter carteira ativa, mas não atua profissionalmente | C (gate); o resultado reconhece os relacionamentos, mas explica que a parceria pressupõe atuação profissional. |
| Faz prospecção ativa, mas não tem carteira | C (gate); o resultado reconhece a prospecção como ponto a favor. |
| Colaborador de empresa do setor com tudo forte | Máximo B; sugere levar o tema a quem decide na empresa. |

### Distribuição na varredura (portfólios representativos)

5.120 combinações → A = 489 · B = 1.739 · C = 2.892. Essa distribuição não representa o tráfego real;
serve só para confirmar que os três perfis são alcançáveis e que as regras são respeitadas.

## Saída

`qualify()` devolve `profile`, `score`, nível por dimensão (`forte` ≥ 75, `intermediario` ≥ 45, `inicial`),
`reasons` (códigos estáveis) e `flags`. O perfil é recalculado no navegador para conferência: se o
servidor devolver outro perfil, a resposta é descartada e vale a leitura por regras.

## Decisões a validar com a OpenGate

1. **Pesos e limites** (30/30/20/20; A ≥ 70; C < 45). Recomenda-se recalibrar após as primeiras semanas,
   comparando o perfil do diagnóstico com a qualificação feita pelo comercial.
2. **Colaborador de empresa do setor** pode ser parceiro? Hoje fica no máximo em B.
3. **Hospedagem é obrigatória?** Hoje não: a landing page cita também condomínios e empresas. Um integrador
   sem acesso a hospedagem pode chegar a A se o resto for forte.
4. **Indicação x instalação**: confirmar se as duas modalidades seguem valendo e se exigem algo diferente
   (certificação, treinamento, região atendida).
5. **"Clientes retomáveis"** basta para o Perfil A? Hoje sim.
6. **Perfil no Pixel/URL**: hoje o perfil (A/B/C) vai como parâmetro nos eventos do Pixel, mas **não** na URL
   da landing page. Decidir se o comercial quer receber o perfil no formulário (exigiria um campo oculto no
   Framer e revisão de privacidade).
7. **Texto "Sem custo para começar"** e a recorrência citados na landing page **não** são repetidos no
   diagnóstico; confirmar se podem ser usados como argumento.
