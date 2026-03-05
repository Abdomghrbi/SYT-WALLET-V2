require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const rewardRoutes = require('./routes/rewards');
const taskRoutes = require('./routes/tasks');
const referralRoutes = require('./routes/referrals');

const app = express();

// CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Telegram-Init-Data'],
  credentials: true
}));

app.options('*', cors());
app.use(express.json());

// المسارات
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/referrals', referralRoutes);

// صحة النظام
app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date() });
});

// ✅ للتشغيل المحلي فقط
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

// ✅ تصدير للـ Vercel Serverless
module.exports = app;
