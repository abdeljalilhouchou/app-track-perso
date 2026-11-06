# Lot A — Audit et optimisation des performances

Date : 6 novembre 2026. Périmètre : Lot A uniquement ; les lots B à I attendent la validation demandée dans la mission.

## Dépôt et versions vérifiés

- État initial : branche `main`, arbre propre, commit `742b0f6` (`feat : model runing`).
- `main` et `track-perso-v3-running` pointaient sur ce même commit, sans différence entre ces deux branches locales.
- `track-perso-v2` (`2bb2616`) est un ancêtre de HEAD. Depuis cette branche : le merge `a100b83`, puis le commit Running ; 17 fichiers différents, 1 241 ajouts et 13 suppressions.
- Musculation, Sport Hub, Calisthenics et Running sont réellement présents dans les sources.
- Après autorisation explicite de l’utilisateur : création et ouverture de `track-perso-sport-premium-lot-a`. La référence `main` reste sur `742b0f6`. Aucun commit, push ou déploiement.
- État Git observé localement ; aucun fetch distant réalisé, donc aucune affirmation sur un éventuel état distant plus récent.

Versions installées : Next.js **16.3.5**, React/React DOM **19.2.8**, TypeScript **5.9.3** en mode strict, Tailwind **4.3.3**, Framer Motion **13.3.0**, Recharts **3.10.1**, Supabase SSR **0.12.7**, Supabase JS **2.116.0**, Node **22.23.4**. Aucune dépendance ajoutée ni mise à jour du lockfile. `npm ls` indique aussi quelques dépendances extraneous préexistantes, laissées en place.

Les guides de cette installation Next dans `node_modules/next/dist/docs/` ont été consultés : navigation, fetching/streaming, lazy loading, authentification/cache de requête, instrumentation client et Web Vitals. Les consignes Sites ont été utilisées pour le travail local uniquement ; aucune inscription ou publication Sites.

## Audit et corrections

| Observation dans les sources | Conséquence | Correction du Lot A |
| --- | --- | --- |
| Layout, page et résolution de langue relisaient l’utilisateur et les préférences. | Appels logiques redondants ; des lectures indépendantes attendaient la langue. | `getCurrentUser` et `getProfilePreferences` dédupliqués par `React.cache` dans la requête Server Components ; langue dédupliquée aussi. |
| Dashboard, Habits, Nutrition, Humeur, Profil et Musculation attendaient les traductions avant leurs données métier. | Une lecture de préférences pouvait retarder le lancement des autres lectures. | Traductions et données lancées dans le même `Promise.all` après authentification. |
| Le Profil attendait ses métadonnées avant ses statistiques indépendantes. | Étape séquentielle supplémentaire. | Lectures parallèles. |
| Le calendrier chargeait toutes les séances et calculait toutes les statistiques du Sport Hub. | Coût croissant avec l’historique, malgré une seule vue mensuelle. | Chargement paginé limité au mois sélectionné, arrêté à aujourd’hui ; pas de calcul global. Les mois anciens restent accessibles. |
| Aucun `loading.tsx` sous l’espace authentifié ou Sport. | Routes dynamiques sans frontière de chargement locale ; préchargement automatique limité. | Deux frontières de streaming et un squelette traduit réutilisable. |
| Les graphiques importaient Recharts directement. | Coût de la bibliothèque inclus dans le JS initial de nombreuses pages. | Imports dynamiques depuis de petites frontières clientes. Graphiques génériques montés à proximité de la zone visible ; graphiques Running à l’ouverture de la progression. |
| Tous les onglets Musculation montaient immédiatement leurs panneaux cachés. | Effets, hydratation et graphiques exécutés avant consultation. | Montage à la première ouverture, puis conservation des panneaux visités et de leur état. |
| `PageTransition` émettait une surface globale avec `opacity: 0` avant hydratation. | Le contenu serveur pouvait rester masqué en attendant son JavaScript. | Surface principale visible sans animation JavaScript bloquante ; frontière d’état par chemin conservée. |
| Pas de diagnostic local reproductible. | Pas de base fiable pour comparer les optimisations. | Script de tailles de build, snapshots avant/après, instrumentation optionnelle, tests unitaires et scénario Edge avec données fictives. |

