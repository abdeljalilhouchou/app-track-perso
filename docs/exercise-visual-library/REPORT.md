# Exercise Visual Library Premium — cinq pilotes

Travail local sur `exercise-visual-library-premium`, créée depuis `3d9f1df` (`anatomy-3d-premium-v3` propre et poussée). Aucun commit, push ou déploiement pour cette mission. Aucune migration, écriture Supabase, modification d’authentification ou modification des mappings/composants du visualiseur 3D.

## Catalogue : pourquoi 70 et 80 peuvent coexister

Le catalogue versionné contient **69 exercices prédéfinis**, plus le **squat au poids du corps éditorial déjà présent**, soit **70 références Musculation**. Ce périmètre est celui du rapport Anatomy V3.

`loadExerciseCatalog` enrichit ces références avec les exercices personnels non rapprochés par le couple nom canonique/catégorie, puis avec les exercices Calisthenics lorsque le module est activé. Les filtres appliqués par l’interface réduisent ensuite la liste. Le total affiché n’est donc pas une constante égale à 70.

Les 80 exercices ont été signalés par l’utilisateur, qui ne connaît pas le filtre actif. Aucun compte réel ni table de Production n’a été consulté pour déterminer la composition exacte de ces 80 lignes. Affirmer « ce sont nécessairement dix exercices personnels » serait une supposition. Le code permet aussi, par exemple, 70 références + 10 Calisthenics, ou une combinaison d’origines.

La bibliothèque propose maintenant **« Comprendre le total du catalogue »**, calculé sur les lignes réellement chargées pour le compte : total, références Musculation, exercices personnels et Calisthenics. Aucun appel Supabase supplémentaire. Une fixture locale de **80 = 70 + 10 personnels** vérifie le vrai chargeur ; un test couvre aussi **80 = 70 + 10 Calisthenics**. Ces jeux de test ne sont pas présentés comme les données du compte réel.

## Couverture calculée

| Mesure | Nombre |
| --- | ---: |
| Références Musculation versionnées | 70 |
| Photographies antérieures conservées | 3 |
| Nouvelles photographies générées | 9 |
| Photographies inspectées visuellement, anciennes et nouvelles | 12 |
| Miniatures dérivées optimisées | 7 |
| Exercices avec photographie principale | 7 |
| Dont pilotes avec deux positions distinctes | 5 |
| Références sans photographie | 63 |
| Références sans paire de positions | 65 |
| Pilotes approuvés par l’utilisateur à ce stade | 0 |

Calculs : `node scripts/exercise-media-audit.mjs`. [Inventaire des 70 références](./INVENTORY.md), [registre calculé et détails](./catalog-inventory.json), [dimensions, poids, sources et empreintes des nouveaux fichiers](./asset-files.json).

Les sept exercices photographiés sont les cinq pilotes demandés, plus les deux exercices qui possédaient déjà leur photographie : pompes et curl haltères debout. Le rowing pilote possédait déjà sa position haute ; elle est réutilisée sans remplacement. Ainsi, cinq paires demandent **neuf nouvelles prises de vue générées**, et non dix.

## Correspondance des cinq pilotes

Chemins ci-dessous relatifs à `public/images/exercises/` ; miniature : `thumbnails/<exerciseId>.webp`.

| Identifiant stable | Variante montrée | Photo principale | Départ | Seconde position |
| --- | --- | --- | --- | --- |
| `strength-developpe-incline-halteres` | Deux haltères, banc modérément incliné | `pilot/incline-dumbbell-press-end.webp` | `pilot/incline-dumbbell-press-start.webp` | Bras presque tendus au-dessus du thorax |
| `strength-rowing-haltere-unilateral` | Main et genou du même côté sur banc | `one-arm-dumbbell-row.webp`, conservée | `pilot/one-arm-dumbbell-row-start.webp` | Position haute existante, coude près du buste |
| `strength-squat` | **Exemple explicitement indiqué : squat barre haute sur le dos** | `pilot/barbell-back-squat-bottom.webp` | `pilot/barbell-back-squat-start.webp` | Point bas de la descente, clairement nommé comme tel |
| `strength-curl-incline` | Assis sur banc incliné, deux haltères et supination | `pilot/incline-dumbbell-curl-end.webp` | `pilot/incline-dumbbell-curl-start.webp` | Coudes fléchis, haltères près des épaules |
| `strength-tirage-horizontal-poulie` | Poulie basse, poignée rapprochée en prise neutre | `pilot/seated-cable-row-end.webp` | `pilot/seated-cable-row-start.webp` | Poignée près du haut de l’abdomen, coudes en arrière |

