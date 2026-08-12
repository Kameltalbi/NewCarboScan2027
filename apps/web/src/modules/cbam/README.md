# Module CBAM - Guide d'Intégration

Ce document explique comment intégrer et déployer le module CBAM complet avec import Excel, calcul des émissions, et génération de PDF.

## 📋 Prérequis

### Dépendances Frontend

Ajoutez les dépendances suivantes à votre `package.json` :

```bash
npm install xlsx
```

### Configuration Supabase

1. **Créer le bucket de stockage** :
   - Allez dans Supabase Dashboard > Storage
   - Créez un bucket nommé `cbam`
   - Configurez les politiques RLS si nécessaire

2. **Exécuter la migration SQL** :
   ```bash
   supabase migration up
   ```
   Ou exécutez manuellement le fichier :
   `supabase/migrations/20250131000006_create_cbam_reports_table.sql`

## 🚀 Déploiement

### 1. Déployer la Edge Function

```bash
# Depuis la racine du projet
supabase functions deploy cbam-calc
```

La fonction sera déployée à l'URL :
```
https://<your-project-ref>.supabase.co/functions/v1/cbam-calc
```

### 2. Configurer les Variables d'Environnement

Les variables suivantes sont automatiquement disponibles dans les Edge Functions :
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Assurez-vous qu'elles sont configurées dans votre projet Supabase.

### 3. Mettre à jour le Frontend

Le composant `CBAMPage` utilise déjà `supabase.functions.invoke()` pour appeler la Edge Function. Assurez-vous que le client Supabase est correctement configuré dans `src/integrations/supabase/client.ts`.

## 📁 Structure des Fichiers

```
src/modules/cbam/
├── types.ts              # Types TypeScript
├── cbamParser.ts         # Parser Excel côté client
├── excelTemplate.ts       # Générateur de template Excel
├── CBAMUpload.tsx        # Composant d'upload
├── CBAMResult.tsx        # Composant d'affichage des résultats
├── CBAMPage.tsx          # Page principale
└── CBAMApp.tsx           # Point d'entrée du module

supabase/functions/cbam-calc/
├── index.ts              # Point d'entrée de la fonction
├── calculateCBAM.ts       # Moteur de calcul
├── feFactors.ts          # Facteurs d'émission
└── pdfGenerator.ts       # Générateur PDF
```

## 🔧 Utilisation

### 1. Télécharger le Template Excel

L'utilisateur peut télécharger un template Excel avec 5 feuilles :
- `general` : Informations générales du produit
- `energy` : Consommations énergétiques
- `materials` : Matériaux utilisés
- `transport` : Données de transport
- `process` : Émissions de processus

### 2. Remplir le Template

Chaque feuille contient des colonnes spécifiques. Les colonnes `FE` (Facteur d'Émission) sont optionnelles - si non renseignées, des valeurs par défaut seront utilisées.

### 3. Upload et Calcul

1. L'utilisateur upload le fichier Excel
2. Le fichier est parsé côté client avec `xlsx`
3. Les données sont envoyées à la Edge Function `cbam-calc`
4. La fonction calcule les émissions et génère un PDF
5. Les résultats sont sauvegardés dans `cbam_reports`
6. L'utilisateur voit les résultats et peut télécharger le PDF

## 📊 Formules de Calcul

### Énergie
```
Émissions = Σ(quantité × FE)
```
- Unités supportées : kWh, MWh, m³, L, MJ
- Conversion automatique : kWh → MWh pour l'électricité

### Matériaux
```
Émissions = Σ(quantité_en_tonnes × FE)
```
- Conversion automatique : kg → tonnes

### Transport
```
Émissions = Σ(distance_km × tonnage × FE)
```
- FE en tCO₂e par tonne-kilomètre

### Processus
```
Émissions = Σ(valeur)
```
- Les valeurs sont déjà en tCO₂e

## 🔐 Sécurité (RLS)

La table `cbam_reports` utilise Row Level Security (RLS) :
- Les utilisateurs ne peuvent voir que leurs propres rapports
- Les utilisateurs peuvent créer, modifier et supprimer leurs propres rapports
- Les admins peuvent avoir des politiques supplémentaires si nécessaire

## 🐛 Dépannage

### Erreur : "Failed to parse Excel file"
- Vérifiez que le fichier Excel contient les 5 feuilles requises
- Vérifiez que les noms des feuilles sont exacts : `general`, `energy`, `materials`, `transport`, `process`
- Vérifiez que les en-têtes de colonnes sont corrects

### Erreur : "PDF generation failed"
- Vérifiez que le bucket `cbam` existe dans Supabase Storage
- Vérifiez les permissions du bucket
- La génération PDF peut échouer silencieusement - les résultats seront quand même sauvegardés

### Erreur : "Unauthorized"
- Vérifiez que l'utilisateur est authentifié
- Vérifiez que le token d'authentification est envoyé dans l'en-tête `Authorization`

## 📝 Notes Importantes

1. **Génération PDF** : Le générateur PDF utilise `pdf-lib` qui est compatible avec Deno. Pour une génération PDF plus avancée, considérez utiliser Puppeteer ou un service externe.

2. **Facteurs d'Émission** : Les FE par défaut sont basés sur des valeurs moyennes européennes. Ils peuvent être personnalisés dans le fichier Excel.

3. **Performance** : Pour de gros fichiers Excel, le parsing côté client peut prendre quelques secondes. Un indicateur de chargement est affiché.

4. **Stockage** : Les PDF sont stockés dans Supabase Storage avec une structure de dossiers : `cbam-reports/{timestamp}-{product_name}.pdf`

## 🔄 Améliorations Futures

- [ ] Support de plusieurs produits dans un même fichier Excel
- [ ] Export Excel des résultats
- [ ] Historique des calculs
- [ ] Comparaison avec des calculs précédents
- [ ] Graphiques et visualisations
- [ ] Validation avancée des données Excel
- [ ] Support de formats Excel supplémentaires (.xls, .csv)




