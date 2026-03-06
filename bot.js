require('dotenv').config();
const { Telegraf } = require('telegraf');

console.log('MINI_APP_URL:', process.env.MINI_APP_URL);

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
  console.log('Sending button with URL:', process.env.MINI_APP_URL);
  
  ctx.reply('Test', {
    reply_markup: {
      inline_keyboard: [[
        { 
          text: '💼 فتح المحفظة', 
          web_app: { url: process.env.MINI_APP_URL || 'https://syt-wallet-frontend.vercel.app' } 
        }
      ]]
    }
  });
});

bot.launch()
  .then(() => console.log('🤖 Bot started'))
  .catch(err => console.error('❌ Error:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
