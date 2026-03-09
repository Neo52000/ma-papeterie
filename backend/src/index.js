require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const auth = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const prospectsRoutes = require('./routes/prospects');
const tasksRoutes = require('./routes/tasks');
const emailsRoutes = require('./routes/emails');
const opportunitiesRoutes = require('./routes/opportunities');
const quotesRoutes = require('./routes/quotes');
const invoicesRoutes = require('./routes/invoices');
const catalogueRoutes = require('./routes/catalogue');
const ticketsRoutes = require('./routes/tickets');
const interactionsRoutes = require('./routes/interactions');
const settingsRoutes = require('./routes/settings');
const aiRoutes = require('./routes/ai');
const pdfRoutes = require('./routes/pdf');
const importsRoutes = require('./routes/imports');
const rgpdRoutes = require('./routes/rgpd');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/prospects', auth, prospectsRoutes);
app.use('/api/tasks', auth, tasksRoutes);
app.use('/api/emails', auth, emailsRoutes);
app.use('/api/opportunities', auth, opportunitiesRoutes);
app.use('/api/quotes', auth, quotesRoutes);
app.use('/api/invoices', auth, invoicesRoutes);
app.use('/api/catalogue', auth, catalogueRoutes);
app.use('/api/tickets', auth, ticketsRoutes);
app.use('/api/interactions', auth, interactionsRoutes);
app.use('/api/settings', auth, settingsRoutes);
app.use('/api/ai', auth, aiRoutes);
app.use('/api/pdf', auth, pdfRoutes);
app.use('/api/imports', auth, importsRoutes);
app.use('/api/rgpd', auth, rgpdRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`CRM ma-papeterie backend listening on port ${PORT}`);
});

module.exports = app;