Le calendrier conserve `select("*")` sur **le mois seulement**. Énumérer explicitement `discipline` imposerait la colonne de 0019 alors que son déploiement n’est pas confirmé. Cette compatibilité prime sur le gain marginal de quelques colonnes. Les valeurs de mois invalides, futures ou correspondant à l’année zéro reviennent au mois courant.

Les `next/link` existants sont conservés. Les nouvelles frontières permettent leur préchargement automatique partiel ; aucun préchargement intégral forcé des historiques privés. Les layouts et URL restent inchangés, y compris la redirection `/sport?date=…`.

## Données privées et non-régression

Le cache ajouté est celui de **la requête React serveur**, sans cache persistant, cache public, singleton de profil ou `use cache`. Le proxy continue sa vérification Supabase. Les Server Actions conservent leurs propres vérifications et revalidations. Le test de cache utilise le vrai `React.cache` installé et un adaptateur de contexte de requête en mémoire ; il ne remplace pas un test de sessions Supabase réelles.

Les calculs de volume, 1RM, records Running 5/10 km, statistiques Calisthenics et synchronisation des habitudes ne sont pas modifiés. Les actions d’enregistrement, exports, migrations et mécanismes de brouillons existants restent inchangés. Aucun historique n’est tronqué pour fabriquer une accélération ; la pagination complète reste utilisée pour les agrégats qui en dépendent.

Le Sport Hub et les statistiques globales chargent encore un historique complet. Musculation charge encore les séries nécessaires à ses records et détails ; Calisthenics charge ses programmes/skills/historiques si le gate est actif. Une pagination de ces espaces nécessite un découpage fonctionnel plus profond pour préserver les totaux et records : ce coût reste explicitement présent.

Le squelette ne supprime pas la latence des données. Le layout authentifié attend toujours une authentification valide et les préférences nécessaires. Aucune sécurité n’a été contournée pour produire une navigation instantanée.

## Mesures avant / après

Les snapshots `lot-a-before.json` et `lot-a-after.json` proviennent de builds de production locaux avec la configuration habituelle, diagnostics optionnels non activés par ce travail. Le premier correspond aux sources initiales de `742b0f6` ; le second à ce Lot A.

La mesure additionne les fichiers JS uniques de `entryJSFiles`, `rootMainFiles` et des polyfills de chaque route. Le gzip est calculé fichier par fichier, en Kio (1 024 octets). Ce n’est ni un relevé réseau sur téléphone ni le poids complet d’un écran après chargement des graphiques. Les chunks Recharts restent à télécharger lorsque les graphiques deviennent nécessaires. Les fichiers partagés déjà en cache ne sont pas comptés comme un transfert effectif à chaque navigation. Les manifestes incluent aussi des références clientes conditionnelles : les valeurs Calisthenics/Running ne signifient pas que tout ce JS est téléchargé quand leurs gates sont désactivés.

| Route | JS brut avant -> après (Kio) | Gzip avant (Kio) | Gzip après (Kio) | Variation gzip |
| --- | ---: | ---: | ---: | ---: |
| /dashboard | 1315.3 -> 906.2 | 405.6 | 286.8 | -29.3 % |
| /habits | 954.5 -> 959.9 | 299.1 | 301.3 | +0.7 % |
| /nutrition | 1403.7 -> 997.7 | 426.3 | 308.5 | -27.6 % |
| /humeur | 1316.8 -> 932.0 | 405.9 | 295.2 | -27.3 % |
| /profil | 1158.9 -> 1164.3 | 352.8 | 354.9 | +0.6 % |
| /sport | 1274.4 -> 886.7 | 393.1 | 280.8 | -28.6 % |
| /sport/musculation | 1406.9 -> 1001.2 | 428.8 | 311.1 | -27.4 % |
| /sport/calendar | 876.5 -> 881.9 | 276.7 | 278.8 | +0.8 % |
| /sport/stats | 1308.9 -> 921.2 | 404.0 | 291.7 | -27.8 % |
| /sport/calisthenics | 1346.1 -> 958.4 | 410.4 | 298.3 | -27.3 % |
| /sport/running | 1321.8 -> 939.7 | 404.8 | 294.1 | -27.3 % |

