require('dotenv').config();

const { Telegraf } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN);

const API_URL = process.env.API_URL || 'https://syt-wallet-backend.onrender.com';
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://syt-wallet-frontend.vercel.app';

// أمر /start
bot.start(async (ctx) => {
  const startPayload = ctx.payload;
  
  if (startPayload) {
    try {
      await axios.post(`${API_URL}/api/referrals/register`, {
        new_user_id: ctx.from.id,
        referral_code: startPayload
      });
      console.log('✅ Referral registered:', startPayload);
    } catch (error) {
      console.log('Referral error:', error.message);
    }
  }
  
  await ctx.reply(
    '👋 مرحباً بك في SYT Wallet!\n\n' +
    '💰 اربح العملات من المكافآت اليومية والمهام\n' +
    '👥 ادعو أصدقاءك واحصل على 50 SYT لكل صديق\n\n' +
    'اضغط الزر أدناه لفتح محفظتك:',
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '💼 فتح المحفظة', web_app: { url: MINI_APP_URL } }
        ]]
      }
    }
  );
});

// أمر /help
bot.help((ctx) => {
  ctx.reply(
    '📚 الأوامر:\n' +
    '/start - فتح المحفظة\n' +
    '/help - المساعدة'
  );
});

// تشغيل
bot.launch()
  .then(() => console.log('🤖 Bot started successfully'))
  .catch(err => console.error('❌ Bot error:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
