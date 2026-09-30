# Configuration des environnements LocalDeals

## Principe

Les builds EAS utilisent trois environnements séparés. `eas.json` fixe toujours le type d'environnement et interdit l'accès de démonstration en preview et en production. Les coordonnées Supabase et les fournisseurs optionnels sont configurés dans EAS, pas avec des secrets committés dans le dépôt.

| Variable | Développement | Preview | Production |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_APP_ENV` | `development` | `preview` | `production` |
| `EXPO_PUBLIC_ENABLE_DEV_AUTH` | `true` si nécessaire | `false` | `false` |
| `EXPO_PUBLIC_ENABLE_GOOGLE_AUTH` | selon configuration | selon configuration | `true` seulement après validation OAuth |
| `EXPO_PUBLIC_ENABLE_PHONE_AUTH` | `false` par défaut | `false` par défaut | `true` seulement avec un fournisseur SMS actif |
| `EXPO_PUBLIC_SUPABASE_URL` | projet de développement | projet de staging conseillé | projet de production |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | clé publique | clé publique | clé publique |

Toutes les variables `EXPO_PUBLIC_*` sont intégrées dans le bundle mobile et doivent être considérées comme publiques. Ne jamais y placer une clé `service_role`, un secret OAuth, un mot de passe SMTP ou une clé privée.

## Développement local

Copier `.env.example` vers `.env`, renseigner l'URL et la clé publique Supabase, puis activer uniquement ce qui est réellement utilisable :

```dotenv
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_ENABLE_DEV_AUTH=true
EXPO_PUBLIC_ENABLE_GOOGLE_AUTH=false
EXPO_PUBLIC_ENABLE_PHONE_AUTH=false
```

Après toute modification d'une variable, redémarrer Metro avec le cache vidé :

```bash
npm run start:iphone
```

## EAS Build

Dans le tableau de bord Expo, créer les variables portant le badge `development`, `preview` ou `production`. Le champ `environment` de chaque profil dans `eas.json` charge automatiquement le bon jeu lors d'une build.

La clé Supabase publishable peut être visible par le client : la sécurité des données repose sur les policies RLS. Les secrets Google, SMTP et Supabase `service_role` restent exclusivement dans les consoles des fournisseurs ou dans un backend sécurisé.

Avant une build distribuée :

```bash
npm run verify
npx eas-cli@latest build --profile preview --platform all
```

Avant la production, vérifier que :

- `EXPO_PUBLIC_ENABLE_DEV_AUTH=false` ;
- le projet Supabase de production est utilisé ;
- chaque fournisseur activé a été testé dans une build native ;
- les policies RLS et les migrations de production ont été validées ;
- aucun secret n'apparaît dans `.env`, `eas.json`, l'historique Git ou le bundle.
