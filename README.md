# bestam'R — Guide de déploiement

## Structure du projet
```
bestamar/
├── index.html                          ← Site complet
├── netlify.toml                        ← Config Netlify
├── package.json                        ← Dépendances functions
└── netlify/
    └── functions/
        ├── create-payment-intent.js    ← Stripe PaymentIntent
        └── confirm-order.js            ← Gelato + Email
```

---

## ÉTAPE 1 — Variables d'environnement Netlify

Dans Netlify → Site settings → Environment variables, ajoute :

| Variable | Où la trouver |
|---|---|
| `STRIPE_SECRET_KEY` | stripe.com → Developers → API keys → Secret key |
| `STRIPE_PUBLISHABLE_KEY` | stripe.com → Developers → API keys → Publishable key |
| `GELATO_API_KEY` | gelato.com → Settings → API keys |
| `RESEND_API_KEY` | resend.com → API keys (gratuit 3000 emails/mois) |
| `STORE_EMAIL` | Ton email de notification (ex: commandes@bestamar.fr) |

---

## ÉTAPE 2 — Mettre ta clé Stripe dans index.html

Ligne ~230 dans index.html :
```js
STRIPE_PK: 'pk_live_VOTRE_CLE_ICI',  // remplace pk_test_ par pk_live_ en prod
```

---

## ÉTAPE 3 — Configurer tes produits Gelato

1. Va sur gelato.com → Catalogue → trouve tes produits
2. Copie le `productUid` de chaque produit
3. Remplace les valeurs dans `confirm-order.js` → objet `GELATO_PRODUCTS`

---

## ÉTAPE 4 — Déployer sur Netlify via GitHub

1. Push ce dossier sur GitHub
2. Netlify → Add new site → Import from GitHub
3. Build command : `npm install`
4. Publish directory : `.`
5. Déploie → c'est en ligne

---

## ÉTAPE 5 — Tester en mode test Stripe

Utilise la carte test Stripe : `4242 4242 4242 4242` / exp: 12/34 / CVC: 123

---

## Coût total de l'infrastructure

| Service | Coût |
|---|---|
| Netlify | 0€/mois |
| GitHub | 0€/mois |
| Stripe | 1.4% + 0.25€ par vente |
| Gelato | % par commande (inclus dans ton prix) |
| Resend (emails) | 0€ jusqu'à 3000/mois |
| **Total fixe** | **0€/mois** |
