# Track Perso 2.0 — handoff après Phase 5 Running

## Architecture sportive

Le Sport Hub conserve `public.workouts` comme registre commun des séances. Une course utilise une seule ligne `workouts` avec `discipline = 'running'`; ses mesures propres sont stockées dans `running_sessions` avec une référence composite au couple `(workout_id, user_id)`. Les objectifs facultatifs sont dans `running_goals`, une ligne par utilisateur. Les dates, durées, distances et métriques brutes restent la source des calculs.

Les pages globales, le calendrier, les statistiques communes et l’habitude Sport continuent de lire la séance `workouts` une seule fois. Les anciennes séances dont la discipline est `NULL` ne sont pas classifiées rétroactivement. La Musculation et Calisthenics gardent leurs tables et actions existantes.

## État des modules

- **Musculation :** fonctionnalités existantes préservées; aucune migration de force ni donnée modifiée.
- **Calisthenics :** fonctionnalités et schéma existants laissés en place. Le titre de page utilise maintenant le nom de la section active au lieu de toujours afficher « Vue d’ensemble ». La clé brute signalée `sport.calisthenics.ui.exercises` n’a pas été trouvée dans les composants.
- **Running :** interface avec vue d’ensemble, saisie/édition/suppression, chronomètre manuel, historique filtrable paginé, graphiques, records comparables et objectifs sauvegardés. Calculs d’allure/vitesse centralisés dans `src/lib/running/stats.ts`.

## Activation et migrations

- `0019_calisthenics.sql` est indiquée comme appliquée manuellement dans le cahier des charges fourni par l’utilisateur. Cet état n’a pas été vérifié sur Supabase.
- `supabase/migrations/0020_running.sql` est nouvelle et **en attente**. Elle n’a pas été exécutée ni testée sur PostgreSQL.
- La migration est additive, ne remplit aucune ancienne ligne et suppose la colonne `workouts.discipline`, la contrainte `workouts_discipline_check` et l’index unique `(id, user_id)` de 0019. Elle vérifie ces prérequis au début.
- `RUNNING_SCHEMA_READY` reste désactivée : absente de `.env.local`, de `.env.local.example` et de l’environnement du processus vérifiés durant ce travail. Le code n’active jamais cette variable.
- `CALISTHENICS_SCHEMA_READY` n’a pas été modifiée. Aucune configuration Vercel n’a été touchée.

## Sécurité de 0020

La migration crée des politiques RLS basées sur `auth.uid()` pour les deux nouvelles tables. `authenticated` peut lire/créer/modifier ses courses et gérer ses objectifs; la suppression directe des détails Running n’est pas accordée, elle passe par la suppression de la séance parente. Les rôles `PUBLIC`, `anon` et `service_role` sont révoqués des tables et fonctions ajoutées.

`save_running_session` et `delete_running_session` sont `SECURITY INVOKER`, ont un `search_path` fixé et ne sont exécutables que par `authenticated`. La création et l’édition lient les deux tables dans la même transaction; une contrainte différée exige les détails Running avant la fin de la transaction. Les triggers vérifient le propriétaire et la discipline, protègent le lien des détails et empêchent de reclasser une séance qui a des détails.

Les RPC s’appuient également sur les permissions et politiques RLS déjà présentes sur `workouts`. La migration n’accorde pas de nouveaux privilèges sur cette table et ne change pas sa RLS. Avant activation, vérifier sur l’environnement cible que le rôle `authenticated` a les privilèges nécessaires sur `workouts` et que ses politiques limitent chaque opération au propriétaire. Le SQL versionné du dépôt ne contient pas la création initiale de `workouts`; l’état réel n’a donc pas été affirmé ici.

## Export personnel

L’export JSON couvre désormais les tables personnelles Calisthenics. Les tables Running ne sont interrogées que si `RUNNING_SCHEMA_READY=true`; une fois le module activé, il inclut `running_sessions` et `running_goals`. Les exercices partagés du catalogue ne sont pas exportés comme données personnelles.

## Vérifications effectuées

