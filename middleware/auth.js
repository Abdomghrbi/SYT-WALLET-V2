const crypto = require('crypto');

const verifyTelegram = (req, res, next) => {
  const initData = req.headers['x-telegram-init-data'];
  
  if (!initData) {
    return res.status(401).json({ error: 'Missing Telegram data' });
  }

  try {
    const secret = crypto.createHmac('sha256', 'WebAppData')
      .update(process.env.BOT_TOKEN)
      .digest();

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');

    const dataCheckString = [...params.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .sort()
      .join('\n');

    const checkHash = crypto.createHmac('sha256', secret)
      .update(dataCheckString)
      .digest('hex');

    if (hash !== checkHash) {
      return res.status(401).json({ error: 'Invalid Telegram data' });
    }

    const user = JSON.parse(params.get('user'));
    req.telegramUser = user;
    next();

  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = verifyTelegram;