Les légères variations des routes sans graphiques proviennent du découpage des chunks partagés et des nouvelles frontières clientes. Elles sont conservées dans le tableau pour rendre visibles les régressions de taille, même modestes.

| Mesure sur l’environnement cible | Avant | Après |
| --- | --- | --- |
| TTFB, LCP, INP, CLS en production/4G | Non mesurés | Instrumentation disponible, aucune comparaison réelle affirmée |
| Temps de transition des routes réelles | Non mesurés | Sonde optionnelle disponible ; les tests locaux utilisent une API fictive |
| Durée et nombre des appels Supabase réels | Non mesurés | Diagnostic HTTP serveur disponible, sans résultats de production |
| Temps SQL, index utilisés, RLS et latence interrégions | Non vérifiés | Nécessitent l’environnement cible et des plans de requêtes |
| Rendu React des graphiques | Non mesuré | Profiler optionnel en développement ; non garanti dans un build React de production ordinaire |

## Instrumentation optionnelle

Sans modifier de fichier de secrets, définir pour un lancement local :

```powershell
$env:PERFORMANCE_DEBUG = 'true'
$env:NEXT_PUBLIC_PERFORMANCE_DEBUG = 'true'
npm run dev
```

- Console serveur `[track-perso:supabase]` : ressource, méthode, statut et durée HTTP. Ne journalise ni corps, cookies, headers, clés ou paramètres d’URL. Ce n’est pas la durée SQL isolée et cela n’inclut pas le client distinct du proxy.
- Console navigateur `[track-perso:vitals]` : Web Vitals pris en charge par Next/le navigateur, sans envoi à un service tiers.
- `[track-perso:navigation]` et User Timing `track-perso:route-content:…` : début du routeur jusqu’à la disparition du squelette et deux frames. Les identifiants et paramètres d’URL sont exclus des libellés. Ce repère n’inclut pas nécessairement les graphiques différés ou des médias ultérieurs ; ce n’est pas un LCP.
- `[track-perso:chart]` : durées React lorsque le Profiler est disponible. Le reporter Web Vitals est lui-même chargé dynamiquement.

Retirer ensuite ces deux variables de la session PowerShell et refaire un build normal si nécessaire. Ne pas comparer un build avec diagnostics à un build sans diagnostics.

## Tests exécutés et limites

**Contrôles techniques finaux réussis :** `npx --no-install tsc --noEmit`, `npm run lint`, `npm run build`, `git diff --check`, ainsi que `node --test scripts/performance.test.mjs` (9 tests, 0 échec). Le build final utilise la configuration habituelle après les tests fictifs.

**Tests ciblés :** mois passés/bissextiles/invalides/futurs ; pagination de 2 507 lignes ; erreurs et limite de pagination explicites ; filtre propriétaire et plage mensuelle du calendrier ; absence de lecture du calendrier sans utilisateur ; cache de requête isolé entre deux utilisateurs concurrents simulés ; absence de requêtes Calisthenics si désactivé ; confidentialité du diagnostic HTTP ; instrumentation de navigation inactive quand désactivée.

**Navigateur :** Microsoft Edge headless, build de production local, serveur Auth/REST fictif local. Aucune connexion à Supabase ni écriture sur sa base pendant ce scénario. Résultats conservés dans `lot-a-browser.json` et capture `lot-a-sport-ar-system.png`.

