const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { sendText } = require('./zapiService');

const prisma = new PrismaClient();
const GOOGLE_REVIEW_LINK = 'https://g.page/r/CUZmQq4DPO09EAE/review';
const BARBER_NAME = process.env.BARBER_NAME || 'Barbearia';

async function sendReviewRequests() {
  const ontem = new Date();
  ontem.setHours(ontem.getHours() - 24);

  const leads = await prisma.lead.findMany({
    where: {
      stage: 'agendamento',
      reviewSent: false,
      updatedAt: { lte: ontem },
    },
  });

  for (const lead of leads) {
    try {
      await sendText(
        lead.phone,
        `Olá, *${lead.name || 'cliente'}*! 😊\n\nEsperamos que tenha gostado do atendimento na *${BARBER_NAME}*!\n\nSe puder, deixa sua avaliação no Google — isso ajuda muito a gente:\n\n⭐ ${GOOGLE_REVIEW_LINK}\n\nObrigado e até a próxima! ✂️`
      );
      await prisma.lead.update({
        where: { id: lead.id },
        data: { reviewSent: true },
      });
    } catch (err) {
      console.error(`Erro ao enviar review para ${lead.phone}:`, err.message);
    }
  }
}

function startReviewCron() {
  // Roda todo dia às 10h
  cron.schedule('0 10 * * *', () => {
    console.log('🔔 Verificando pedidos de avaliação...');
    sendReviewRequests();
  });
  console.log('✅ Cron de avaliações iniciado');
}

module.exports = { startReviewCron };
