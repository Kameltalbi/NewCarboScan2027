# Mise à jour validée : rapport en téléchargement

Décision utilisateur du 26 octobre 2026 : le rapport est remis en **PDF à télécharger**, après saisie obligatoire du nom, de l’entreprise, de l’e-mail et du téléphone. Le pays reste facultatif. Aucun rapport n’est envoyé par e-mail au prospect.

Le bouton devient « Télécharger mon rapport PDF ». Le PDF est généré par le moteur WeasyPrint déjà présent côté API et renvoyé directement au navigateur après enregistrement du contact. Un lien permet de le télécharger à nouveau dans la même session, sans nouvelle soumission. Le résultat d’orientation reste gratuit et visible sans coordonnées.

La migration 054 et le transport Resend ne prévoient plus que la notification **interne** à contact@carboscan.io. L’absence de clé Resend ne bloque donc pas le téléchargement ; elle met seulement les notifications internes en attente.

Captures actualisées dans [CAPTURES.md](CAPTURES.md). Exemples réels générés en test : [PDF ordinateur](rapport-exemple-ordinateur.pdf), [PDF mobile](rapport-exemple-mobile.pdf), [contenu HTML du rapport](exemple-rapport.html). Les coordonnées sont fictives. Le parcours navigateur a vérifié le téléchargement de vrais PDF et le formulaire obligatoire ; le dépôt de contacts reste en mémoire pendant ces tests. Les tests API vérifient aussi le refus d’un envoi Resend de type prospect.

Cette mise à jour remplace les indications d’envoi au prospect dans le compte rendu historique ci-dessous.

---

# Vérificateur CBAM et mise en avant — 26 octobre 2026

Implémenté dans le projet, sans publication en production et sans modifier les droits du calculateur CBAM complet existant.

## Relecture

- Vérificateur : http://127.0.0.1:4187/verificateur-cbam
- Accueil : http://127.0.0.1:4187/
- Guide CBAM et encart : http://127.0.0.1:4187/cbam
- Galerie du parcours : [CAPTURES.md](CAPTURES.md)
- [Exemple du rapport prospect](exemple-email-prospect.html)
- [Exemple de notification interne](exemple-notification-interne.html)
- [Extrait HTML pré-rendu](extrait-html.html)
- [Résultats navigateur détaillés](verification.json)

Il s’agit d’une prévisualisation locale sur la machine du projet, pas d’un hébergement public de préproduction. Le questionnaire et le résultat fonctionnent sans compte ni API. L’enregistrement réel du formulaire et la réception réelle des e-mails nécessitent l’API, sa base migrée et la configuration Resend sur l’environnement de préproduction. Le serveur Vite de prévisualisation seul ne fournit pas ces services.

Les exemples d’e-mails et de CSV sont produits avec des coordonnées fictives. Les tests navigateur appellent les vraies routes Fastify avec un dépôt en mémoire ; aucun vrai prospect n’a été créé et aucun e-mail réel n’a été envoyé. Aucun déploiement ni migration de production n’a été effectué.

## Réalisé

### Outil public

- Route /verificateur-cbam ajoutée ; accès gratuit, sans inscription ; introduction, explication et quatre FAQ présentes dans le HTML pré-rendu.
- Title, description et H1 du brief repris ; canonical et Open Graph propres à la page ; ajout au sitemap, désormais 72 URL.
- JSON-LD WebApplication avec offre à 0 EUR et FAQPage alimenté par les réponses visibles.
- Une question par écran, progression, retour, réponses conservées au retour, focus clavier et recentrage sur le questionnaire à chaque étape. Les sept questions deviennent six pour hydrogène et électricité.
- Comparaison du code douanier et pré-sélection de famille ; distinction entre correspondance, exclusion, code incomplet, entrée « ex », code absent et format invalide.
- Verdict, score sur 100, trois prochaines étapes, urgence et message de nuance pour les cas non directement concernés. Mention d’orientation non réglementaire affichée.
- Résultat immédiat local. Aucun appel d’enregistrement des réponses avant le formulaire volontaire. Les événements analytics intermédiaires contiennent des identifiants d’étape et des catégories de résultat, pas les coordonnées ni le code douanier.
- Formulaire final avec nom, entreprise, e-mail, pays, téléphone facultatif, consentement non précoché, politique de confidentialité et honeypot. Aucun abonnement à une newsletter.
- Boutons démo, WhatsApp avec verdict/score dans le message et guide CBAM.

