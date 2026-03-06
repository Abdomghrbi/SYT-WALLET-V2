const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const verifyTelegram = require('../middleware/auth');

// ✅ NEW: تسجيل إحالة جديدة (بدون verifyTelegram لأنه من البوت مباشرة)
router.post('/register', async (req, res) => {
  const { new_user_id, referral_code } = req.body;

  console.log('📥 Register referral:', { new_user_id, referral_code });

  if (!new_user_id || !referral_code) {
    return res.status(400).json({ error: 'Missing data' });
  }

  try {
    // جلب المحيل
    const { data: referrer, error: referrerError } = await supabase
      .from('wallets')
      .select('id')
      .eq('referral_code', referral_code)
      .single();

    if (referrerError || !referrer) {
      console.log('❌ Referrer not found');
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    // التحقق من عدم وجود إحالة سابقة
    const { data: existing } = await supabase
      .from('referrals')
      .select('*')
      .eq('referred_id', new_user_id)
      .single();

    if (existing) {
      console.log('⚠️ Already referred');
      return res.status(400).json({ error: 'Already referred' });
    }

    // إنشاء الإحالة
    const { data: referral, error: insertError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrer.id,
        referred_id: new_user_id,
        reward_amount: 50,
        is_rewarded: false
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log('✅ Referral created:', referral);

    res.json({ success: true, referral });

  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ✅ إحصائيات الإحالات (محمي)
router.get('/stats/:address', verifyTelegram, async (req, res) => {
  const { address } = req.params;
  const telegramId = req.telegramUser.id;

  try {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, telegram_id, referral_code')
      .eq('wallet_address', address)
      .single();

    if (!wallet || wallet.telegram_id !== telegramId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: referrals, error } = await supabase
      .from('referrals')
      .select(`*, referred:wallets!referrals_referred_id_fkey(wallet_address, created_at)`)
      .eq('referrer_id', wallet.id);

    if (error) throw error;

    const totalReferrals = referrals?.length || 0;
    const totalRewards = referrals?.reduce((sum, ref) => 
      sum + (ref.is_rewarded ? ref.reward_amount : 0), 0) || 0;

    const botUsername = process.env.BOT_USERNAME || 'SYT_Token_bot';
    const referralLink = `https://t.me/${botUsername}?start=${wallet.referral_code}`;

    res.json({
      referral_code: wallet.referral_code,
      referral_link: referralLink,
      total_referrals: totalReferrals,
      total_rewards: totalRewards,
      referrals: referrals || []
    });

  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
