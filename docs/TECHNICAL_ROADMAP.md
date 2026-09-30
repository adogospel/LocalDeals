# Feuille de route technique LocalDeals

Cette feuille de route part du MVP actuel sous Expo SDK 57 et l'amène jusqu'à une version exploitable en production. Une phase est terminée uniquement lorsque son code, ses migrations, ses tests, sa documentation et ses critères d'acceptation sont validés.

## Phase 1 — Configuration et garde-fous de production (terminée)

Objectif : empêcher qu'une fonctionnalité de développement ou qu'un fournisseur d'authentification incomplet arrive par erreur dans une build distribuée.

- environnements stricts `development`, `preview` et `production` ;
- valeur d'environnement inconnue traitée comme production afin de bloquer l'accès développeur ;
- validation de l'URL et de la clé publique Supabase ;
- drapeaux indépendants pour Google OAuth et l'OTP téléphonique ;
- fournisseurs désactivés masqués dans l'interface, routes protégées et appels réseau bloqués dans le service ;
- accès de démonstration limité au profil EAS `development` ;
- profils EAS associés explicitement à leurs environnements ;
- matrice de configuration et procédure de contrôle documentées ;
- tests unitaires des cas sûrs et des mauvaises configurations.

Critères validés : aucun accès développeur en preview/production, aucun appel Google/SMS lorsque le fournisseur est désactivé, et aucune valeur sensible attendue dans une variable `EXPO_PUBLIC_*`.

## Phase 2 — Authentification prête pour la production

- configurer un domaine et un SMTP transactionnel ;
- finaliser les modèles de confirmation, récupération et changement d'adresse ;
- configurer Google OAuth sur Android et iOS ;
- ajouter Sign in with Apple si Google est proposé sur iOS ;
- choisir explicitement entre suppression de l'OTP SMS pour le MVP ou activation d'un fournisseur SMS budgété ;
- tester création de compte, reconnexion, renouvellement de session, deep links et récupération sur appareils réels.

## Phase 3 — Cycle de vie du compte et protection des données

- suppression du compte depuis l'application ;
- anonymisation ou suppression contrôlée des annonces, messages et médias ;
- export des données personnelles ;
- politique de rétention, consentements versionnés et journal d'audit ;
- tests RLS empêchant toute lecture ou modification entre comptes.

## Phase 4 — Confiance, sécurité et modération

- blocage utilisateur, masquage des contenus bloqués et prévention des nouveaux contacts ;
- file de traitement des signalements et rôles de modération ;
- règles anti-spam, limites de débit et détection des annonces à risque ;
- workflow suspendre/restaurer un compte ou une annonce avec traçabilité ;
- protection anti-abus de l'inscription et des actions sensibles.

## Phase 5 — Notifications mobiles fiables

- permissions et jetons Expo Push ;
- stockage sécurisé et révocation des jetons par appareil ;
- envoi serveur pour messages, offres et transactions ;
- deep links vers la bonne conversation ou transaction ;
- préférences utilisateur, anti-doublons et reprise après échec.

## Phase 6 — Backend Supabase industrialisé

- migrations reproductibles sur développement, staging et production ;
- tests automatisés des policies RLS, fonctions SQL et contraintes métier ;
- index et requêtes contrôlés avec des volumes réalistes ;
- sauvegarde PostgreSQL et Storage avec exercice de restauration ;
- Security Advisor, restrictions réseau et séparation des rôles d'administration.

## Phase 7 — Observabilité et support

- suivi des crashs natifs avec symboles et source maps ;
- journalisation structurée sans données personnelles ;
- métriques de disponibilité, latence et erreurs Supabase ;
- analytics produit soumis au consentement ;
- canal de support et procédure d'incident.

## Phase 8 — Qualité mobile de bout en bout

- tests E2E des parcours inscription, publication, offre, chat et transaction ;
- matrice iPhone/Android, petits écrans et connexions lentes ;
- audit accessibilité, clavier, lecteurs d'écran et tailles de police ;
- budgets de démarrage, mémoire, images et listes longues ;
- tests de régression sur builds preview réelles.

## Phase 9 — Distribution et conformité des stores

- identifiants Apple Developer et Google Play Console ;
- icônes, splash screen, captures, textes et classification d'âge ;
- politique de confidentialité, conditions d'utilisation et page de suppression de compte publiques ;
- fiches App Store/Play Store, questionnaires de confidentialité et comptes de revue ;
- signature, soumission interne puis bêta TestFlight/Play testing.

## Phase 10 — Lancement et exploitation

- checklist de sortie et validation go/no-go ;
- déploiement progressif avec possibilité de retour arrière ;
- alertes, procédures opérationnelles et gestion d'incident ;
- suivi des indicateurs marketplace ;
- cycle mensuel de mises à jour Expo, React Native, Supabase et dépendances.

## Ordre recommandé

Les phases 2 à 4 bloquent une bêta publique sûre. Les phases 5 à 8 rendent l'expérience fiable et mesurable. Les phases 9 et 10 transforment la build validée en produit publiable et maintenable.
