const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
const TOKEN = process.env.ZAPI_TOKEN;
const SECURITY_TOKEN = process.env.ZAPI_SECURITY_TOKEN;

async function sendText(phone, message) {
  try {
    const response = await axios.post(
      `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`,
      { phone, message },
      {
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': `${SECURITY_TOKEN}`
        }
      }
    );

    try {
      const lead = await prisma.lead.findUnique({ where: { phone } });
      if (lead) {
        await prisma.conversation.create({
          data: { leadId: lead.id, direction: 'outgoing', message }
        });
      }
    } catch (e) {}

    return response.data;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { sendText };