### Mise en avant

| Emplacement | Comportement |
| --- | --- |
| En-tête de l’accueil | Bouton secondaire à contour à côté du CTA existant ; empilement sur petits écrans. |
| Bandeau | Au-dessus du menu sur les routes publiques ; absent sur le vérificateur et les routes privées. Fermeture locale pour 30 jours. |
| Section d’accueil | Placée juste après la présentation des trois piliers de l’offre. Texte et bouton du brief. |
| Encart | /cbam et articles dont le slug indique CBAM ou MACF ; uniquement à partir de 1024 px, après 50 % de défilement. Fermeture séparée pour 30 jours. |

Le bandeau réserve 40 px sur ordinateur, 64 px sur mobile/tablette. Un script court dans le head lit la fermeture avant les styles et le premier affichage ; aucune insertion tardive du bandeau après chargement. Le test de rechargement avec fermeture mémorisée observe un menu à y=0 avant et après hydratation, contre y=40 lorsqu’il est ouvert sur ordinateur. Ce contrôle porte sur la géométrie du bandeau ; il n’est pas une certification des Core Web Vitals de tout le site.

L’encart utilise une colonne latérale réservée dès le premier affichage sur les pages concernées : il ne recouvre ni l’article ni le pied de page. Il est aussi masqué lorsqu’un dialogue du site est ouvert. Aucun nouveau popup plein écran, aucun encart mobile.

Liens supplémentaires intégrés sur /cbam avant le CTA du calculateur, le guide de blog demandé et les pages industrie et transport. Le mot « gratuit » concerne uniquement ce vérificateur ; le simulateur de coût freemium reste un chantier ultérieur.

### Contacts, e-mails et export

- Nouvelle route POST /v1/public/cbam-verifier/leads, publique et limitée à cinq soumissions/minute/IP.
- Validation côté serveur, consentement obligatoire, rejet des scores/verdicts fournis par un client et recalcul depuis les réponses validées.
- Le formulaire générique /v1/public/leads refuse le type réservé cbam_verifier, afin de ne pas contourner cette validation.
- Enregistrement dans contact_requests : réponses, verdict, score, version de configuration, code douanier, pays, date et texte du consentement.
- Identifiant de soumission stable pour éviter les doublons lors d’une nouvelle tentative réseau identique.
- Deux messages Resend : rapport prospect et notification à **contact@carboscan.io**, adresse confirmée par l’utilisateur. Expéditeur repris de l’intégration existante : CarboScan <contact@carboscan.io>, configurable.
- Utilisation de l’API HTTP Resend déjà présente dans les anciennes fonctions ; aucune dépendance Nodemailer ou nouvelle bibliothèque d’envoi installée.
- File d’e-mails durable en base avec transaction contact + messages, identifiants d’idempotence Resend, reprise des envois interrompus et jusqu’à six tentatives avec attente progressive. L’acceptation du formulaire signifie enregistrement/mise en file, pas réception garantie par une boîte e-mail.
- Export CSV complet, protégé par le contrôle superadmin, à GET /v1/admin/cbam-verifier/leads.csv. Bouton ajouté au tableau de bord superadmin, avec authentification et cookies du client API. Les cellules pouvant être interprétées comme formules sont neutralisées.

## Configuration et fichiers principaux

