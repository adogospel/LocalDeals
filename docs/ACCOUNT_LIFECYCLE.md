# Cycle de vie du compte et protection des données

La phase 3 fournit le parcours technique complet dans l’application et dans Supabase : consentements versionnés, export portable, suppression de l’identité Auth, effacement des médias, anonymisation des données transactionnelles et garde-fous RLS.

> Les textes juridiques embarqués constituent une base produit cohérente. Avant une soumission publique, l’éditeur doit faire valider les textes, l’adresse de contact et les durées de conservation par son conseil juridique, puis publier les mêmes versions sur les URL publiques prévues en phase 9.

## Parcours utilisateur

- **Inscription e-mail** : la case de consentement est obligatoire. Les versions `terms` et `privacy` acceptées sont transmises dans les métadonnées d’inscription puis enregistrées par le trigger serveur.
- **OAuth, téléphone et comptes existants** : le garde global redirige vers `/consent` tant que toutes les versions actives n’ont pas été acceptées.
- **Consultation** : les textes FR/EN restent accessibles avant et après authentification via `/legal/terms` et `/legal/privacy`.
- **Export** : `export_my_personal_data()` construit un document JSON limité au compte courant. Le fichier est créé dans le cache privé du téléphone, puis confié au sélecteur de partage natif.
- **Suppression** : Profil > Confidentialité et données > Supprimer mon compte. Une confirmation explicite `DELETE` déclenche la fonction serveur ; aucun appel ou e-mail au support n’est imposé.

## Suppression contrôlée

La fonction Edge `delete-account` effectue les opérations dans cet ordre :

1. valide le JWT auprès de Supabase Auth ;
2. exige la confirmation exacte `DELETE` ;
3. inventorie et supprime tous les objets appartenant à l’utilisateur dans `avatars` et `listing-images`, y compris les fichiers orphelins présents sous son dossier ;
4. exécute `prepare_account_deletion()` avec le rôle serveur ;
5. supprime définitivement l’utilisateur avec `auth.admin.deleteUser()` ;
6. enregistre uniquement la preuve pseudonymisée du résultat.

L’anonymisation serveur :

- efface profil, localisation, consentements, favoris, notifications, avis et métadonnées d’images ;
- archive et neutralise les annonces du vendeur ;
- remplace les messages texte de l’utilisateur par un libellé de suppression ;
- annule les remises en attente qui n’ont été confirmées par aucune partie ;
- conserve sous un identifiant détaché d’Auth les transactions nécessaires au dossier de l’autre partie ;
- retire les précisions libres des signalements liés au compte ;
- rend le profil invisible aux politiques publiques et authentifiées.

Le profil technique est volontairement détaché de `auth.users` et devient un tombstone sans identifiant direct. Cela évite de détruire le dossier transactionnel d’un autre membre lors de la suppression d’un compte.

## Protection contre les anciens jetons

Un JWT déjà émis peut rester cryptographiquement valide jusqu’à son expiration. Les politiques RLS restrictives appellent `is_active_account()` sur toutes les tables contenant des données utilisateur. Dès que le profil passe à `deleted`, un ancien JWT ne peut plus lire ni modifier ces tables.

Un trigger de mutation applique la même vérification aux écritures effectuées par les fonctions SQL `security definer`. Le rôle serveur reste le seul rôle autorisé à exécuter la préparation de suppression.

## Conservation

La table `data_retention_policies` expose la politique machine-readable incluse dans chaque export.

| Classe | Action | Durée maximale |
|---|---|---:|
| Identité Auth | suppression | immédiate |
| Profil, préférences et médias | suppression | immédiate |
| Annonces/messages transactionnels | anonymisation | immédiate |
| Intégrité des transactions | données anonymisées | sans identité directe |
| Preuves de modération | conservation minimale | 730 jours |
| Audit des demandes de confidentialité | conservation pseudonymisée | 730 jours |

`purge_expired_privacy_records()` supprime les événements d’audit arrivés à échéance ainsi que les signalements âgés de plus de 730 jours. En production, planifier quotidiennement cet appel avec un job Supabase Cron ou une tâche serveur utilisant le rôle `service_role`.

## Déploiement

Depuis la racine, après avoir relié le projet Supabase :

```bash
npx supabase db push --dry-run
npx supabase db push
npx supabase functions deploy delete-account --no-verify-jwt
```

`verify_jwt = false` dans `config.toml` désactive uniquement la vérification JWT historique de la passerelle. La fonction exige toujours un bearer token et le valide explicitement avec `auth.getUser()` avant toute opération privilégiée. La clé `SUPABASE_SERVICE_ROLE_KEY` est injectée automatiquement dans une fonction Supabase hébergée et ne doit jamais être copiée dans l’application mobile.

Après le déploiement :

1. créer un compte de test avec une photo, une annonce et une conversation ;
2. accepter les deux documents et vérifier les deux lignes de `user_consents` ;
3. exporter les données et ouvrir le JSON partagé ;
4. supprimer le compte depuis l’application ;
5. vérifier l’absence de l’utilisateur dans Auth et des objets dans Storage ;
6. vérifier que le profil est `deleted`, non visible, et que l’autre participant conserve une transaction anonymisée ;
7. rejouer une requête avec l’ancien JWT et confirmer une réponse vide/refusée.

## Tests

```bash
npm --prefix apps/mobile run check
npx supabase db reset
npx supabase test db
```

`supabase/tests/account_lifecycle_rls.test.sql` couvre l’isolation des consentements et de l’audit, l’interdiction de modifier un autre profil et le refus d’un JWT restant après suppression.

## Exigences stores

Le parcours intégré satisfait l’exigence de lancement de suppression dans l’app imposée aux applications créant des comptes. Google Play exige aussi une ressource web externe où l’utilisateur peut demander la suppression ; cette URL publique, ainsi que les pages publiques de confidentialité et de conditions, fait partie de la phase 9 et doit reprendre exactement les versions actives de `legal_document_versions`.
