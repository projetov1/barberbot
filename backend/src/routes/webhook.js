const express = require('express');
const router = express.Router();
const { processMessage } = require('../services/botService');

// Webhook recebe mensagens da Z-API
router.post('/zapi', async (req, res) => {
  try {
    const body = req.body;

    // Z-API envia vários tipos de eventos — só processa mensagens recebidas
    if (!body || body.isFromMe) {
      return res.sendStatus(200);
    }

    const phone = body.phone?.replace(/\D/g, ''); // só números
    const messageText = body.text?.message || body.text || '';

    if (!phone || !messageText) {
      return res.sendStatus(200);
    }

    // Processa de forma assíncrona para não travar o webhook
    processMessage(phone, messageText).catch((err) => {
      console.error(`Erro ao processar mensagem de ${phone}:`, err);
    });

    // Z-API espera 200 rápido
    res.sendStatus(200);
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.sendStatus(500);
  }
});

// Endpoint para verificar se o webhook está ativo
router.get('/zapi', (req, res) => {
  res.json({ status: 'webhook ativo', timestamp: new Date().toISOString() });
});

module.exports = router;
