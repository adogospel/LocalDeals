# LocalDeals

Marketplace mobile locale destinée au Cameroun. Les phases 3 à 6 du MVP fournissent une application Expo/React Native premium, une authentification Supabase complète, un catalogue transactionnel sécurisé, la négociation en temps réel et un parcours de confiance après l’offre.

## État du MVP — phases 3 à 6

- Expo SDK 57, React Native, Expo Router et TypeScript strict
- Design system LocalDeals : orange, blanc, bleu nuit et police Sora
- Connexion e-mail/mot de passe et vérification e-mail par code à 6 chiffres
- Création de compte avec nom, ville et quartier
- 37 villes camerounaises et plus de 250 quartiers pré-enregistrés
- Quartiers chargés dynamiquement selon la ville, avec option « Autre »
- Mot de passe oublié avec code de récupération
- Google OAuth via Supabase Auth avec PKCE
- Connexion par téléphone conservée comme canal optionnel
- Sessions chiffrées dans le Keychain iOS / Keystore Android
- Profils, avatars, politiques RLS, triggers et données de référence versionnés
- Écrans Accueil et Détail d’annonce disponibles avec données de démonstration
- Catalogue PostgreSQL persistant avec 11 catégories, recherche plein texte, tris et filtres
- Publication d’annonces avec 1 à 6 photos, optimisation JPEG et brouillon local automatique
- Storage public pour les médias, écritures limitées au dossier du vendeur par RLS
- Favoris privés, gestion des annonces, statut vendu/remise en vente et suppression des médias
- Galerie produit horizontale et paginée pour parcourir toutes les photos d’une annonce
- Conversations privées par annonce entre un acheteur et le vendeur
- Inbox avec recherche, filtres achats/ventes/non lus et rafraîchissement temps réel
- Chat complet, compteur de non-lus, lecture synchronisée et messages système
- Offres sécurisées avec états en attente, acceptée, refusée ou annulée
- Acceptation réservant automatiquement l’annonce et clôturant les offres concurrentes
- Transactions créées automatiquement après acceptation d’une offre
- Double confirmation acheteur/vendeur avant le passage définitif au statut vendu
- Historique séparant achats et ventes, relié aux conversations et aux annonces
- Centre de notifications privé et synchronisé en temps réel
- Avis publics vérifiés, limités aux participants d’une transaction terminée
- Profils vendeurs publics avec note, avis, ventes terminées et annonces actives
- Signalements confidentiels d’un profil, d’une annonce ou d’un message
- Consentements juridiques versionnés avec garde obligatoire pour les comptes existants et OAuth
- Export JSON des données personnelles depuis l’application
- Suppression de compte Auth depuis l’application, médias effacés et transactions anonymisées
- Protection RLS contre la réutilisation d’un ancien jeton après suppression
- Écritures de messagerie et d’offres exclusivement via des fonctions PostgreSQL contrôlées par rôle
- Mode développement local permettant de tester tout le parcours sans contourner Supabase en production
- Traductions françaises et anglaises, tests, lint et CI

La phase 6 est terminée et sa migration `202608290005_phase_6_trust_transactions.sql` est déployée sur le projet Supabase lié.

Les phases 1 et 3 de mise à niveau vers la production sont terminées : séparation stricte des environnements, accès développeur impossible hors développement, fournisseurs Google/SMS protégés par des drapeaux sûrs, cycle de vie du compte et protection des données. Les dix phases sont détaillées dans [docs/TECHNICAL_ROADMAP.md](docs/TECHNICAL_ROADMAP.md), le déploiement de la phase 3 dans [docs/ACCOUNT_LIFECYCLE.md](docs/ACCOUNT_LIFECYCLE.md) et la configuration EAS dans [docs/PRODUCTION_CONFIGURATION.md](docs/PRODUCTION_CONFIGURATION.md).

## Architecture backend

Supabase suffit pour ce MVP :

- Supabase Auth gère les identités, les e-mails vérifiés, Google et les sessions.
- PostgreSQL stocke les profils, villes, quartiers, annonces, conversations, messages, offres, transactions, avis, notifications et signalements.
- Storage stocke les avatars.
- Realtime synchronise les conversations, messages, offres, transactions, avis et notifications.
- Row Level Security protège les données utilisateur et les fonctions SQL contrôlent chaque action métier sensible.

MongoDB n’est pas nécessaire et ne doit pas être ajouté à ce stade. Il dupliquerait PostgreSQL, compliquerait la cohérence des profils et augmenterait la surface de sécurité sans bénéfice pour le MVP.

