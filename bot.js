require('dotenv').config();

const { Telegraf } = require('telegraf');
const axios = require('axios');
const http = require('http');

const bot = new Telegraf(process.env.BOT_TOKEN);

const API_URL = process.env.API_URL || 'https://syt-wallet-backend.onrender.com';
const MINI_APP_URL = process.env.MINI_APP_URL;

// ✅ Port وهمي لـ Render
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is running');
}).listen(PORT, () => console.log(`Port ${PORT} open`));

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

bot.help((ctx) => {
  ctx.reply('/start - فتح المحفظة');
});

bot.launch()
  .then(() => console.log('🤖 Bot started'))
  .catch(err => console.error('❌ Error:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
