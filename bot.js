bot.start(async (ctx) => {
  const startPayload = ctx.payload;
  const telegramId = ctx.from.id;
  
  console.log('📝 Start command');
  console.log('👤 Telegram ID:', telegramId);
  console.log('🔗 Payload:', startPayload);
  
  // ✅ تسجيل الإحالة إذا كان هناك referral_code
  if (startPayload) {
    try {
      // جلب wallet_id من Supabase
      console.log('🔍 Fetching wallet_id for user:', telegramId);
      
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id')
        .eq('telegram_id', telegramId)
        .single();
      
      let walletId;
      
      if (walletError || !wallet) {
        // المستخدم جديد - لا يوجد محفظة بعد
        // نسجل الإحالة لاحقاً عند إنشاء المحفظة
        console.log('⚠️ No wallet yet - deferring referral');
        
        // حل بديل: تخزين مؤقت في جدول منفصل أو استخدام telegram_id مؤقتاً
        // لكن الأفضل: إنشاء محفظة مؤقتة أو الانتظار
        
        // ✅ الحل الأبسط: إنشاء محفظة الآن
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({
            telegram_id: telegramId,
            balance: 0,
            total_earned: 0
          })
          .select()
          .single();
        
        if (createError) throw createError;
        walletId = newWallet.id;
        console.log('✅ Created wallet:', walletId);
        
        // إنشاء سجل المكافآت اليومية
        await supabase.from('daily_rewards').insert({
          wallet_id: walletId
        });
        
      } else {
        walletId = wallet.id;
        console.log('✅ Found wallet:', walletId);
      }
      
      // ✅ تسجيل الإحالة باستخدام wallet_id (UUID)
      console.log('📤 Sending referral with wallet_id:', walletId);
      
      const response = await axios.post(`${API_URL}/api/referrals/register`, {
        new_user_id: walletId,  // ✅ UUID
        referral_code: startPayload
      });
      
      console.log('✅ Referral success:', response.data);
      
    } catch (error) {
      console.log('❌ Referral error:', error.message);
      console.log('Error details:', error.response?.data);
    }
  } else {
    console.log('⚠️ No payload - direct start');
  }
  
  // ✅ الرد للمستخدم
  await ctx.reply(
    '👋 مرحباً بك في SYT Wallet!\n\n' +
    '💰 اربح العملات من المكافآت اليومية والمهام\n' +
    '👥 ادعو أصدقاءك واحصل على 500 SYT لكل صديق\n\n' +
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
