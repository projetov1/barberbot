const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const appointments = await prisma.appointment.findMany({
      where,
      include: { lead: { select: { name: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
});

module.exports = router;
