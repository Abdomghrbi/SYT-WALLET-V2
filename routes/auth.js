const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const verifyTelegram = require('../middleware/auth');

// ✅ تسجيل الدخول / إنشاء محفظة
router.post('/login', verifyTelegram, async (req, res) => {
  const { id, username, first_name, last_name } = req.telegramUser;

  try {
    // البحث عن المحفظة
    let { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('telegram_id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // إنشاء محفظة جديدة
    if (!wallet) {
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({
          telegram_id: id,
          balance: 0,
          total_earned: 0
        })
        .select()
        .single();

      if (createError) throw createError;
      wallet = newWallet;

      // إنشاء سجل المكافآت اليومية
      await supabase.from('daily_rewards').insert({
        wallet_id: wallet.id
      });
    }

    res.json({
      success: true,
      wallet: {
        id: wallet.id,
        address: wallet.wallet_address,
        balance: wallet.balance,
        total_earned: wallet.total_earned,
        referral_code: wallet.referral_code,
        created_at: wallet.created_at
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
