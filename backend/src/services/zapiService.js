const axios = require('axios');

const BASE_URL = process.env.ZAPI_BASE_URL;
const INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
const TOKEN = process.env.ZAPI_TOKEN;

const zapi = axios.create({
  baseURL: `${BASE_URL}/${INSTANCE_ID}/token/${TOKEN}`,
  headers: { 'Content-Type': 'application/json' },
});

async function sendText(phone, message) {
  try {
    const response = await zapi.post('/send-text', {
      phone,
      message,
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error.response?.data || error.message);
    throw error;
  }
}

async function sendList(phone, title, buttonText, sections) {
  try {
    const response = await zapi.post('/send-option-list', {
      phone,
      title,
      buttonLabel: buttonText,
      options: sections,
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao enviar lista:', error.response?.data || error.message);
    // Fallback: envia como texto simples
    const text = sections.map((s, i) => `${i + 1}. ${s.title}`).join('\n');
    return sendText(phone, `${title}\n\n${text}\n\nResponda com o número da opção desejada.`);
  }
}

module.exports = { sendText, sendList };
