# Correctifs SEO CarboScan — 26 octobre 2026

État : implémentation locale, build validé et refonte /cbam intégrée depuis le document Page_CBAM_CarboScan.docx. Aucun déploiement en production. Voir COMPTE_RENDU_CBAM.md pour la relecture de la page réécrite.

## Réalisé et méthode

| Sujet | Modification |
| --- | --- |
| HTML lisible sans JS | Pré-rendu Chromium des vrais composants React au build : 50 routes publiques et 22 articles publiés. Fichiers HTML par route ; shell privé séparé dans spa.html. Pas de migration de framework. |
| Métadonnées | Titres/descriptions des routes prioritaires adaptés au brief ; limites 60/155 respectées pour ces routes. Ajout de métadonnées uniques aux autres routes publiques auparavant génériques. Open Graph cohérent avec chaque page. |
| Canoniques | URL absolues sans www, racine avec slash, routes sans slash final. |
| H1 | Un H1 vérifié par page. H1 ajouté au calculateur ROI ; H1 des corps d’articles convertis en H2. Accueil ciblé sur le bilan carbone, CBAM sur Tunisie/Maroc. |
| Redirections | Nginx prépare une 301 pour www, HTTP via le protocole transmis par le proxy et slash final. Les alias calculateur-carbone, roi-carboscan et sitemap sont redirigés. Exemple de configuration du proxy TLS hôte fourni pour éviter une chaîne HTTP/www. |
| Vraies 404 | Suppression du fallback SPA général : seuls les chemins applicatifs identifiés reçoivent spa.html. Les chemins publics inconnus renvoient 404 avec une page dédiée. |
| Sitemap | Généré à partir des pages effectivement pré-rendues ; 72 URL, avec lastmod. Alias calculateur-carbone exclu. Liste livrée dans URLS_SITEMAP.txt. |
| Robots | Les pages publiques et ressources JS/CSS restent accessibles ; référence au sitemap conservée. En-tête noindex sur les chemins applicatifs servis par Nginx. |
| JSON-LD | Organization complété (fondateur, Tunis/TN, réseaux déjà présents dans le projet), WebSite existant conservé. Person Kamel Talbi sur /team avec le LinkedIn fourni, également lié depuis Organization.founder. BreadcrumbList de secours sur toutes les pages internes utilisant SEOHead. |
| Équipe | Biographie existante conservée ; lien LinkedIn de Kamel visible ; dimensions explicites et chargement différé des portraits. Aucun texte biographique inventé. |
| FAQ | Réponses de /faq présentes dans le HTML via des détails natifs ; contrôle de concordance entre texte et FAQPage, à l’espacement près. FAQ sectorielles existantes également contrôlées. |
| Maillage | Footer enrichi : CBAM, calculateur, bilan carbone, quatre secteurs, démo, équipe. Lien retour du calculateur vers le guide CBAM. Liens vers /cbam et /cbam-calculator dans l’article guide demandé. Maillage sectoriel existant conservé. |
| Performance | Suppression de la cascade CSS @import des polices : découverte directe depuis le head, avec display=swap conservé. Pas de promesse chiffrée de gain. |
| PWA | Fallback de navigation limité aux routes privées et shell séparé, pour ne pas présenter l’accueil sur une route publique inconnue. Révision du shell par build. |
| Mesure | GA4 existant conservé. Conversion contact_form_submit après succès réel de l’API dans le formulaire actif. Événement cbam_calculation_completed après calcul ; request_demo existait déjà après enregistrement. |

## Validation obtenue

`npm run build:web` : succès. Le build inclut `scripts/verify-seo.mjs` et échoue si les invariants contrôlés ne passent pas.

Résultat : `Verified 72 static pages: unique metadata, one H1, canonical, Open Graph, FAQ parity and sitemap.`

Contrôles effectués directement sur le HTML généré sans exécuter les scripts : présence d’un H1 unique, title unique, description unique, canonique propre, Open Graph cohérent, JSON-LD parseable, réponses FAQ présentes et sitemap correspondant. Ces contrôles ne remplacent pas le Rich Results Test de Google.

`git diff --check` : succès.

Preuves : `verification-build.txt`, `extrait-cbam-local.html`, `etat-http-public-avant.txt`, `URLS_SITEMAP.txt`. Le dernier fichier contient la liste finale complète du sitemap.

État public avant déploiement : www répond 200, l’URL inexistante répond 200, le HTML de /cbam ne contient aucun H1. Ces résultats décrivent le site actuellement en ligne, pas le build corrigé.

## Non réalisé, modifié ou en attente

