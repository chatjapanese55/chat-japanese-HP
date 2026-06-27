// Vercel Serverless Function — creates a Stripe Embedded Checkout Session.
// The secret key is read from the STRIPE_SECRET_KEY environment variable
// (set it in the Vercel dashboard → Project → Settings → Environment Variables).
// It is NEVER hard-coded or committed to the repository.

const COURSES = {
  'weekend':       { price: 'price_1TmpmMCjjB5LKFeRzB9LVVnL', perPerson: true,  maxPeople: 8, label: 'Weekend Course' },
  '1-week':        { price: 'price_1TmpmPCjjB5LKFeRs90MBmCI', perPerson: true,  maxPeople: 8, label: '1-Week Course' },
  'intensive':     { price: 'price_1TmpmSCjjB5LKFeRH3WieDVc', perPerson: true,  maxPeople: 8, label: 'Intensive Course' },
  'tour':          { price: 'price_1TmpmUCjjB5LKFeRv5rNdyYk', perPerson: true,  maxPeople: 8, label: 'Friday Bar Hopping Tour' },
  'private-1day':  { price: 'price_1TmpmXCjjB5LKFeRj0bpl0Ok', perPerson: false, maxPeople: 5, label: 'Private Tour — 1 Day' },
  'private-2days': { price: 'price_1TmpmaCjjB5LKFeRJ1Oal0Bz', perPerson: false, maxPeople: 5, label: 'Private Tour — 2 Days' },
  'private-1week': { price: 'price_1TmpmdCjjB5LKFeRBbQXcTzF', perPerson: false, maxPeople: 5, label: 'Private Tour — 1 Week' },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    res.status(500).json({ error: 'Stripe is not configured (missing STRIPE_SECRET_KEY).' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { course, people, date, location, name, phone } = body;

    const cfg = COURSES[course];
    if (!cfg) {
      res.status(400).json({ error: 'Invalid course selected.' });
      return;
    }

    const ppl = Math.max(1, parseInt(people, 10) || 1);
    if (ppl > cfg.maxPeople) {
      res.status(400).json({ error: 'Group too large for online booking — please contact us.', contact: true });
      return;
    }

    const quantity = cfg.perPerson ? ppl : 1;
    const origin = req.headers.origin || `https://${req.headers.host}`;

    const params = new URLSearchParams();
    params.append('ui_mode', 'embedded_page');
    params.append('mode', 'payment');
    params.append('line_items[0][price]', cfg.price);
    params.append('line_items[0][quantity]', String(quantity));
    params.append('return_url', `${origin}/apply/apply.html?paid={CHECKOUT_SESSION_ID}`);
    params.append('phone_number_collection[enabled]', 'true');
    params.append('metadata[course]', cfg.label);
    params.append('metadata[people]', String(ppl));
    params.append('metadata[start_date]', date || '');
    params.append('metadata[location]', location || '');
    params.append('metadata[customer_name]', name || '');
    params.append('metadata[customer_phone]', phone || '');
    // Registration fee ($30) is waived until July 31 — not charged.

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await r.json();
    if (!r.ok) {
      res.status(r.status).json({ error: (data.error && data.error.message) || 'Stripe error.' });
      return;
    }

    res.status(200).json({ clientSecret: data.client_secret });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