Le catalogue ne précise pas le matériel de chaque variante générique. La fiche indique séparément le **matériel de la variante illustrée**, sans modifier les identités de catalogue ni les configurations 3D. Le squat au poids du corps conserve son identité et son schéma ; il ne reçoit pas la photo du squat barre.

## Génération, inspection et droits

Outil utilisé : **`image_gen` intégré**, réellement disponible et exécuté. Pas de CLI et pas de clé API du projet. Les positions d’arrivée sont des éditions de leur position de départ, à l’exception du rowing dont la photo haute existante a servi de référence pour créer la position basse.

Chaque sortie a été examinée avant intégration : homme adulte, mouvement/variante, matériel, appuis, orientation du corps, prise, articulations visibles, trajectoire plausible entre les images, absence d’anomalie majeure apparente. Les paires montrent des angles de coudes ou de genoux/hanches distincts. Les empreintes différentes sont contrôlées automatiquement ; elles ne remplacent pas cette inspection visuelle. Aucune image n’a été acceptée uniquement pour son esthétique.

Points de contrôle : banc clairement incliné et deux haltères pour le développé ; appuis stables et absence de rotation apparente pour le rowing ; barre sur le haut du dos, pieds au sol et genoux suivant les pieds pour le squat ; bras près du buste et banc incliné pour le curl ; câble relié au centre de la poignée, pieds calés et buste stable pour le tirage. Les angles sont approximatifs et appréciés visuellement. Aucun mouvement n’est certifié par un professionnel ou validé sur appareil physique dans cette mission.

