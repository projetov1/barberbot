const { PrismaClient } = require('@prisma/client');
const { sendText } = require('./zapiService');

const prisma = new PrismaClient();
const BARBER_NAME = process.env.BARBER_NAME || 'Barbearia';
const HUMAN_PHONE = process.env.HUMAN_ATTENDANT_PHONE;
const CASHBARBER_LINK = 'https://cashbarber.com.br/johnbarbermarketplace';

function calcTemperature(stage) {
  const map = {
    inicio: 'frio',
    triagem: 'frio',
    servicos: 'morno',
    agendamento: 'quente',
    atendimento_humano: 'quente',
    fechado: 'quente',
  };
  return map[stage] || 'frio';
}

async function getOrCreateSession(phone) {
  let session = await prisma.botSession.findUnique({ where: { phone } });
  if (!session) {
    session = await prisma.botSession.create({
      data: { phone, step: 'inicio', data: {} },
    });
  }
  return session;
}

async function updateSession(phone, step, data = {}) {
  return prisma.botSession.update({
    where: { phone },
    data: { step, data, updatedAt: new Date() },
  });
}

async function getOrCreateLead(phone) {
  let lead = await prisma.lead.findUnique({ where: { phone } });
  if (!lead) {
    lead = await prisma.lead.create({ data: { phone } });
  }
  return lead;
}

async function updateLead(phone, data) {
  return prisma.lead.update({ where: { phone }, data });
}

async function saveMessage(leadId, direction, message) {
  return prisma.conversation.create({
    data: { leadId, direction, message },
  });
}

async function processMessage(phone, messageText) {
  const text = (messageText || '').trim().toLowerCase();
  const session = await getOrCreateSession(phone);
  const lead = await getOrCreateLead(phone);

  await saveMessage(lead.id, 'incoming', messageText);

  switch (session.step) {
    case 'inicio':
      return stepInicio(phone, lead, session);
    case 'aguarda_nome':
      return stepSalvaNome(phone, lead, messageText);
    case 'menu_principal':
      return stepMenuPrincipal(phone, lead, text, session);
    case 'aguarda_servico':
      return stepEscolheServico(phone, lead, text, session);
    case 'aguarda_assinante':
      return stepVerificaAssinante(phone, lead, text, session);
    case 'aguarda_data':
      return stepSalvaData(phone, lead, messageText, session);
    case 'aguarda_hora':
      return stepSalvaHora(phone, lead, messageText, session);
    case 'atendimento_humano':
      return;
    default:
      return stepInicio(phone, lead, session);
  }
}

async function stepInicio(phone, lead, session) {
  if (lead.name) {
    await updateSession(phone, 'menu_principal');
    await updateLead(phone, { isClient: true, temperature: 'morno' });
    await sendText(phone, `Olá de novo, *${lead.name}*! 👋\n\nBem-vindo de volta à *${BARBER_NAME}*.\n\nComo posso te ajudar hoje?`);
    return stepShowMenu(phone);
  }
  await updateSession(phone, 'aguarda_nome');
  await sendText(phone, `Olá! 👋 Seja bem-vindo à *${BARBER_NAME}*!\n\nSou o assistente virtual. Estou aqui pra te ajudar com informações, preços e agendamentos.\n\nPrimeiro, como posso te chamar?`);
}

async function stepSalvaNome(phone, lead, name) {
  const cleanName = name.charAt(0).toUpperCase() + name.slice(1);
  await updateLead(phone, { name: cleanName, temperature: 'morno' });
  await updateSession(phone, 'menu_principal');
  await sendText(phone, `Prazer, *${cleanName}*! 😄`);
  return stepShowMenu(phone);
}

async function stepShowMenu(phone) {
  const menu = `O que você quer saber?\n\n1️⃣ Ver serviços e preços\n2️⃣ Agendar horário\n3️⃣ Falar com atendente\n\nResponda com o número da opção.`;
  await sendText(phone, menu);
}

async function stepMenuPrincipal(phone, lead, text, session) {
  if (text === '1' || text.includes('serviço') || text.includes('preço')) {
    return stepMostraServicos(phone, lead);
  }
  if (text === '2' || text.includes('agend') || text.includes('horário')) {
    return stepPerguntaAssinante(phone, lead);
  }
  if (text === '3' || text.includes('atendente') || text.includes('humano')) {
    return stepTransfereHumano(phone, lead);
  }
  await sendText(phone, `Não entendi. 😅\n\nResponda com *1*, *2* ou *3*:`);
  return stepShowMenu(phone);
}

async function stepMostraServicos(phone, lead) {
  const msg =
    `✂️ *Serviços — ${BARBER_NAME}*\n\n` +
    `*CORTES*\n` +
    `• Corte — R$ 35,00 (30 min)\n` +
    `• Sobrancelha — R$ 10,00 (15 min)\n\n` +
    `*BARBA*\n` +
    `• Barba — R$ 35,00 (30 min)\n\n` +
    `*COMBOS*\n` +
    `• Corte + Barba — R$ 59,90 (45 min)\n\n` +
    `*PLANOS ASSINATURA*\n` +
    `• Corte Ilimitado — R$ 69,90/mês\n` +
    `• Barba Ilimitada — R$ 99,90/mês\n` +
    `• Corte + Barba Ilimitados — R$ 114,90/mês\n\n` +
    `Para assinar um plano acesse:\n${CASHBARBER_LINK}\n\n` +
    `Quer agendar? Responda *2* 📅`;

  await updateLead(phone, { temperature: 'morno', stage: 'servicos' });
  await updateSession(phone, 'menu_principal');
  await sendText(phone, msg);
}

async function stepPerguntaAssinante(phone, lead) {
  await updateSession(phone, 'aguarda_assinante');
  await sendText(phone, `Para agendar é necessário ser assinante de um plano.\n\nVocê já é assinante?\n\n1️⃣ Sim, sou assinante\n2️⃣ Não sou assinante\n\nResponda com *1* ou *2*.`);
}

async function stepVerificaAssinante(phone, lead, text, session) {
  if (text === '1' || text.includes('sim')) {
    await updateSession(phone, 'menu_principal');
    await updateLead(phone, { temperature: 'quente', stage: 'agendamento' });
    await sendText(phone, `Ótimo! 😄\n\nAcesse o link abaixo para agendar pelo nosso sistema:\n\n📅 ${CASHBARBER_LINK}`);
    return stepShowMenu(phone);
  }

  if (text === '2' || text.includes('não') || text.includes('nao')) {
    await updateSession(phone, 'menu_principal');
    await sendText(
      phone,
      `Sem problema! 😊\n\nNosso atendimento para não assinantes é por *ordem de chegada*.\n\nSe quiser se tornar assinante e ter direito a agendamento, acesse:\n\n📋 ${CASHBARBER_LINK}\n\nPosso te ajudar com mais alguma coisa?`
    );
    return stepShowMenu(phone);
  }

  await sendText(phone, `Responda com *1* (sim) ou *2* (não).`);
}

async function stepTransfereHumano(phone, lead) {
  await updateSession(phone, 'atendimento_humano');
  await updateLead(phone, { stage: 'atendimento_humano', temperature: 'quente' });
  await sendText(phone, `Certo! Vou te transferir para nosso atendente. ✋\n\nEle responderá em instantes. 😊`);
  if (HUMAN_PHONE) {
    await sendText(HUMAN_PHONE, `🔔 *Atendimento solicitado!*\n\n👤 ${lead.name || 'Novo contato'}\n📱 ${phone}\n\nCliente aguardando atendimento humano.`);
  }
}

module.exports = { processMessage };
