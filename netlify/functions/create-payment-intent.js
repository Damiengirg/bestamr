const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { amount, currency, customer, items } = JSON.parse(event.body);

    if (!amount || amount < 50) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Montant invalide' })
      };
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency || 'eur',
      automatic_payment_methods: { enabled: true },
      metadata: {
        customer_email: customer.email,
        customer_name: `${customer.first} ${customer.last}`,
        items_count: items.length.toString(),
        items_summary: items.map(i => `${i.name}(${i.size})`).join(', ').slice(0, 500),
      },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret }),
    };
  } catch (err) {
    console.error('Stripe error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erreur serveur Stripe' }),
    };
  }
};
