exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, product } = JSON.parse(event.body);
    if (!email || !product) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Champs manquants' }) };
    }

    if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `bestam'R <onboarding@resend.dev>`,
          to: process.env.STORE_EMAIL || 'dams.girardin@free.fr',
          subject: `🔔 Nouvelle demande d'alerte stock — ${product}`,
          html: `
            <div style="font-family:sans-serif;padding:2rem;background:#080808;color:#F2EFE9">
              <h2 style="color:#C9A84C">Demande d'alerte stock</h2>
              <p><strong>Produit :</strong> ${product}</p>
              <p><strong>Email client :</strong> ${email}</p>
              <p style="color:#999;font-size:.85rem">Pense à le contacter dès le réappro.</p>
            </div>
          `,
        }),
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('notify-stock error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erreur serveur' }) };
  }
};