- `npx --no-install tsc --noEmit` : réussi.
- `npm run lint` : réussi.
- `npm run build` : réussi avec Next.js 16.3.5; `/sport/running` est générée comme route dynamique.
- `git diff --check` : réussi.
- Vérifications ciblées locales des calculs et validations : 31 assertions passées, sans accès à une base.
- Aucun serveur PostgreSQL/`psql` n’est disponible dans l’environnement courant. Aucune migration, requête de test ni vérification réelle de RLS/RPC n’a été exécutée.
- Aucun déploiement, push, merge, commit ou accès en écriture à Supabase n’a été effectué.

## Protocole de validation manuelle — projet Supabase de développement distinct

N’exécuter ces étapes que sur un projet Supabase de développement qui ne partage pas sa base avec Preview ou Production. Garder `RUNNING_SCHEMA_READY` absent pendant toute la validation.

1. Vérifier que le schéma de développement correspond aux prérequis de 0019 et que les colonnes et privilèges existants de `workouts` sont compatibles. Le bloc de prérequis en tête de 0020 vérifie les colonnes utilisées, la contrainte de discipline et l’index composite.
2. Examiner `0020_running.sql`, puis l’exécuter manuellement dans l’éditeur SQL du projet de développement. Ne pas la lancer sur une base partagée avec Preview/Production.
3. Vérifier dans les catalogues PostgreSQL que `running_sessions` référence `(workout_id, user_id)` vers `workouts`, que les index sont présents, que RLS est activée et que les politiques indiquent `authenticated` avec `auth.uid() = user_id`.
4. Confirmer que `prosecdef = false` pour les deux RPC, que l’exécution est autorisée à `authenticated` et refusée à `anon`/`PUBLIC`, et que les privilèges `workouts` plus ses politiques permettent l’insertion, la modification et la suppression d’une séance possédée.
5. Avec deux comptes de test A et B, créer une course avec champs facultatifs vides. Vérifier exactement une ligne `workouts` de discipline `running` et une ligne `running_sessions` correspondante. Vérifier également la mise à jour d’une course existante, y compris date, distance, durée et notes, sans changer son identifiant.
6. Paginer et filtrer l’historique depuis l’interface, ouvrir une course depuis le calendrier, vérifier les statistiques communes et l’habitude Sport. Modifier la date puis confirmer que l’ancien jour et le nouveau restent cohérents.
7. Sauvegarder les objectifs hebdomadaires, mensuels, 5 km et 10 km; recharger la page; modifier les valeurs; vider tous les champs et confirmer la suppression des objectifs.
8. Vérifier les rejets de valeurs invalides : date future, type inconnu, distance/durée nulles ou hors limites, précision supérieure à trois décimales, intensité hors plage, métrique facultative hors plage, et mesures incompatibles.
9. Vérifier l’atomicité : noter les nombres de lignes `workouts`/`running_sessions`, appeler la RPC avec un payload invalide après authentification, constater l’erreur, puis comparer les nombres. Aucune demi-séance ne doit rester.
10. Tester l’isolation : B ne peut ni lire, ni modifier, ni supprimer les lignes de A; B ne peut pas associer ses détails à la séance de A; une requête non authentifiée et le rôle `anon` ne peuvent pas exécuter les RPC.
11. Supprimer une course de A et vérifier la cascade de ses détails. Vérifier qu’une séance Musculation antérieure, ses séries et les anciennes séances `discipline IS NULL` n’ont pas changé.
12. Tester le chronomètre en arrière-plan/verrouillage, pause/reprise/arrêt/réinitialisation et report de durée. Confirmer qu’aucune permission GPS n’est demandée.
13. Une fois ces contrôles manuels acceptés, planifier séparément l’application de 0020 sur la base effectivement utilisée par l’environnement cible. N’activer le gate que pour une base où la migration a été vérifiée.

Requêtes utiles dans l’éditeur SQL de développement (lecture seule) :

```sql
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('running_sessions', 'running_goals');

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('running_sessions', 'running_goals');

select p.proname, p.prosecdef, p.proconfig, p.proacl
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('save_running_session', 'delete_running_session');

select indexname, indexdef from pg_indexes
where schemaname = 'public' and tablename in ('running_sessions', 'running_goals');
```

## Git et prochaine étape

Branche de travail : `track-perso-v3-running`, créée depuis le `FETCH_HEAD` d’`origin/main`. `main` n’a pas été modifiée. Aucun commit n’a été créé. Après revue de ce diff, lancer les validations PostgreSQL sur un projet de développement distinct, puis décider manuellement de l’application 0020 et de l’activation du gate.
