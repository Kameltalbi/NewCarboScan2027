# HSCodeField Component - Guide d'Utilisation

## 📋 Vue d'ensemble

Le composant `HSCodeField` est un champ de saisie réutilisable pour les codes HS (Harmonized System) dans le module CBAM de CarboScan.

## ✨ Fonctionnalités

- ✅ Validation automatique (6 chiffres exactement)
- ✅ Formatage automatique (uniquement des chiffres)
- ✅ Tooltip informatif au survol
- ✅ Texte d'aide sous le champ
- ✅ Intégration ShadCN UI complète
- ✅ Support react-hook-form
- ✅ Version standalone disponible

## 🚀 Installation

Le composant est déjà créé dans `src/components/cbam/HSCodeField.tsx`.

## 📖 Utilisation avec react-hook-form

### Exemple basique

```tsx
import { useForm } from 'react-hook-form';
import { FormProvider } from '@/components/ui/form';
import { HSCodeField } from '@/components/cbam/HSCodeField';

function MyForm() {
  const form = useForm({
    defaultValues: {
      hs_code: '',
    },
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <HSCodeField name="hs_code" />
        <button type="submit">Valider</button>
      </form>
    </FormProvider>
  );
}
```

### Exemple avec validation Zod

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  hs_code: z.string().regex(/^\d{6}$/, 'Le code HS doit contenir exactement 6 chiffres'),
});

function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { hs_code: '' },
  });

  return (
    <FormProvider {...form}>
      <HSCodeField name="hs_code" />
    </FormProvider>
  );
}
```

## 🎯 Utilisation Standalone (sans react-hook-form)

```tsx
import { StandaloneHSCodeField } from '@/components/cbam/HSCodeField';
import { useState } from 'react';

function MySimpleForm() {
  const [hsCode, setHsCode] = useState('');

  return (
    <StandaloneHSCodeField
      value={hsCode}
      onChange={setHsCode}
      label="Code HS"
      required={true}
    />
  );
}
```

## 🔧 Props

### HSCodeField (avec react-hook-form)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | `'hs_code'` | Nom du champ dans le formulaire |
| `label` | `string` | `'HS Code'` | Texte du label |
| `placeholder` | `string` | `'123456'` | Placeholder du champ |
| `required` | `boolean` | `true` | Si le champ est requis |
| `className` | `string` | `undefined` | Classes CSS additionnelles |

### StandaloneHSCodeField

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | Valeur du champ (requis) |
| `onChange` | `(value: string) => void` | - | Callback de changement (requis) |
| `onBlur` | `() => void` | `undefined` | Callback de blur |
| `error` | `string` | `undefined` | Message d'erreur externe |
| `label` | `string` | `'HS Code'` | Texte du label |
| `placeholder` | `string` | `'123456'` | Placeholder du champ |
| `required` | `boolean` | `true` | Si le champ est requis |
| `className` | `string` | `undefined` | Classes CSS additionnelles |

## 🎨 Comportement

### Validation

- ✅ Accepte uniquement des chiffres (0-9)
- ✅ Limite à 6 caractères maximum
- ✅ Valide que le code contient exactement 6 chiffres
- ✅ Trim automatique des espaces au blur

### Formatage

- Les caractères non-numériques sont automatiquement supprimés
- Le champ est limité à 6 caractères
- La police est monospace pour une meilleure lisibilité

## 📝 Exemples d'Intégration

Voir `src/components/cbam/CBAMFormExample.tsx` pour des exemples complets d'intégration.

## 🎯 Cas d'usage

1. **Formulaire CBAM complet** : Utiliser `HSCodeField` avec react-hook-form
2. **Formulaire simple** : Utiliser `StandaloneHSCodeField` pour des cas simples
3. **Validation personnalisée** : Combiner avec Zod ou Yup pour une validation avancée

## ⚠️ Notes importantes

- Le composant nécessite `FormProvider` de react-hook-form pour la version principale
- La validation est automatique mais peut être complétée par une validation externe (Zod, Yup)
- Le tooltip utilise un Popover ShadCN qui s'affiche au survol de l'icône Info