- **Déploiement** : le runbook `docs/DEPLOY_VPS.md` désigne ktoptima.com comme production et demande une validation explicite avant déploiement. Confirmer l’hébergement et le proxy réels de carboscan.io avant toute action ; ne pas appliquer aveuglément le runbook ktoptima. L’exemple `deploy/nginx/carboscan-host.conf.example` doit être adapté aux certificats et au port réels.
- **Validation Nginx / codes HTTP corrigés** : impossible localement dans cette session, faute de daemon Docker actif et de binaire Nginx disponible. La configuration reste à tester avec `nginx -t` puis sur une préproduction avant publication. Les 301 et 404 corrigées ne sont pas déclarées vérifiées en production.
- **Préproduction CBAM** : prévisualisation locale active sur http://127.0.0.1:4187/cbam et captures livrées. Aucun hébergement public de préproduction configuré.
- **Refonte /cbam** : réalisée après réception du bon document ; 11 blocs, 12 FAQ et suivi des trois types de CTA. Les hypothèses numériques restent à confirmer par le propriétaire avant publication (voir CBAM_PASSAGES_SIGNALES.md).
- **Rédaction priorité 2** : gabarits préparés dans CONTENUS_A_VALIDER.md, sans publication de nouveaux contenus non validés. La page CBAM reprend désormais le document validé, sous réserve de la relecture en préproduction.
- **Simulateur freemium** : différé explicitement par l’utilisateur. Aucun changement des droits des abonnés. Page publique descriptive indexable ; aucune promesse de gratuité dans ses métadonnées ni celles de /cbam. Rapport PDF/e-mail non développé dans ce lot.
- **Routes suspectes** : /acv-landing présente un module ACV distinct de l’empreinte produit ; /solutions/solutions présente un catalogue de leviers ; /solutions/accompagnement présente un accompagnement distinct des autres services. Conservées avec canoniques propres, sans redirection destructive vers une page différente. Une fusion éditoriale pourra faire l’objet d’une décision séparée.
- **Requête « plateforme empreinte carbone »** : accès Search Console non disponible, donc page positionnée non déterminée. Aucun changement de ciblage sur une page choisie arbitrairement.
- **Formation** : aucun véritable parcours d’inscription à une session n’est présent sur la page actuelle. Pas de conversion d’inscription fictive. Le CTA de contact et request_demo ne sont pas présentés comme des inscriptions.
- **GA4** : événements émis par le code ; marquage comme événements clés et contrôle de réception dans la propriété GA4 à effectuer avec l’accès au compte.
- **Rich Results Test** : voir le résultat spécifique CBAM dans COMPTE_RENDU_CBAM.md. Les tests Google de l’accueil et /faq après déploiement restent à faire ; aucune capture de production corrigée n’est annoncée.
- **PageSpeed** : l’API Google a répondu HTTP 429 pour /cbam. Aucun score avant/après obtenu, ni LCP/CLS déclaré atteint. Reste à mesurer les trois pages demandées. Le bundle principal reste volumineux ; un chantier de découpage et de chargement des médias peut être nécessaire selon les mesures.
- **Search Console** : soumission du sitemap et demandes d’indexation non exécutées, faute d’accès et de déploiement. À faire pour les six pages demandées après mise en ligne.
- **Liens médias CarboTrack** : aucun message envoyé à La Presse ni à d’autres médias. Le brief ne fournit ni contacts ni liste de liens à actualiser.

## Maintenir les articles pré-rendus

Les 22 articles proviennent exclusivement de l’API publique, exportée le 26 octobre 2026 dans `apps/web/content/blog-snapshot.json`. Aucun accès administrateur ni donnée privée utilisé.

Après publication, modification ou retrait d’un article :

```sh
npm run seo:sync-blog -w @newcarboscan/web
npm run build:web
```

`SEO_API_ORIGIN` permet de choisir l’API publique à exporter. `SEO_BLOG_SNAPSHOT` permet de choisir un export différent au build. Le build utilise par défaut l’export versionné, sans dépendre du réseau. Un retrait d’article doit être suivi d’un nouvel export et d’un rebuild pour retirer son ancien HTML statique. Le hook de reconstruction automatique à la publication n’est pas configuré.

`SEO_LASTMOD` permet de fixer la date de modification lors d’un build reproductible ; sinon la date de génération est utilisée. Les nouvelles pages publiques doivent être ajoutées au manifeste de génération SEO avant leur publication.

## Recette après adaptation de l’hébergement

1. Confirmer la cible carboscan.io et sauvegarder selon son runbook ; tester les configurations Nginx.
2. Déployer d’abord en préproduction et vérifier les pages publiques sans JS, les formulaires et les routes privées.
3. Vérifier avec curl les variantes HTTP/HTTPS, avec/sans www et slash : une seule 301 vers l’URL finale, conservation des paramètres. L’URL inexistante doit répondre 404 ; /app et /auth doivent rester accessibles.
4. Contrôler le H1 et une réponse FAQ dans le HTML brut, puis les schémas avec Rich Results Test. Capturer les résultats et les vues ordinateur/mobile.
5. Mesurer PageSpeed mobile sur accueil, /cbam et /formation-bilan-carbone.
6. Vérifier les conversions GA4, soumettre le sitemap et demander l’indexation dans Search Console.