## Démarrage mobile

Prérequis : Node.js 22+, npm 11+ et un projet Supabase.

```bash
cd apps/mobile
copy .env.example .env
npm install
npm start
```

### Ouvrir l’application sur iPhone avec Expo Go

L’iPhone et l’ordinateur doivent être connectés au même Wi-Fi. Depuis `apps/mobile` :

```bash
npm run start:iphone
```

Attendre que le terminal affiche `Using Expo Go` et une adresse commençant par `exp://`. Sur iOS, scanner le QR avec l’application **Appareil photo** et toucher la bannière « Ouvrir dans Expo Go ». Ne pas utiliser le lecteur de codes du Centre de contrôle ni l’analyse d’une capture dans Photos : ils peuvent répondre « Aucune donnée utilisable trouvée » pour le protocole `exp://`.

Si le QR n’est pas reconnu, copier l’adresse complète affichée après `Metro waiting on`, par exemple `exp://192.168.100.238:8081`, l’envoyer sur l’iPhone par Messages ou WhatsApp, puis toucher le lien. Cela ouvre exactement le même projet dans Expo Go sans scanner le QR.

Si Expo Go s’ouvre mais ne joint pas Metro, désactiver temporairement le VPN de l’iPhone et vérifier dans Safari que `http://ADRESSE_IP:8081` répond. Le mode tunnel peut être tenté avec `npm run start:tunnel`, mais il dépend de la disponibilité du service ngrok.

Configurer `apps/mobile/.env` :

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_ENABLE_DEV_AUTH=true
EXPO_PUBLIC_ENABLE_GOOGLE_AUTH=false
EXPO_PUBLIC_ENABLE_PHONE_AUTH=false
```

Ne jamais placer une clé `service_role`, un secret Google, un mot de passe SMTP ou un mot de passe PostgreSQL dans une variable `EXPO_PUBLIC_*`.

## Déployer le backend

Depuis la racine du dépôt :

```bash
npx supabase login
npx supabase link --project-ref VOTRE_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push --include-seed
```

Le seed ne contient que les villes et quartiers de référence et peut être rejoué sans doublons. Ne lancez jamais `db reset --linked` sur une base contenant des données à conserver.

La configuration complète des e-mails, de Google OAuth et des URL de retour est décrite dans [docs/AUTH_SETUP.md](docs/AUTH_SETUP.md).

## Développement Supabase local

Docker Desktop doit être démarré :

```bash
npx supabase start
npx supabase db reset --local
npx supabase db lint --local
```

Les e-mails locaux sont interceptés par Mailpit. Son URL est affichée par `npx supabase status`.

## Contrôles qualité

```bash
cd apps/mobile
npm run check
npx expo-doctor@latest
```

Pour tester la phase 6 sans service e-mail, activez le mode de développement dans `.env`, connectez-vous avec une adresse quelconque, ouvrez une annonce puis utilisez « Écrire au vendeur » et « Faire une offre ». Avec deux vrais comptes Supabase sur deux appareils : acceptez l’offre côté vendeur, ouvrez « Mes transactions », confirmez la remise sur chaque appareil, puis publiez un avis. Vérifiez également le centre de notifications, le profil public et le formulaire de signalement.

Le MVP ne traite pas encore les paiements en ligne : la transaction Phase 6 sécurise une remise en main propre. Ne présentez jamais LocalDeals comme tiers de paiement tant qu’une intégration Mobile Money et sa conformité n’ont pas été développées.

## Structure

```text
apps/mobile/
  src/app/             routes Expo Router
  src/components/      composants UI et formulaires
  src/features/        logique auth, localisations, profils et catalogue
  src/i18n/            traductions FR/EN
  src/lib/             Supabase, stockage sécurisé, environnement
  src/providers/       session et état réseau
  src/theme/           tokens du design system
  src/types/           types PostgreSQL/Supabase
supabase/
  migrations/          schéma, triggers, contraintes et RLS
  seeds/               villes et quartiers idempotents
  templates/           e-mails de confirmation et récupération
  config.toml          configuration Supabase locale
docs/
  AUTH_SETUP.md        procédure Supabase, SMTP et Google OAuth
  ACCOUNT_LIFECYCLE.md suppression, export, rétention et tests RLS
```

## Sauvegardes

Les sauvegardes PostgreSQL ne contiennent que les métadonnées de Storage. Sauvegarder également les objets des buckets `avatars` et `listing-images`. Tester une restauration avant le lancement public et après chaque changement important du schéma.
