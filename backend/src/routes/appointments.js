const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const { status, date, month } = req.query;
    const where = {};
    if (status) where.status = status;
    if (date) where.date = date;
    if (month) where.date = { startsWith: month }; // ex: "2026-06"

    const appointments = await prisma.appointment.findMany({
      where,
      include: { lead: { select: { id: true, name: true, phone: true, photo: true } } },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { leadId, service, date, time, notes } = req.body;
    if (!leadId || !service || !date || !time) {
      return res.status(400).json({ error: 'leadId, service, date e time são obrigatórios' });
    }
    const appointment = await prisma.appointment.create({
      data: { leadId, service, date, time, notes, status: 'confirmado' },
      include: { lead: { select: { id: true, name: true, phone: true } } },
    });
    res.json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.appointment.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar agendamento' });
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