- Sport Hub sans débordement horizontal à 320, 360, 375, 390, 430, 768 et 1 440 px.
- Navigation Hub → Musculation → Calendrier → Statistiques → Calisthenics désactivé → Running désactivé → Hub, à 390 px sans débordement.
- Brouillon `QA draft` saisi, persisté localement, même champ et même valeur conservés après passages par Programmes et Progression.
- Graphique de statistiques différé effectivement rendu à partir des séances fictives.
- Combinaisons testées : français/clair, anglais/sombre, arabe/système ; langue, direction et attribut de thème contrôlés. Ce n’est pas la matrice complète de toutes les combinaisons.
- Aucune exception ni erreur console détectée dans le scénario final. Aucune écriture HTTP et aucune interrogation des tables Calisthenics/Running désactivées.

Une première tentative avec `next dev` a rencontré une réponse 404 sur Stats et deux fichiers de types générés invalides dans `.next/dev`. Le scénario a été repris sur `next start` avec des builds propres, où les six routes passent. Un autre échec du pilote venait de la sélection d’un onglet d’extension Edge ; le pilote sélectionne désormais une cible `page`. Ces tentatives ne sont pas présentées comme des tests réussis. Le mode développement complet n’a pas été revalidé au même niveau que le build de production.

**Restent non vérifiés :** iPhone/Android physiques, connexion 4G réelle, permissions/vibration/audio en arrière-plan, sauvegarde sur Supabase, sessions de deux comptes réels, RLS/RPC/contraintes de production, gros historiques réels, tous les graphiques et l’ensemble des parcours des modules hors Sport. Le Lot A ne constitue pas la validation complète du Lot I.

## Migrations, infrastructure et médias

- `0019_calisthenics.sql` : présent ; le handoff précédent le décrit comme appliqué manuellement selon un contexte antérieur, sans vérification de Supabase. Son exécution effective n’est pas confirmée ici.
- `0020_running.sql` : présent ; le handoff le décrit comme en attente, non exécuté ni validé sur PostgreSQL. Dépend de 0019.
- Ni migration exécutée ni nouveau SQL préparé. Aucun changement de `CALISTHENICS_SCHEMA_READY` ou `RUNNING_SCHEMA_READY` dans le projet ou les services. Les gates ont seulement été forcés à `false` dans les processus de test fictifs.
- Les index et politiques RLS versionnés ont été examinés dans le SQL, sans affirmation sur leur présence ni leur efficacité en production. Pas de nouvel index sans plan de requête ni mesure.
- `vercel.json` décrit un cron, pas de région. Région effective Vercel, région Supabase, configuration Preview/Production et latence interservices non accessibles dans cette validation locale. Aucune configuration distante consultée ou changée, aucun secret ouvert.
- Aucun média sportif ajouté et aucune image externe réutilisée. Les maquettes restent des références pour les lots suivants. Les cinq SVG de démarrage et les polices existantes sont inventoriés avec leurs poids dans les snapshots. La capture de QA est une sortie du test, pas un asset de l’application. Aucun nouveau registre de licences nécessaire pour le Lot A.
- Les animations sportives premium, photos, fiches techniques et chronomètres restent aux lots suivants. L’ajout visuel du Lot A se limite au squelette respectant thème, langue, RTL et réduction des mouvements.

## Fichiers et composants

Modifiés (22) :

- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/habits/[id]/page.tsx`
- `src/app/(app)/habits/page.tsx`
- `src/app/(app)/humeur/page.tsx`
- `src/app/(app)/layout.tsx`
- `src/app/(app)/nutrition/page.tsx`
- `src/app/(app)/profil/page.tsx`
- `src/app/(app)/sport/calendar/page.tsx`
- `src/app/(app)/sport/calisthenics/page.tsx`
- `src/app/(app)/sport/musculation/page.tsx`
- `src/app/(app)/sport/running/page.tsx`
- `src/components/charts/mood-line-chart.tsx`
- `src/components/charts/weekly-bar-chart.tsx`
- `src/components/charts/weekly-line-chart.tsx`
- `src/components/page-transition.tsx`
- `src/components/sport/running-workspace.tsx`
- `src/components/sport/sport-tabs.tsx`
- `src/lib/calisthenics/data.ts`
- `src/lib/i18n/get-dictionary.ts`
- `src/lib/running/data.ts`
- `src/lib/sport-hub-data.ts`
- `src/lib/supabase/server.ts`

Créés (25, sources, scripts et preuves de validation compris) :

- `docs/performance/LOT_A.md`
- `docs/performance/lot-a-after.json`
- `docs/performance/lot-a-before.json`
- `docs/performance/lot-a-browser.json`
- `docs/performance/lot-a-sport-ar-system.png`
- `scripts/measure-build.mjs`
- `scripts/performance-browser.mjs`
- `scripts/performance.test.mjs`
- `scripts/test-source-loader.mjs`
- `src/app/(app)/loading.tsx`
- `src/app/(app)/sport/loading.tsx`
- `src/components/charts/deferred-chart.tsx`
- `src/components/charts/mood-line-chart-plot.tsx`
- `src/components/charts/running-plots.tsx`
- `src/components/charts/weekly-bar-chart-plot.tsx`
- `src/components/charts/weekly-line-chart-plot.tsx`
- `src/components/performance-metrics.tsx`
- `src/components/performance-reporter.tsx`
- `src/components/ui/page-loading-skeleton.tsx`
- `src/instrumentation-client.ts`
- `src/lib/performance/navigation.ts`
- `src/lib/performance/supabase-fetch.ts`
- `src/lib/sport-calendar-data.ts`
- `src/lib/sport-calendar.ts`
- `src/lib/supabase/read-context.ts`

Composants et fonctions réutilisés : `LanguageProvider/useT`, `ThemeProvider`, `SportTabs`, les trois graphiques génériques, les graphiques Running existants extraits sans changement de leurs données, `fetchAllRows`, les calculs sportifs existants et les liens/layouts actuels. Aucun second provider de thème ou de langue.

## Reproduire et valider

```powershell
node --test scripts/performance.test.mjs
npx --no-install tsc --noEmit
npm run lint
npm run build
node scripts/measure-build.mjs
git diff --check
```

Le build a besoin de télécharger Geist/Geist Mono via Google Fonts si les ressources ne sont pas disponibles. La première tentative sans accès réseau a échoué pour cette raison ; les builds avec accès réseau ont réussi, sans changement de polices ni téléchargement d’autres dépendances.

Pour le test Edge optionnel : fermer son éventuel serveur Next de développement, puis lancer `node scripts/performance-browser.mjs --production`. Le script utilise des identifiants fictifs et bloque les requêtes HTTPS du navigateur. **Son build est configuré pour l’API fictive locale : refaire impérativement `npm run build` après le test avant d’utiliser `npm start` normalement.** Copier les résultats depuis `.next/qa` avant ce rebuild si l’on veut les conserver. La configuration habituelle a été restaurée par un build normal après nos tests.

Pour une mesure représentative ultérieure : utiliser un environnement de développement distinct avec données autorisées, build de production, même appareil et mêmes conditions réseau avant/après ; mesurer séparément cache froid et chaud sur Dashboard → Sport → chaque discipline, puis Historique/Statistiques et les quatre autres accès principaux. Comparer plusieurs passages, pas un temps isolé. Garder les vérifications de sauvegarde/RLS sur une base distincte de la production.

Le Lot A est livré pour revue. La refonte visuelle complète n’est pas déclarée terminée ; aucun travail du Lot B ne sera commencé avant la validation demandée par l’utilisateur.
