const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const verifyTelegram = require('../middleware/auth');

// جلب بيانات المحفظة بالعنوان
router.get('/:address', verifyTelegram, async (req, res) => {
  const { address } = req.params;
  const telegramId = req.telegramUser.id;

  try {
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('wallet_address', address)
      .single();

    if (error || !wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // التحقق من الملكية
    if (wallet.telegram_id !== telegramId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      address: wallet.wallet_address,
      balance: wallet.balance,
      total_earned: wallet.total_earned,
      referral_code: wallet.referral_code
    });

  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// التحويل
router.post('/transfer', verifyTelegram, async (req, res) => {
  const { to_address, amount } = req.body;
  const telegramId = req.telegramUser.id;

  if (!to_address || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid data' });
  }

  try {
    // جلب محفظة المرسل
    const { data: fromWallet, error: fromError } = await supabase
      .from('wallets')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (fromError || !fromWallet) {
      return res.status(404).json({ error: 'Sender wallet not found' });
    }

    if (fromWallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // جلب محفظة المستلم
    const { data: toWallet, error: toError } = await supabase
      .from('wallets')
      .select('*')
      .eq('wallet_address', to_address)
      .single();

    if (toError || !toWallet) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // تنفيذ التحويل
    const newFromBalance = fromWallet.balance - amount;
    const newToBalance = toWallet.balance + amount;

    // تحديث المرسل
    await supabase
      .from('wallets')
      .update({ balance: newFromBalance, updated_at: new Date() })
      .eq('id', fromWallet.id);

    // تحديث المستلم
    await supabase
      .from('wallets')
      .update({ balance: newToBalance, updated_at: new Date() })
      .eq('id', toWallet.id);

    // تسجيل العملية
    await supabase.from('transactions').insert({
      from_wallet: fromWallet.id,
      to_wallet: toWallet.id,
      amount: amount,
      type: 'transfer'
    });

    res.json({
      success: true,
      new_balance: newFromBalance,
      transaction: {
        to: to_address,
        amount: amount
      }
    });

  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Transfer failed' });
  }
});

// سجل العمليات
router.get('/:address/transactions', verifyTelegram, async (req, res) => {
  const { address } = req.params;
  const telegramId = req.telegramUser.id;

  try {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('wallet_address', address)
      .single();

    if (!wallet || wallet.telegram_id !== telegramId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        from_wallet:wallets!transactions_from_wallet_fkey(wallet_address),
        to_wallet:wallets!transactions_to_wallet_fkey(wallet_address)
      `)
      .or(`from_wallet.eq.${wallet.id},to_wallet.eq.${wallet.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(transactions);

  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
