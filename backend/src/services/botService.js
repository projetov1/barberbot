const { PrismaClient } = require('@prisma/client');
const { sendText, sendList } = require('./zapiService');

const prisma = new PrismaClient();
const BARBER_NAME = process.env.BARBER_NAME || 'Barbearia';
const HUMAN_PHONE = process.env.HUMAN_ATTENDANT_PHONE;

// Classifica temperatura do lead com base na jornada
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

// ─── FLUXO PRINCIPAL ────────────────────────────────────────────────────────

async function processMessage(phone, messageText) {
  const text = (messageText || '').trim().toLowerCase();
  const session = await getOrCreateSession(phone);
  const lead = await getOrCreateLead(phone);

  // Salva mensagem recebida
  await saveMessage(lead.id, 'incoming', messageText);

  // Roteador de etapas
  switch (session.step) {
    case 'inicio':
      return stepInicio(phone, lead, session);

    case 'aguarda_nome':
      return stepSalvaNome(phone, lead, messageText);

    case 'menu_principal':
      return stepMenuPrincipal(phone, lead, text, session);

    case 'aguarda_servico':
      return stepEscolheServico(phone, lead, text, session);

    case 'aguarda_agendamento':
      return stepAgendamento(phone, lead, messageText, session);

    case 'aguarda_data':
      return stepSalvaData(phone, lead, messageText, session);

    case 'aguarda_hora':
      return stepSalvaHora(phone, lead, messageText, session);

    case 'atendimento_humano':
      // Em atendimento humano o bot não interfere
      return;

    default:
      return stepInicio(phone, lead, session);
  }
}

// ─── ETAPAS ──────────────────────────────────────────────────────────────────

async function stepInicio(phone, lead, session) {
  if (lead.name) {
    // Cliente já conhecido
    await updateSession(phone, 'menu_principal');
    await updateLead(phone, { isClient: true, temperature: 'morno' });
    const msg = `Olá de novo, *${lead.name}*! 👋\n\nBem-vindo de volta à *${BARBER_NAME}*.\n\nComo posso te ajudar hoje?`;
    await sendText(phone, msg);
    return stepShowMenu(phone);
  }

  // Novo contato
  await updateSession(phone, 'aguarda_nome');
  await sendText(
    phone,
    `Olá! 👋 Seja bem-vindo à *${BARBER_NAME}*!\n\nSou o assistente virtual. Estou aqui pra te ajudar com informações, preços e agendamentos.\n\nPrimeiro, como posso te chamar?`
  );
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
    return stepIniciaAgendamento(phone, lead);
  }

  if (text === '3' || text.includes('atendente') || text.includes('humano')) {
    return stepTransfereHumano(phone, lead);
  }

  // Não entendeu
  await sendText(phone, `Não entendi. 😅\n\nResponda com *1*, *2* ou *3*:`);
  return stepShowMenu(phone);
}

async function stepMostraServicos(phone, lead) {
  const services = await prisma.service.findMany({ where: { active: true } });

  if (services.length === 0) {
    await sendText(phone, `Nossos serviços estão sendo atualizados. Por favor, fale com nosso atendente para mais informações.`);
    return stepTransfereHumano(phone, lead);
  }

  let msg = `✂️ *Serviços e Preços — ${BARBER_NAME}*\n\n`;
  services.forEach((s) => {
    msg += `• *${s.name}* — R$ ${s.price.toFixed(2)}`;
    if (s.duration) msg += ` (${s.duration} min)`;
    if (s.description) msg += `\n  _${s.description}_`;
    msg += '\n';
  });
  msg += `\nQuer agendar? Responda *2* para escolher um horário. 📅`;

  await updateLead(phone, { temperature: 'morno', stage: 'servicos' });
  await updateSession(phone, 'menu_principal');
  await sendText(phone, msg);
}

async function stepIniciaAgendamento(phone, lead) {
  const services = await prisma.service.findMany({ where: { active: true } });

  if (services.length === 0) {
    return stepTransfereHumano(phone, lead);
  }

  let msg = `Ótimo! Qual serviço você quer agendar?\n\n`;
  services.forEach((s, i) => {
    msg += `${i + 1}. ${s.name} — R$ ${s.price.toFixed(2)}\n`;
  });
  msg += `\nResponda com o número do serviço.`;

  await updateSession(phone, 'aguarda_servico', { services: services.map((s) => s.name) });
  await updateLead(phone, { temperature: 'quente', stage: 'agendamento' });
  await sendText(phone, msg);
}

async function stepEscolheServico(phone, lead, text, session) {
  const services = session.data?.services || [];
  const index = parseInt(text) - 1;

  if (isNaN(index) || index < 0 || index >= services.length) {
    await sendText(phone, `Por favor, responda com o número do serviço desejado (ex: *1*, *2*...)`);
    return;
  }

  const chosenService = services[index];
  await updateSession(phone, 'aguarda_data', { service: chosenService });
  await sendText(
    phone,
    `Ótima escolha! *${chosenService}* ✅\n\nQual data você prefere?\nEx: *segunda-feira* ou *15/07*`
  );
}

async function stepSalvaData(phone, lead, date, session) {
  await updateSession(phone, 'aguarda_hora', { ...session.data, date });
  await sendText(phone, `Perfeito! E qual horário?\nEx: *10h*, *14h30*`);
}

async function stepSalvaHora(phone, lead, time, session) {
  const { service, date } = session.data;

  // Cria o agendamento
  await prisma.appointment.create({
    data: {
      leadId: lead.id,
      service,
      date,
      time,
      status: 'pendente',
    },
  });

  await updateLead(phone, { stage: 'agendamento', temperature: 'quente' });
  await updateSession(phone, 'menu_principal');

  await sendText(
    phone,
    `✅ *Solicitação de agendamento registrada!*\n\n📋 Serviço: ${service}\n📅 Data: ${date}\n🕐 Horário: ${time}\n\nNosso atendente vai confirmar em breve. 😊`
  );

  // Notifica atendente humano
  if (HUMAN_PHONE) {
    await sendText(
      HUMAN_PHONE,
      `📬 *Novo agendamento solicitado!*\n\n👤 Cliente: ${lead.name || phone}\n📱 Telefone: ${phone}\n✂️ Serviço: ${service}\n📅 Data: ${date}\n🕐 Horário: ${time}\n\nConfirme diretamente com o cliente.`
    );
  }
}

async function stepTransfereHumano(phone, lead) {
  await updateSession(phone, 'atendimento_humano');
  await updateLead(phone, { stage: 'atendimento_humano', temperature: 'quente' });

  await sendText(
    phone,
    `Certo! Vou te transferir para nosso atendente. ✋\n\nEle responderá em instantes. Se precisar de ajuda enquanto isso, é só aguardar! 😊`
  );

  // Notifica atendente
  if (HUMAN_PHONE) {
    await sendText(
      HUMAN_PHONE,
      `🔔 *Atendimento solicitado!*\n\n👤 ${lead.name || 'Novo contato'}\n📱 ${phone}\n\nCliente aguardando atendimento humano.`
    );
  }
}

module.exports = { processMessage };
