const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const verifyTelegram = require('../middleware/auth');

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

    // ✅ استخدام Environment Variable
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
