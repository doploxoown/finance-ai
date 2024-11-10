"use server";

import { db } from "@/app/_lib/prisma";
import { auth, clerkClient } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { GenerateAiReportSchema, generateAiReportSchema } from "./schema";
import {
  TRANSACTION_CATEGORY_LABELS,
  TRANSACTION_TYPE_LABELS,
} from "@/app/_constants/transactions";

export const generateAiReport = async ({ month }: GenerateAiReportSchema) => {
  generateAiReportSchema.parse({ month });
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await clerkClient().users.getUser(userId);
  const hasPremiumPlan = user.publicMetadata.subscriptionPlan == "premium";

  if (!hasPremiumPlan) {
    throw new Error("You need a premium plan to generate AI reports");
  }

  const DUMMY_REPORT =
    '"**Relatório de Finanças Pessoais Teste - Novembro de 2024**\n\n**Resumo das Transações:**\n\nNesta análise, considerarei as transações informadas para compreender melhor sua situação financeira e fornecer orientações estratégicas para melhorar sua gestão financeira.\n\n**Receitas:**\n- ***Salário Líquido: R$ 6.397,58***\n\n**Despesas Totais:**\n- **Utilidades:**\n  - Internet Vivo: R$ 150,00\n  - Crédito Celular Vivo: R$ 60,00\n  - Cartão de Crédito Black: R$ 1.777,00\n- **Transporte:**\n  - Financiamento Carro TCross: R$ 3.110,00\n- **Moradia:**\n  - Conta Energia ENEL: R$ 240,00\n- **Entretenimento:**\n  - Cartão de Crédito NuBank: R$ 790,00\n\n**Total de Despesas:**\nR$ 150,00 (Utilidades - Internet) + R$ 60,00 (Utilidades - Celular) + R$ 1.777,00 (Utilidades - Cartão de Crédito Black) + R$ 3.110,00 (Transporte - Financiamento Carro) + R$ 240,00 (Moradia - Energia) + R$ 790,00 (Entretenimento - Cartão de Crédito NuBank) = R$ 6.127,00\n\n**Saldo:**\nR$ 6.397,58 (Receitas) - R$ 6.127,00 (Despesas) = R$ 270,58\n\n---\n\n**Insights e Dicas:**\n\n1. **Análise de Despesas:**\n   - Suas despesas estão bastante elevadas, principalmente em categorias como Transporte e Utilidades. O financiamento do carro e o uso do cartão de crédito são os principais problemas a serem abordados.\n\n2. **Controle de Cartão de Crédito:**\n   - O uso do cartão de crédito Black, com gastos altos, pode indicar necessidade de revisão. Tente reduzir o uso do crédito ou mantenha um controle rígido dos gastos para evitar surpresas no fechamento da fatura.\n\n3. **Orçamento Mensal:**\n   - Crie um orçamento mensal para cada categoria. Defina limites de gastos e tente respeitá-los. Isso ajudará a ter uma visão mais clara de onde está indo seu dinheiro e como você pode economizar.\n\n4. **Fundo de Emergência:**\n   - É importante ter uma reserva financeira. Tente economizar uma parte do saldo positivo (R$ 270,58) mensalmente e gradualmente crie um fundo que cubra pelo menos 3 a 6 meses de despesas.\n\n5. **Despesas Fixas e Variáveis:**\n   - Separe suas despesas em fixas (como casa e financiamento) e variáveis (entretenimento e utilidades). Isso ajudará a identificar onde é possível cortar gastos não essenciais.\n\n6. **Priorize as Economias:**\n   - Considere renegociar opções de financiamento e buscando alternativas mais acessíveis, como mudanças de planos de internet e celular, que podem oferecer preços mais competentes.\n\n7. **Monitoramento Regular:**\n   - Revise suas despesas e receitas mensalmente para identificar padrões e onde pode melhorar. Use aplicativos de finanças pessoais que ajudam a categorizar e monitorar seus gastos.\n\n8. **Educação Financeira:**\n   - Invista um tempo em aprender sobre finanças pessoais, gestão de dívidas e investimentos. Muitos cursos gratuitos online podem ser bastante úteis.\n\nImplementando essas recomendações, você poderá melhorar seu controle financeiro, reduzir dívidas e estabelecer um caminho sólido em direção à segurança financeira. Se precisar de mais suporte ou orientações em áreas específicas, não hesite em procurar ajuda.';

  if (!process.env.OPENAI_API_KEY) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return DUMMY_REPORT;
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const transactions = await db.transaction.findMany({
    where: {
      date: {
        gte: new Date(`2024-${month}-01`),
        lt: new Date(`2024-${month}-31`),
      },
    },
  });

  const content = `Gere um relatório com insights sobre as minhas finanças, com dicas e orientações de como melhorar minha vida financeira. As transações estão divididas por ponto e vírgula. A estrutura de cada uma é {DATA}-{TIPO}-{DESCRICAO}-{VALOR}-{CATEGORIA}. São elas:
        ${transactions
          .map(
            (transaction) =>
              `${transaction.date.toLocaleDateString("pt-BR")}-${TRANSACTION_TYPE_LABELS[transaction.type]}-${transaction.name.replace(/-/g, " ")}-R$${transaction.amount}-${TRANSACTION_CATEGORY_LABELS[transaction.category]}`,
          )
          .join(";")}`;
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Você é um especialista em gestão e organização de finanças pessoais. Você ajuda as pessoas a organizarem melhor as suas finanças.",
      },
      {
        role: "user",
        content,
      },
    ],
  });
  return completion.choices[0].message.content;
};

// export const getListTransactionforGpt = async ({
//   month,
// }: GenerateAiReportSchema) => {
//   const transactions = await db.transaction.findMany({
//     where: {
//       date: {
//         gte: new Date(`2024-${month}-01`),
//         lt: new Date(`2024-${month}-31`),
//       },
//     },
//   });
//   return transactions;
// };

// export const getMapTransactionforGpt = async ({
//   month,
// }: GenerateAiReportSchema) => {
//   const transactions = await db.transaction.findMany({
//     where: {
//       date: {
//         gte: new Date(`2024-${month}-01`),
//         lt: new Date(`2024-${month}-31`),
//       },
//     },
//   });
//   return `Gere um relatório com insights sobre as minhas finanças, com dicas e orientações de como melhorar minha vida financeira. As transações estão divididas por ponto e vírgula. A estrutura de cada uma é {DATA}-{TIPO}-{DESCRICAO}-{VALOR}-{CATEGORIA}. São elas:
//         ${transactions
//           .map(
//             (transaction) =>
//               `${transaction.date.toLocaleDateString("pt-BR")}-${TRANSACTION_TYPE_LABELS[transaction.type]}-${transaction.name.replace(/-/g, " ")}-R$${transaction.amount}-${TRANSACTION_CATEGORY_LABELS[transaction.category]}`,
//           )
//           .join(";")}`;
// };
