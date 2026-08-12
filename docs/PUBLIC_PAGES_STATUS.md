# Pages publiques — Newcarboscan-2027

Statut : **branchées sur API PostgreSQL** (vague 1, avant portage tables métier complet).

## Endpoints publics

| Méthode | Route | Usage |
|---|---|---|
| POST | `/auth/register` | Inscription |
| POST | `/auth/login` | Connexion |
| POST | `/v1/public/leads` | Contact, démo, guide, pricing, calculateurs |
| GET | `/v1/public/blog` | Liste articles |
| GET | `/v1/public/blog/:slug` | Article (HTML sanitisé serveur) |
| GET | `/v1/public/emission-factors` | Pack facteurs testeur |
| POST | `/v1/public/free-bilan/calculate` | Testeur `/bilan-gratuit` via carbon-engine |

Migration SQL : `db/migrations/003_public_surface.sql`

## Pages / composants réécrits (plus de Supabase)

- Auth, Inscription, InscriptionForm
- Blog + BlogPost (DOMPurify)
- Contact
- Demo + DemoSteps
- Guide download (homepage)
- Pricing / enterprise quote
- BilanGratuit (calcul serveur déterministe)
- EmissionFactors (pack public)
- Calculateurs leads : personnel, empreinte produit, CBAM
- useAuth (JWT localStorage)

## Règles audit respectées

- Pas d’appels Supabase sur la surface publique
- Testeur : moteur unique + disclaimer (pas de ROI / SBTi inventés)
- Leads rate-limités via limite globale API
- Blog XSS : sanitize serveur + DOMPurify client

## Suite

Portage des **tables métier** PostgreSQL (vague suivante), puis écrans authentifiés `/app/*`.