Le fichier `packages/carbon-engine/src/cbam-verifier/config.fr.json` regroupe les textes français, questions, points, règles déclaratives de verdict, conditions des prochaines étapes, tranches de score, FAQ et 42 entrées de codes. C’est la source française pouvant être déclinée en anglais ou en arabe ultérieurement. Aucun changement de code nécessaire pour modifier les textes, poids ou règles déclarées.

Le moteur partagé est `packages/carbon-engine/src/cbam-verifier/index.ts` : navigateur et API utilisent la même logique. Le serveur recalcule le résultat, sans faire confiance à celui du navigateur.

Autres fichiers :

- `apps/web/src/features/cbam-verifier/` : questionnaire, résultats et promotions.
- `apps/api/src/routes/cbamVerifier.ts` : formulaire et CSV.
- `apps/api/src/services/cbamVerifier/` : enregistrement, modèles d’e-mails, transport Resend et file.
- `db/migrations/054_cbam_verifier_outbox.sql` : nouvelle table de file d’envoi, sans modification des données existantes.

Cas non explicitement couverts par le brief : une exportation seulement prévue d’hydrogène/électricité, ou prévue avec famille inconnue, reçoit « Probablement concerné ». Une entrée « ex » non clarifiée ou un code partiel ne produit pas de certitude. Ces choix conservateurs sont à relire avant publication.

## Tests

| Cas demandé | Résultat obtenu |
| --- | --- |
| Acier, export UE, importateur > 50 t, rien de prêt | Concerné, score 0 |
| Ciment, export UE, seuil inconnu | Probablement concerné |
| Électricité, export UE | Concerné ; six questions, seuil absent |
| Textile / Autre produit | Pas directement concerné |
| Code 7318 | Famille Fer et acier pré-sélectionnée |
| Tout prêt et clients demandeurs | Score 100 |

Contrôles complémentaires réussis : exclusions 7204, plusieurs ferroalliages et 31056000 ; entrée ex 25070080 ; codes partiels ; bonus conditionné à des émissions calculées selon CBAM ; consentement absent refusé ; score forgé refusé ; formulaire générique réservé refusé ; honeypot ignoré ; limitation de débit ; CSV privé ; échappement HTML/CSV ; requête Resend et idempotence vérifiées avec transport simulé.

Tests navigateur : parcours complet sur ordinateur et mobile, clavier et retour, absence d’enregistrement avant formulaire, consentement initialement décoché, envoi du formulaire à la vraie route avec dépôt mémoire, quatre placements analytics, deux fermetures indépendantes de 30 jours, réapparition après expiration, exclusions de routes, absence d’encart mobile, géométrie non superposée de l’encart.

Commandes et résultats :

- `npm run build:engine` et build API : succès.
- `npm run build:web` : succès, 72 pages pré-rendues et contrôlées.
- `npx tsx --test apps/api/src/tests/cbam-verifier.test.ts` : 11 tests, 11 réussis.
- ESLint ciblé sur le nouveau moteur, l’API, le client API et les composants : succès, aucune alerte.
- `node apps/web/scripts/review-verifier.mjs` : succès.
- `docker compose config --quiet` : succès ; ne démarre aucun service.
- `git diff --check` : succès.

Le test navigateur peut être reproduit après build API et web, avec la prévisualisation locale active. Il utilise un domaine HTTPS fictif intercepté localement pour activer les helpers analytics sans envoyer de données à Google. Le dépôt mémoire évite de toucher à une base réelle.

## Codes douaniers : écarts et sources

Comparaison avec l’annexe I de la version consolidée du 20 octobre 2025, identifiée comme version actuelle sur EUR-Lex lors de la vérification du 26 octobre 2026 :

