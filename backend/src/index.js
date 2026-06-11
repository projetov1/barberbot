require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const webhookRoutes = require('./routes/webhook');
const leadsRoutes = require('./routes/leads');
const appointmentsRoutes = require('./routes/appointments');
const servicesRoutes = require('./routes/services');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
app.set("trust proxy", 1);

// Segurança
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
});
app.use(limiter);

app.use(express.json());

// Rotas
app.use('/webhook', webhookRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 BarberBot rodando na porta ${PORT}`);
});
