# Procédure support et signalement — ABC-19

Date : 29 septembre 2026.  
Mode : **DOCUMENTATION**. Pas de module de tickets dans CarboScan.

## Canal

Le signalement passe par la page **Contact** (`/contact`) déjà en place, ou par l'e-mail indiqué sur cette page.

Dans le message, indiquer au minimum :

1. **Organisation** (nom)
2. **Page ou écran** concerné (URL ou libellé du menu)
3. **Description** du problème ou de la question
4. **Capture** éventuelle (jointe au message ou à l'e-mail)
5. **Type** : usage · commercial · calcul (voir qualification ci-dessous)

Les sujets du formulaire public (bilan carbone, démo, autre) restent utilisables. Pour un bug, choisir « autre » et commencer le message par `[support]` ou `[bug]`.

## Qualification (équipe CarboScan)

| Type | Exemples | Traitement |
|------|----------|------------|
| **Commercial / prospect** | Demande de démo, tarif, devis | Parcours commercial. Hors suivi bug produit. |
| **Usage** | « Où exporter ? », « Comment clôturer ? » | Réponse courte + renvoi vers l'écran ou `/app/methode`. |
| **Calcul** | Résultat inattendu, facteur, total | Comparer aux **cas de référence ABC-10**. Ne pas inventer une règle. Ouvrir un correctif seulement si l'écart est confirmé. |
| **Incident technique** | Page blanche, erreur API, connexion | Vérifier logs (`api_request_logs`, `audit_events` côté ops). Corriger ou contourner. |

## Statut (tenu hors outil)

L'équipe tient le statut hors de l'application (boîte mail, tableur ou outil interne déjà utilisé) :

| Statut | Sens |
|--------|------|
| Ouvert | Signalement reçu, pas encore qualifié |
| En cours | Qualifié, traitement engagé |
| Résolu | Réponse envoyée ou correctif livré |
| Clos sans suite | Hors périmètre, doublon, ou non reproductible |

## Délais cibles (internes)

- Accusé de réception : **2 jours ouvrés**
- Première qualification (usage / commercial / calcul / technique) : **5 jours ouvrés**
- Écart de calcul confirmé : priorisé ; lien vers le cas de référence ABC-10 s'il existe

Ces délais sont des cibles d'équipe. Ils ne sont pas affichés comme SLA contractuel dans le produit.

## Ce qui n'est pas un ticket produit

- Demande de formation ou d'accompagnement → parcours commercial / ABC-15
- Question méthodologique ouverte → `/app/methode` et `À VALIDER ABC` si besoin
- PCAF / émissions financées → hors bilan corporate ; ne pas ouvrir un chantier PCAF pour un ticket support

## Preuve pour audit

- Cette procédure
- Un exemple de signalement traité (e-mail ou fiche interne) avec page, description, statut
- Pour un écart de calcul : référence au cas ABC-10 concerné

## Point ouvert

`À VALIDER ABC` : un formulaire authentifié dans l'application, avec statut ouvert / en cours / résolu, est-il exigé, ou cette procédure plus le canal contact suffit-elle ?