- **Ciment** : écrire **ex 2507 00 80**, et non couvrir tout 2507 00 80 ; les argiles kaoliniques non calcinées sont exclues. Une description produit est donc nécessaire pour conclure sur cette entrée.
- **Acier** : l’annexe couvre le chapitre 72 avec exclusions explicites. La configuration reprend 7202 2, 7202 30 00, 7202 50 00, 7202 70 00, 7202 80 00, 7202 91 00, 7202 92 00, 7202 93 00, 7202 99 (et ses sous-entrées indiquées) et 7204 comme exclusions. Elle n’utilise pas la notation approximative « x ».
- **Engrais** : exclusion 3105 60 00 conservée ; le code raccourci 3105 appelle une précision.
- **Sous-positions exactes** : les écritures 7303 00, 7309 00, 7311 00, 7609 00 00, 7611 00 00 et 7613 00 00 sont conservées à leur niveau officiel. Les descriptions affichées sont abrégées pour l’outil ; les codes et exceptions gouvernent la comparaison.
- Le seuil de masse n’est pas appliqué à l’hydrogène ni à l’électricité. L’outil oriente des exportateurs ; il ne valide pas l’existence d’un code complet dans toute la nomenclature douanière ni l’ensemble des autres exemptions du règlement.

Sources primaires : [annexe I consolidée](https://eur-lex.europa.eu/legal-content/EN/TXT/?qid=1768494520140&uri=CELEX%3A02023R0956-20251020), [texte consolidé complet](https://eur-lex.europa.eu/legal-content/EN/TXT/?qid=1788225827214&uri=CELEX%3A02023R0956-20251020), [règlement modificatif 2025/2083](https://eur-lex.europa.eu/legal-content/en/TXT/?uri=celex%3A32025R2083). Référence de transport : [API d’envoi Resend](https://resend.com/docs/api-reference/emails/send-email).

## Analytics

`cbam_verifier_promotion_click` porte `placement` : header, banner, section, slideout. Les liens des autres pages portent cbam, blog, industry ou transport. Déclarer `placement` comme dimension personnalisée dans GA4 pour comparer les emplacements.

Événements du parcours : cbam_verifier_started, cbam_verifier_question_validated (question_id et step), cbam_verifier_result_viewed (verdict, score_band), cbam_verifier_abandoned (question_id), cbam_verifier_lead_submitted, cbam_verifier_whatsapp_click et cbam_verifier_demo_click.

Marquer **cbam_verifier_lead_submitted** comme événement clé principal dans la propriété GA4, et les clics de prise de contact comme événements clés secondaires si souhaité. Aucun réglage du compte GA4 n’a été modifié sans accès à cette propriété. Les étapes validées permettent aussi de construire un entonnoir et de mesurer les abandons même lorsqu’un navigateur ne transmet pas son événement de fermeture.

## À valider sur l’environnement de préproduction

1. Appliquer la migration 054 sur sa base de préproduction ; le daemon Docker local étant inactif, cette migration et les requêtes SQL n’ont pas été exécutées contre PostgreSQL durant cette session.
2. Injecter côté API `RESEND_API_KEY` depuis le compte Resend existant, et vérifier l’expéditeur vérifié `RESEND_FROM_EMAIL`. `CBAM_NOTIFICATION_EMAIL` vaut contact@carboscan.io. Aucune clé ne doit être placée dans VITE_* ni dans le navigateur. Le Compose et .env.example sont préparés pour ces variables.
3. Effectuer un envoi à une adresse de test autorisée et vérifier la réception des deux messages et les états sent en base. Les exemples livrés ne sont pas une preuve de réception réelle.
4. Vérifier la réception dans GA4 et marquer l’événement principal comme événement clé.
5. Relire les cas « probablement concerné » et les réserves de codes, puis décider de la publication. Aucune production ne sera modifiée avant cette relecture.

La préproduction publique et la configuration Nginx réelle restent à confirmer : le runbook du dépôt désigne ktoptima.com comme production, distinct du domaine carboscan.io demandé. Les corrections de domaine et de vrais statuts 404 préparées dans le lot SEO ne sont pas déclarées déployées.
