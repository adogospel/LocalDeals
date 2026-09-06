# Application mobile LocalDeals

Application Expo SDK 54 située dans le monorepo LocalDeals.

La phase 4 connecte le catalogue Supabase, la recherche filtrée, les favoris, la publication multi-photos, les brouillons et la gestion des annonces du vendeur.

```bash
copy .env.example .env
npm install
npm start
```

Commandes :

```bash
npm run android
npm run ios
npm run web
npm run start:tunnel
npm run start:dev-client
npm run lint
npm run typecheck
npm test
npm run check
```

`npm run start` génère un QR pour **Expo Go**. Le téléphone et le PC doivent être sur le même Wi-Fi. Si le QR ne rejoint pas le serveur local, utilisez `npm run start:tunnel`. La commande `npm run start:dev-client` est réservée à une application de développement LocalDeals installée avec EAS.

## Accès local de développement

Pour parcourir l’application sans SMTP ni vérification e-mail, conservez ces deux valeurs dans votre fichier `.env` local :

```dotenv
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_ENABLE_DEV_AUTH=true
```

Sur l’écran de connexion, saisissez une adresse e-mail valide puis utilisez **Explorer l’application**. Cette session reste sur l’appareil et n’écrit aucune donnée dans Supabase. Avant une version distribuée, utilisez `EXPO_PUBLIC_APP_ENV=production` et désactivez `EXPO_PUBLIC_ENABLE_DEV_AUTH`.

Consultez le [README principal](../../README.md) et le [guide d’authentification](../../docs/AUTH_SETUP.md) pour configurer Supabase, les e-mails et Google OAuth.
