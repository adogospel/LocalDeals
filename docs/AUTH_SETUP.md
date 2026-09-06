# Configuration de l’authentification LocalDeals

Le code mobile et le schéma sont prêts. Les étapes ci-dessous nécessitent vos comptes Supabase, SMTP et Google ; aucun secret ne doit être commité dans Git.

## 1. Créer et relier Supabase

Créez un projet hébergé Supabase, puis exécutez depuis la racine :

```bash
npx supabase login
npx supabase link --project-ref VOTRE_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push --include-seed
```

Récupérez ensuite l’URL du projet et la clé publique/publishable depuis **Project Settings > API**, puis placez-les dans `apps/mobile/.env`.

Vous n’avez pas besoin de créer un cluster MongoDB : Supabase fournit déjà PostgreSQL, Auth et Storage dans le même projet.

## 2. Activer l’e-mail vérifié

Dans **Authentication > Providers > Email** :

1. Activez Email.
2. Activez la confirmation d’e-mail.
3. Fixez le mot de passe minimal à 10 caractères.
4. Exigez majuscules, minuscules et chiffres.
5. Activez la protection des changements de mot de passe.

Dans **Authentication > Email Templates** :

- remplacez le modèle de confirmation par `supabase/templates/confirmation.html` ;
- remplacez le modèle de récupération par `supabase/templates/recovery.html` ;
- conservez la variable `{{ .Token }}` : l’application attend un code à 6 chiffres.

La configuration locale équivalente est déjà présente dans `supabase/config.toml`.

## 3. Configurer l’envoi SMTP

Le serveur e-mail par défaut de Supabase est destiné aux essais et n’envoie pas librement à tous les utilisateurs. Pour tester avec votre propre adresse membre, il peut suffire. Pour inviter de vrais testeurs, configurez un fournisseur SMTP dans **Authentication > SMTP Settings**.

Vous aurez besoin de :

- l’hôte et le port SMTP ;
- un utilisateur et un mot de passe SMTP ;
- une adresse d’expédition, par exemple `no-reply@auth.localdeals.cm` ;
- un nom d’expéditeur, `LocalDeals`.

Configurez SPF, DKIM et DMARC sur votre domaine avant un lancement public. Les secrets SMTP restent uniquement dans Supabase ou dans un fichier `.env` local ignoré par Git.

## 4. Configurer les URL mobiles

Dans **Authentication > URL Configuration** :

- Site URL : `localdeals://`
- Redirect URLs : `localdeals://**`
- ajoutez explicitement `localdeals://auth/callback`
- ajoutez `localdeals://auth/reset-password`

Le schéma `localdeals` est déjà déclaré dans `apps/mobile/app.json`.

Les liens personnalisés et Google OAuth doivent être testés dans un **development build** ou une application installée. Expo Go ne peut pas enregistrer le schéma natif `localdeals://` comme une application compilée.

## 5. Configurer Google OAuth 2.0

Dans Google Auth Platform / Google Cloud Console :

1. Configurez l’écran de consentement OAuth.
2. Créez un client OAuth de type **Web application**.
3. Ajoutez comme URI de redirection autorisée :

   ```text
   https://VOTRE_PROJECT_REF.supabase.co/auth/v1/callback
   ```

4. Copiez le Client ID et le Client Secret.

Dans **Supabase > Authentication > Providers > Google** :

1. Activez Google.
2. Collez le Client ID et le Client Secret.
3. Enregistrez.

Le secret Google reste dans Supabase. L’application mobile appelle seulement Supabase avec la clé publique.
Le flux mobile utilise PKCE : un code intercepté par une autre application ne peut pas être échangé sans le vérificateur conservé sur l’appareil.

Pour Google avec Supabase local, modifiez temporairement la section `[auth.external.google]` de `supabase/config.toml`, placez le Client ID dans `client_id`, activez `enabled = true`, puis définissez le secret hors Git :

```dotenv
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=votre-secret
```

Ajoutez aussi `http://127.0.0.1:54321/auth/v1/callback` dans les URI Google autorisées.

## 6. Construire une application de développement

Après installation et connexion à EAS :

```bash
cd apps/mobile
npx eas build --profile development --platform android
```

Pour iOS, utilisez `--platform ios`. Installez le build obtenu, puis lancez Metro avec :

```bash
npx expo start --dev-client
```

## 7. Vérification fonctionnelle

Testez dans cet ordre :

1. inscription avec une ville et un quartier enregistrés ;
2. inscription avec l’option « Autre » ;
3. réception et validation du code e-mail ;
4. déconnexion puis connexion e-mail/mot de passe ;
5. demande de récupération et changement du mot de passe ;
6. connexion Google sur un development build ;
7. modification du profil et de la localisation ;
8. tentative de lecture/modification du profil d’un autre utilisateur pour confirmer la RLS.

## Checklist avant production

- SMTP personnalisé et domaine authentifié
- Google OAuth publié, écran de consentement validé
- URL de redirection de développement supprimées de la production
- CAPTCHA activé sur les inscriptions exposées publiquement
- limites Auth ajustées au trafic attendu
- politiques RLS testées automatiquement
- sauvegardes PostgreSQL et Storage vérifiées
- comptes Supabase et Google protégés par MFA
