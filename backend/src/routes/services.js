const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  const services = await prisma.service.findMany({ where: { active: true } });
  res.json(services);
});

router.post('/', async (req, res) => {
  try {
    const { name, price, duration, description } = req.body;
    const service = await prisma.service.create({
      data: { name, price: parseFloat(price), duration: parseInt(duration), description },
    });
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar serviço' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, price, duration, description, active } = req.body;
    const service = await prisma.service.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(price && { price: parseFloat(price) }),
        ...(duration && { duration: parseInt(duration) }),
        ...(description !== undefined && { description }),
        ...(active !== undefined && { active }),
      },
    });
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar serviço' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.service.update({
      where: { id: req.params.id },
      data: { active: false },
    });
    res.json({ message: 'Serviço desativado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover serviço' });
  }
});

module.exports = router;
