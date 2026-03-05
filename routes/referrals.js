const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const verifyTelegram = require('../middleware/auth');

// جلب إحصائيات الإحالات
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
      .select(`
        *,
        referred:wallets!referrals_referred_id_fkey(wallet_address, created_at)
      `)
      .eq('referrer_id', wallet.id);

    if (error) throw error;

    const totalReferrals = referrals?.length || 0;
    const totalRewards = referrals?.reduce((sum, ref) => 
      sum + (ref.is_rewarded ? ref.reward_amount : 0), 0) || 0;

    // إنشاء رابط الدعوة
    const botUsername = process.env.BOT_USERNAME || 'your_bot';
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

// تسجيل إحالة جديدة (يُستدعى عند /start)
router.post('/register', async (req, res) => {
  const { new_user_id, referral_code } = req.body;

  if (!new_user_id || !referral_code) {
    return res.status(400).json({ error: 'Missing data' });
  }

  try {
    // جلب المحيل
    const { data: referrer } = await supabase
      .from('wallets')
      .select('id')
      .eq('referral_code', referral_code)
      .single();

    if (!referrer) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    // التحقق من عدم وجود إحالة سابقة
    const { data: existing } = await supabase
      .from('referrals')
      .select('*')
      .eq('referred_id', new_user_id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Already referred' });
    }

    // إنشاء الإحالة
    await supabase.from('referrals').insert({
      referrer_id: referrer.id,
      referred_id: new_user_id,
      reward_amount: 50, // مكافأة الإحالة
      is_rewarded: false
    });

    res.json({ success: true });

  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// مكافأة المحيل (يُستدعى عند إكمال المستخدم الجديد مهامه)
router.post('/reward', verifyTelegram, async (req, res) => {
  const { referral_id } = req.body;
  const telegramId = req.telegramUser.id;

  try {
    const { data: referral } = await supabase
      .from('referrals')
      .select('*, referrer:wallets!referrals_referrer_id_fkey(*)')
      .eq('id', referral_id)
      .single();

    if (!referral || referral.is_rewarded) {
      return res.status(400).json({ error: 'Invalid or already rewarded' });
    }

    // تحديث رصيد المحيل
    const rewardAmount = referral.reward_amount;
    await supabase
      .from('wallets')
      .update({
        balance: referral.referrer.balance + rewardAmount,
        total_earned: referral.referrer.total_earned + rewardAmount,
        updated_at: new Date()
      })
      .eq('id', referral.referrer_id);

    // تحديث حالة الإحالة
    await supabase
      .from('referrals')
      .update({ is_rewarded: true })
      .eq('id', referral_id);

    // تسجيل العملية
    await supabase.from('transactions').insert({
      to_wallet: referral.referrer_id,
      amount: rewardAmount,
      type: 'referral'
    });

    res.json({ success: true, reward_amount: rewardAmount });

  } catch (error) {
    res.status(500).json({ error: 'Reward failed' });
  }
});

module.exports = router;
