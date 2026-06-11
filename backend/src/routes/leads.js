const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Lista todos os leads com filtros
router.get('/', async (req, res) => {
  try {
    const { temperature, stage, isClient, page = 1, limit = 20 } = req.query;
    const where = {};

    if (temperature) where.temperature = temperature;
    if (stage) where.stage = stage;
    if (isClient !== undefined) where.isClient = isClient === 'true';

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          _count: { select: { conversations: true, appointments: true } },
          appointments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({ leads, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar leads' });
  }
});

// Detalhes de um lead + histórico de conversa
router.get('/:id', async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        conversations: { orderBy: { createdAt: 'asc' } },
        appointments: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar lead' });
  }
});

// Atualiza temperatura manualmente
router.put('/:id', async (req, res) => {
  try {
    const { temperature, stage, isClient, name } = req.body;
    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        ...(temperature && { temperature }),
        ...(stage && { stage }),
        ...(isClient !== undefined && { isClient }),
        ...(name && { name }),
      },
    });
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar lead' });
  }
});

module.exports = router;
