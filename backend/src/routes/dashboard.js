const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/stats', async (req, res) => {
  try {
    const [
      totalLeads,
      newClients,
      returning,
      frio,
      morno,
      quente,
      pendingAppointments,
      todayMessages,
      recentLeads,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { isClient: false } }),
      prisma.lead.count({ where: { isClient: true } }),
      prisma.lead.count({ where: { temperature: 'frio' } }),
      prisma.lead.count({ where: { temperature: 'morno' } }),
      prisma.lead.count({ where: { temperature: 'quente' } }),
      prisma.appointment.count({ where: { status: 'pendente' } }),
      prisma.conversation.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          direction: 'incoming',
        },
      }),
      prisma.lead.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, phone: true, temperature: true, stage: true, createdAt: true },
      }),
    ]);

    // Agendamentos por status
    const appointmentsByStatus = await prisma.appointment.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    // Leads por dia (últimos 7 dias)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const leadsPerDay = await prisma.$queryRaw`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM "Lead"
      WHERE created_at >= ${sevenDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    res.json({
      totals: { totalLeads, newClients, returning },
      temperature: { frio, morno, quente },
      appointments: {
        pending: pendingAppointments,
        byStatus: appointmentsByStatus,
      },
      activity: {
        todayMessages,
        leadsPerDay,
      },
      recentLeads,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

module.exports = router;
