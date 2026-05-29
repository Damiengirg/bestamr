const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { paymentIntentId, customer, items } = JSON.parse(event.body);

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Paiement non confirmé' })
      };
    }

    const orderRef = 'BST-' + paymentIntentId.slice(-8).toUpperCase();

    if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `bestam'R <onboarding@resend.dev>`,
          to: customer.email,
          subject: `✅ Commande confirmée #${orderRef} — bestam'R`,
          html: buildEmailHtml(orderRef, customer, items),
        }),
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, orderRef }),
    };
  } catch (err) {
    console.error('confirm-order error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erreur confirmation commande' }),
    };
  }
};

function buildEmailHtml(orderRef, customer, items) {
  const total = items.reduce((s, i) => s + i.price, 0) + 4.90;
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#080808;color:#F2EFE9;padding:2rem">
      <h1 style="font-size:2rem;letter-spacing:.2em;color:#C9A84C;margin-bottom:1rem">bestam'R</h1>
      <h2 style="color:#C9A84C">Commande confirmée ✅</h2>
      <p>Bonjour ${customer.first},</p>
      <p>Ta commande <strong>#${orderRef}</strong> a bien été reçue.</p>
      <div style="background:#111;border:1px solid #222;padding:1rem;margin:1.5rem 0">
        ${items.map(i => `
          <div style="display:flex;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid #222">
            <span>${i.name} (${i.size})</span>
            <span>${i.price.toFixed(2)} €</span>
          </div>
        `).join('')}
        <div style="display:flex;justify-content:space-between;padding:.4rem 0">
          <span>Livraison</span><span>4.90 €</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-weight:bold;color:#C9A84C;padding-top:.5rem;border-top:1px solid #222">
          <span>Total</span><span>${total.toFixed(2)} €</span>
        </div>
      </div>
      <p style="color:#999;font-size:.85rem">Délai de livraison estimé : 5 à 10 jours ouvrés.</p>
      <p style="color:#666;font-size:.75rem;margin-top:2rem">© 2025 bestam'R</p>
    </div>
  `;
}
