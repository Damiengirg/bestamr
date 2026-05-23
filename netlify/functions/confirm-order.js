// netlify/functions/confirm-order.js
// Déclenché après paiement Stripe confirmé
// → Crée la commande chez Gelato automatiquement
// → Envoie email de confirmation via Resend (gratuit)
//
// Variables d'environnement requises :
//   STRIPE_SECRET_KEY
//   GELATO_API_KEY
//   RESEND_API_KEY
//   STORE_EMAIL (ex: commandes@bestamar.fr)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Mapping produit → Gelato Product UID
// À remplacer avec tes vrais UIDs depuis gelato.com/catalog
const GELATO_PRODUCTS = {
  'tshirt-signature': {
    productUid: 'apparel_product_gca_t-shirt_gsc_gildan-18000_gc_black_gp_w-3xl-front_gs_front',
    name: 'T-Shirt Signature bestam\'R'
  },
  'hoodie-premium': {
    productUid: 'apparel_product_gca_hoodie_gsc_gildan-18500_gc_black_gp_front_gs_front',
    name: 'Hoodie Premium bestam\'R'
  },
  'cagoule-techwear': {
    productUid: 'apparel_product_gca_balaclava_gsc_generic_gc_black',
    name: 'Cagoule Techwear bestam\'R'
  },
  'masque-street': {
    productUid: 'apparel_product_gca_facemask_gsc_generic_gc_black',
    name: 'Masque Streetwear bestam\'R'
  },
  'bonnet-ribbed': {
    productUid: 'apparel_product_gca_beanie_gsc_generic_gc_black',
    name: 'Bonnet Ribbed bestam\'R'
  },
  'casquette-5panel': {
    productUid: 'apparel_product_gca_cap-5panel_gsc_generic_gc_black',
    name: 'Casquette 5-Panel bestam\'R'
  },
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { paymentIntentId, customer, items } = JSON.parse(event.body);

    // 1. Vérifier que le paiement Stripe est bien confirmé
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Paiement non confirmé' })
      };
    }

    // 2. Construire la commande Gelato
    const orderRef = 'BST-' + paymentIntentId.slice(-8).toUpperCase();

    const gelatoOrder = {
      orderReferenceId: orderRef,
      customerReferenceId: customer.email,
      currency: 'EUR',
      items: items.map((item, idx) => {
        const gp = GELATO_PRODUCTS[item.id];
        return {
          itemReferenceId: `item-${idx}`,
          productUid: gp?.productUid || item.gelatoId,
          quantity: 1,
          // Fichier print à la demande — à configurer dans ton dashboard Gelato
          // fileUrl: 'https://bestamar.fr/assets/prints/tshirt-black.pdf',
        };
      }),
      shippingAddress: {
        firstName: customer.first,
        lastName: customer.last,
        addressLine1: customer.addr,
        postCode: customer.zip,
        city: customer.city,
        country: customer.country,
        email: customer.email,
      },
    };

    // 3. Envoyer commande à Gelato
    const gelatoRes = await fetch('https://order.gelatoapis.com/v4/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.GELATO_API_KEY,
      },
      body: JSON.stringify(gelatoOrder),
    });

    const gelatoData = await gelatoRes.json();
    if (!gelatoRes.ok) {
      console.error('Gelato error:', gelatoData);
      // Ne pas bloquer le client — loguer l'erreur pour traitement manuel
    }

    // 4. Email de confirmation via Resend (gratuit jusqu'à 3000 emails/mois)
    if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `bestam'R <noreply@bestamar.fr>`,
          to: customer.email,
          subject: `✅ Commande confirmée #${orderRef} — bestam'R`,
          html: buildEmailHtml(orderRef, customer, items),
        }),
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, orderRef, gelatoOrderId: gelatoData.id }),
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
      <p>Ta commande <strong>#${orderRef}</strong> a bien été reçue et transmise à notre fournisseur pour fabrication.</p>
      <div style="background:#111;border:1px solid #222;padding:1rem;margin:1.5rem 0">
        ${items.map(i => `
          <div style="display:flex;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid #222">
            <span>${i.emoji || ''} ${i.name} (${i.size})</span>
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
      <p style="color:#999;font-size:.85rem">Délai de livraison estimé : 5 à 10 jours ouvrés.<br>Adresse : ${customer.addr}, ${customer.zip} ${customer.city}</p>
      <p style="color:#666;font-size:.75rem;margin-top:2rem">© 2025 bestam'R — Tous droits réservés</p>
    </div>
  `;
}