Sources techniques primaires consultées : [ACE, développé incliné](https://www.acefitness.org/resources/everyone/exercise-library/25/incline-chest-press/), [ACE, rowing avec appui](https://www.acefitness.org/resources/everyone/exercise-library/126/single-arm-row/), [ACE, back squat](https://www.acefitness.org/resources/everyone/exercise-library/11/back-squat/), [Catalyst Athletics, curl incliné](https://www.catalystathletics.com/exercise/850/Incline-Dumbbell-Curl/), [PureGym, tirage horizontal](https://www.puregym.com/exercises/back/rows/seated-cable-row/). Les consignes et traductions sont rédigées pour le projet. Les sources étayent le mouvement et les appuis, pas la conformité de chaque pixel d’une image IA ni un angle unique imposé.

Aucune photographie tierce n’a été téléchargée. Source des pixels : sorties IA créées pour ce projet ; aucune licence Creative Commons, licence de banque d’images, exclusivité ou autorisation d’un photographe tiers n’est inventée. La provenance IA est affichée dans les fiches. Les droits/provenances antérieurs sont conservés dans `docs/exercise-library/` et les fichiers précédents gardent leurs empreintes originales.

Jeu de prompts final normalisé et identifiants de sortie : [GENERATION_PROMPTS.md](./GENERATION_PROMPTS.md). La procédure d’encodage est reproductible avec `node scripts/prepare-exercise-media.mjs --source-dir <répertoire-des-sorties>` ; elle ne génère pas d’images et n’écrit jamais dans Supabase.

## Architecture et intégration

- `media-registry.ts` : registre détaillé **côté serveur**, lié aux clés stables. Hero, miniature, positions, alts FR/EN/AR, variante, matériel montré, notes techniques, source, licence de provenance et statut de revue. Les pilotes restent `pending-pilot-validation` pour l’approbation utilisateur.
- `media-thumbnails.ts` : index léger des seules miniatures et de leurs alts. Les séances/programmes réutilisent la résolution stricte déjà existante, sans recherche floue ni nouvelle inférence sur un titre personnalisé.
- `visual-media-types.ts` : contrat partagé, importé comme type côté client.
- `data.ts` : enrichissement en lecture seule des références builtin reconnues. Le catalogue envoie les images/miniatures nécessaires ; les détails et positions sont réservés à la fiche demandée. Les guides techniques et calculs existants ne sont pas modifiés.
- `ExerciseThumbnail` : composant de présentation partagé pour programme et séance. Aucun changement de séries, de charges, de répétitions, de brouillon ou de minuteur.
- `ExerciseVisualSequence` : section native repliable. Les deux images sont montées seulement à l’ouverture, avec légendes et alts localisés ; deux colonnes sur desktop, une sur mobile.
- `ExerciseVisualTechnique` : repères de la variante montrée lorsque le guide classique complet n’existe pas encore. Les erreurs/conseils non documentés restent indiqués comme tels ; aucun guide complet fictif n’est fabriqué.
- `SportMedia`/`next/image` : réutilisés avec un mode `contain` pour préserver membres et matériel dans les cadres. Dimensions réservées et chargement `lazy` conservés.

Photos visibles dans la bibliothèque, les fiches complètes et dialogues, les programmes dépliés et les séances. Aucun composant distinct nommé Workout Mode n’a été identifié : l’interface active utilise `SessionLogger`, qui reçoit les miniatures. Aucun écran de workout fictif n’est créé. L’accès **Muscles ciblés** demeure à sa place ; moteur, GLB, atlas et mappings 3D sont inchangés.

## Vérifications

- TypeScript `npx --no-install tsc --noEmit`, ESLint `npm run lint`, build `npm run build` et `git diff --check` exécutés.
- **125 tests** : les 114 tests existants conservés et 11 tests ciblant les médias, variantes, dimensions/poids réels, traductions, photos antérieures inchangées, origine personnelle refusée et décompte 70/80.
- Edge : `node scripts/performance-browser.mjs --production --exercise-media`, avec Auth/REST fictifs locaux, sans base Supabase réelle. **60 combinaisons** : cinq exercices × FR/EN/AR × clair/sombre × 320/1440 px. [Résultats globaux](./browser-results.json), [résultats médias](./exercise-media-results.json).
- Les deux positions sont distinctes et décodées ; pas de débordement horizontal ; alts présents et chargement différé. Le catalogue ne demande que des miniatures et ne démarre pas le téléchargement du GLB.
- Fallback d’une photo bloquée avec espace conservé. Miniature de programme, miniature de séance, ouverture des positions depuis la séance, ouverture du vrai 3D depuis la fiche et conservation du dialogue sous-jacent.
- Brouillon et séries conservés à l’identique, minuteur continu et aucune écriture pendant le scénario. Les tables de disciplines désactivées ne sont pas lues.

Le premier scénario Edge cherchait une requête d’image avant d’avoir fait défiler la bibliothèque jusqu’aux miniatures : les premières cartes n’avaient pas de photo et le chargement différé fonctionnait. Le scénario a été corrigé pour rendre une miniature visible ; cette première tentative n’est pas comptée comme une campagne réussie. Les captures du programme sont prises après décodage et fin de son animation.

## Captures du rendu réel

| Pilote | Clair | Sombre |
| --- | --- | --- |
| Développé incliné | [Positions](./screenshots/strength-developpe-incline-halteres-light-positions.webp) | [Positions](./screenshots/strength-developpe-incline-halteres-dark-positions.webp) |
| Rowing unilatéral | [Positions](./screenshots/strength-rowing-haltere-unilateral-light-positions.webp) | [Positions](./screenshots/strength-rowing-haltere-unilateral-dark-positions.webp) |
| Squat barre haute | [Positions](./screenshots/strength-squat-light-positions.webp) | [Positions](./screenshots/strength-squat-dark-positions.webp) |
| Curl incliné | [Positions](./screenshots/strength-curl-incline-light-positions.webp) | [Positions](./screenshots/strength-curl-incline-dark-positions.webp) |
| Tirage poulie | [Positions](./screenshots/strength-tirage-horizontal-poulie-light-positions.webp) | [Positions](./screenshots/strength-tirage-horizontal-poulie-dark-positions.webp) |

Autres captures : [bibliothèque claire](./screenshots/visual-library-light.webp), [bibliothèque sombre](./screenshots/visual-library-dark.webp), [arabe RTL mobile sombre](./screenshots/incline-press-ar-dark-mobile.webp), [curl mobile clair](./screenshots/incline-curl-fr-light-mobile.webp), [programme](./screenshots/visual-program-light.webp), [photo indisponible](./screenshots/visual-photo-unavailable.webp).

Captures Edge de l’interface réelle, compressées en WebP. Les photos qu’elle affiche sont les sorties IA inspectées. Aucun iPhone, Android physique ou Safari/iOS n’a été utilisé.

## Performances et état du build livré

Le build normal final est réussi et restauré après les campagnes avec API fictive. TypeScript, ESLint et les 125 tests passent sur les sources finales ; `git diff --check` passe. Aucun paquet ni réglage d’environnement ajouté. [Préservation des sources/photographies protégées](./preservation.json).

Les neuf photographies sont encodées en **960 × 640 WebP**, de **38 258 à 65 608 octets** chacune. Les sept miniatures sont en **320 × 213 WebP**, de **4 576 à 7 912 octets** chacune. Total supplémentaire : **499 642 octets, soit 487,9 Kio**, dont 454 520 pour les photographies et 45 122 pour les miniatures. Les photos principales réutilisent une position adaptée ; aucun fichier hero identique n’est dupliqué.

Lors de la consultation du catalogue dans le scénario, seuls deux petits fichiers de miniatures visibles après défilement sont demandés. Les grandes photos et les positions ne sont pas téléchargées pour toutes les cartes. Une fiche charge sa propre photo ; la paire de positions n’est montée qu’après ouverture de sa section. Les images utilisent `next/image`, `sizes`, chargement lazy et dimensions de cadre réservées. Le rendu `contain` évite de couper les pieds, bras ou haltères dans les cadres carrés.

Mesure JS : builds normaux locaux, somme des gzip de chaque fichier initial référencé par les manifestes, pas un temps de chargement ni un transfert sur téléphone. [Avant](./before-build.json), [après](./after-build.json), [audit](./bundle-audit.json).

| Route | Avant, gzip octets | Après, gzip octets | Variation |
| --- | ---: | ---: | ---: |
| Dashboard | 300 504 | 301 212 | +708 |
| Sport Hub | 302 851 | 303 572 | +721 |
| Musculation | 330 207 | 337 664 | +7 457 |
| Bibliothèque | 308 409 | 309 281 | +872 |
| Fiche exercice | 311 003 | 311 609 | +606 |

Les nouveaux libellés partagés augmentent légèrement les autres routes. Musculation ajoute aussi l’index de miniatures et le composant d’images optimisées pour programmes/séances. Aucun nouveau moteur lourd n’est ajouté. **Three.js et les détails anatomiques restent hors du JS initial des 13 routes contrôlées** ; le moteur différé garde le même fichier, **654 903 octets bruts / 162 125 gzip**. Le GLB et les fichiers d’anatomie restent inchangés.

Le minuteur observé passe de **1:31 à 1:29 en 1,75 seconde**, sans pause ni réinitialisation pendant l’ouverture fiche/positions/3D. Aucun LCP/INP, débit 4G, comportement Safari/iOS ou score sur appareil physique n’est affirmé.

## Fichiers concernés

Médias : neuf fichiers dans `public/images/exercises/pilot/` et sept dans `public/images/exercises/thumbnails/`. Les trois fichiers photographiques à la racine du dossier restent inchangés.

Registre et données : `src/lib/exercises/media-registry.ts`, `media-thumbnails.ts`, `visual-media-types.ts`, `composition.ts`, enrichissement de `data.ts` et des types de fiche. Interface : `exercise-visual-sequence.tsx`, `exercise-thumbnail.tsx`, bibliothèque/détail/CSS, `SportMedia`, `program-manager.tsx`, présentation de `session-logger.tsx`, traductions `src/lib/i18n/modules/exercise-library.ts`.

Vérification : `prepare-exercise-media.mjs`, `exercise-media-audit.mjs`, `exercise-media.test.mjs`, `exercise-media-browser-checks.mjs`, option `--exercise-media` du pilote Edge existant ; inventaires, prompts, résultats, mesures et 16 captures dans ce dossier.

## Validation demandée et suite

Lancer `npm run dev`, ouvrir `/sport/exercises`, rechercher les cinq exercices et ouvrir **Voir les positions du mouvement**. Examiner les photos/prises/appuis et le choix du **squat barre haute** ; vérifier clair/sombre et les trois langues. Consulter une fiche depuis un programme et une séance sans quitter le contexte, puis ouvrir **Muscles ciblés**.

La génération des autres références reste arrêtée pour validation de ces cinq pilotes. [Procédure par lots préparée](./BATCH_WORKFLOW.md). Aucun commit, push ou déploiement ne sera fait sans nouvelle instruction explicite.
