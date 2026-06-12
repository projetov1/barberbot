const express = require('express');
const router = express.Router();
const { processMessage } = require('../services/botService');

// Webhook recebe mensagens da Z-API
router.post('/zapi', async (req, res) => {
  try {
    const body = req.body;

    // Log completo para debug — ver no Railway
    console.log('[WEBHOOK] Payload recebido:', JSON.stringify(body, null, 2));

    if (!body) {
      console.log('[WEBHOOK] Body vazio — ignorado');
      return res.sendStatus(200);
    }

    if (body.isFromMe) {
      console.log('[WEBHOOK] isFromMe=true — ignorado');
      return res.sendStatus(200);
    }

    const phone = body.phone?.replace(/\D/g, '');
    const messageText = body.text?.message || body.text?.body || body.text || body.message?.text || '';
    const senderName = body.senderName || body.chatName || null;
    const senderPhoto = body.photo || body.senderPhoto || null;

    console.log(`[WEBHOOK] phone=${phone} | text="${messageText}" | name=${senderName} | type=${body.type}`);

    if (!phone) {
      console.log('[WEBHOOK] Sem phone — ignorado');
      return res.sendStatus(200);
    }

    if (!messageText) {
      console.log('[WEBHOOK] Sem texto (áudio/imagem/outro) — ignorado');
      return res.sendStatus(200);
    }

    processMessage(phone, messageText, { senderName, senderPhoto }).catch((err) => {
      console.error(`[WEBHOOK] Erro ao processar mensagem de ${phone}:`, err.message, err.stack);
    });

    res.sendStatus(200);
  } catch (error) {
    console.error('[WEBHOOK] Erro geral:', error);
    res.sendStatus(500);
  }
});

// Endpoint para verificar se o webhook está ativo
router.get('/zapi', (req, res) => {
  res.json({ status: 'webhook ativo', timestamp: new Date().toISOString() });
});

module.exports = router;
