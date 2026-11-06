# Bibliothèque d’exercices — intégration

## Données et identité

`src/lib/exercises/catalog.ts` fournit la présentation localisée des 69 exercices déjà définis par `DEFAULT_EXERCISES`. `guides.ts`, exclusivement serveur, ajoute huit fiches éditoriales FR/EN/AR pour des variantes précises. Le squat au poids du corps constitue une entrée documentaire supplémentaire : il n’est pas assimilé au nom ambigu « Squat ». Rien n’est inséré en base lors de la consultation.

`loadExerciseCatalog()` charge uniquement les exercices personnels du propriétaire connecté et, lorsque la gate existante l’autorise, les exercices Calisthenics globaux ou appartenant à cet utilisateur. Les identifiants Supabase restent inchangés. Les clés de route de présentation sont séparées des UUID, des noms canoniques et des relations en base.

Une correspondance documentaire utilise des alias explicites de variante, sans recherche approximative. Pour Calisthenics, seules les entrées globales reconnues par `exercise_key` reçoivent une fiche de référence ; les exercices personnels conservent leurs descriptions/consignes enregistrées. Le catalogue Running n’existe pas dans le modèle actuel : le filtre présente un état vide et un accès au module existant, sans interroger ses tables.

## Performances

Les séries et séances sont lues uniquement à l’ouverture d’une fiche. Musculation conserve l’identité existante `exerciseKey` (casse/espaces) et utilise `computeStrengthData` sans le modifier. La requête ILIKE réduit les candidats ; un filtrage exact avec `exerciseKey` retire ensuite les variantes supplémentaires. Les noms traduits et alias documentaires ne fusionnent pas les performances.

Les lectures sont paginées et limitées au propriétaire. Les séances associées sont chargées par lots de 100 identifiants, jusqu’à aujourd’hui ; Calisthenics/Running sont exclus des records Musculation. Affichage : dernière séance, séries, meilleure charge et meilleur volume lorsqu’ils sont calculables. Aucun badge de « nouveau PR » n’est déduit de la seule consultation. Les données absentes restent un état vide.

Calisthenics conserve les séries réelles, répétitions, maintien, variante, assistance et lest. Cette version n’affiche pas de record global mélangeant des conditions différentes. Aucune écriture, mutation de série ou recalcul persistant.

## Navigation et dialogues

- `/sport/exercises` : bibliothèque unifiée et filtrée côté client, tri via `localeCompare`, 24 cartes initiales puis affichage progressif.
- `/sport/exercises/[key]` : fiche dédiée partageable dans l’espace authentifié.
- `/sport/exercises/lookup?name=…&discipline=…` : résolution d’un nom existant ou d’un brouillon non enregistré. Une variante inconnue ne reçoit aucune technique fictive.
- `/api/sport/exercise-guide` : lecture GET authentifiée, paramètres bornés, réponse privée `no-store`, aucune erreur SQL exposée.

`ExerciseGuideButton` charge son dialogue avec `next/dynamic` seulement à l’ouverture. Le GET commence à ce moment. Le dialogue natif rend le reste de la page inerte, conserve les formulaires montés, se ferme par Échap, restitue le focus et annule une requête en cours à sa fermeture. Les fiches utilisent des sections et des ancres accessibles, sans nouvelle logique de Workout Mode.

Les accès ajoutés au sélecteur, aux séries de la séance, aux exercices de programme, à l’historique et à la progression n’appellent aucune action d’entraînement. L’accès Calisthenics reste derrière son chargement déjà protégé. La navigation principale mobile et la sidebar ne changent pas.

## Frontières de chargement

Les textes documentaires restent dans un module serveur et seule la langue active est transmise à la fiche. La recherche reçoit les métadonnées et noms de recherche nécessaires, sans les techniques des huit fiches. Le dialogue et son lecteur sont dans un chunk différé ; la bibliothèque ne charge pas de vidéo.

Les composants du Lot B sont réutilisés : `ExerciseCard`, `SportMedia`, `SportPageHeader`, `SportCard`, `SportSectionHeading`, `SportBadge`, `SportStatCard`, `SportButton`, `SportLink`, états vides/erreur. Les deux premiers acceptent un remplacement de média facultatif ; leur comportement par défaut reste compatible avec les usages précédents.

Les styles sont limités à Sport et utilisent ses variables existantes, propriétés logiques et `bdi`. Les contrôles sont d’au moins 44 px ; les interactions ajoutées respectent `prefers-reduced-motion`. Les traitements de brouillons, gates, actions, cache par requête, charts différés et panneaux conservés du Lot A sont inchangés.
