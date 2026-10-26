# Relecture de la page CBAM — 26 octobre 2026

Document utilisé : `Page_CBAM_CarboScan.docx`, fourni par Kamel Talbi. Le document commercial joint auparavant n’est pas utilisé. Les consignes d’intégration viennent du message utilisateur ; le texte éditorial vient des sections désignées du document CBAM.

**Aucune mise en production.** Prévisualisation locale, sur la machine du projet : http://127.0.0.1:4187/cbam. Il ne s’agit pas d’un hébergement public. Le serveur de prévisualisation a été lancé pour la relecture.

## Intégration

- Title, meta description, H1 et badge repris tels quels.
- Blocs 1 à 10, puis FAQ, puis bloc 11 ; anciennes sections et introduction technique du maillage retirées de /cbam.
- Un H1, un H2 par bloc (le libellé d’en-tête est accessible aux lecteurs d’écran), un H2 pour la FAQ, douze H3 pour ses questions.
- Les six icônes sectorielles sont conservées. Le calendrier devient une grille de lignes responsive, empilée sur mobile.
- Toutes les réponses FAQ figurent dans le HTML pré-rendu. Un même fichier de contenu alimente les réponses visibles et FAQPage ; les chaînes sont comparées exactement par la vérification.
- CTA calculateur vers /cbam-calculator ; CTA experts vers /demo ; WhatsApp vers https://wa.me/21655053033.
- Liens internes vers /bilan-carbone-industrie, /bilan-carbone et l’article guide CBAM.
- Date visible sous le H1 : 26 octobre 2026. À mettre à jour dans le fichier de contenu et la balise time lors d’une nouvelle modification éditoriale.
- Palette, polices, en-tête et pied de page du site conservés. Le composant partagé de maillage reçoit des paramètres spécifiques à /cbam.
- Aucun texte entre crochets ne s’affiche ; aucun simulateur gratuit n’est annoncé. Les termes « quotas gratuits » du document sont conservés.

## Résultats vérifiés

`npm run build:web` : succès, 71 pages pré-rendues contrôlées.

`node apps/web/scripts/review-cbam.mjs` : succès.

- HTTP local /cbam : 200 ; H1 et les 12 réponses présents dans la réponse initiale sans JavaScript.
- Title et description conformes au document.
- Douze questions/réponses et leur JSON-LD identiques mot pour mot.
- Ordre des blocs, unicité du H1, absence de crochets et retrait des anciens textes vérifiés.
- Les cinq liens internes demandés répondent 200 en prévisualisation.
- Captures avec JavaScript désactivé : ordinateur 1440 px et mobile 390 px ; aucun débordement horizontal détecté.
- Trois événements analytics effectivement observés dans dataLayer lors des clics : cbam_calculator_click, cbam_expert_click, cbam_whatsapp_click. Paramètres : position et page_path. La vérification utilise une origine locale simulant un domaine de production, pour dépasser le blocage analytics volontaire de localhost. Aucun envoi GA4 réel n’est effectué par le test. Le marquage comme événements clés reste à configurer dans la propriété GA4.

## Livrables

- `cbam-ordinateur.png` et `cbam-mobile.png` : captures complètes.
- `cbam-ordinateur-apercu.png` et `cbam-mobile-apercu.png` : haut de page lisible.
- `cbam-mobile-calendrier.png` : détail du calendrier.
- `extrait-cbam-local.html` : extrait de la réponse HTTP locale avec H1 et première réponse FAQ.
- `verification-cbam.json` : résultats des contrôles.
- `CBAM_PASSAGES_SIGNALES.md` : quatre passages entre crochets retirés et points chiffrés à confirmer.

Pour consulter le HTML brut local :

```sh
curl -s http://127.0.0.1:4187/cbam
```

La commande visant https://carboscan.io/cbam montre encore l’ancienne production : aucun déploiement n’a été autorisé pour cette refonte. Elle ne constitue donc pas une preuve de la nouvelle page.

## Réserves pour la relecture

Les valeurs de 82 € et de 1,58 t sont conservées à la demande explicite de Kamel Talbi. Elles ne sont pas présentées dans ce compte rendu comme réglementairement vérifiées. Les coûts d’exemple sont cohérents arithmétiquement avec ces hypothèses arrondies ; leur validation métier et leur datation restent nécessaires avant publication. Aucun témoignage client n’a été inventé.

Aucun lien interne demandé n’est introuvable en prévisualisation. Le lien WhatsApp est construit avec le numéro fourni ; la disponibilité du compte destinataire n’est pas vérifiée par l’envoi d’un message.

## Google Rich Results Test

Le HTML de préproduction a été saisi dans le mode Code de l’outil officiel. Les tentatives automatisées n’ont pas produit de page de résultat exploitable ; l’interface est restée sur la saisie du code. Aucune validation Google n’est donc annoncée.

`rich-results-cbam.png` et `rich-results-cbam.txt` documentent cette interface, **pas un résultat de validation réussi**. Le contrôle exact de FAQPage par le vérificateur local passe ; il reste à lancer manuellement le test en mode Code à partir de `apps/web/dist/cbam.html`, ou sur la future URL de préproduction publique.
