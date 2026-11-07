# Anatomy 3D Premium V3 — généralisation Musculation

Implémentation locale sur `anatomy-3d-premium-v3`, issue de `5de25da9fdcdfd2090ec659df6a5e9f4a514d417`. Aucun commit, push, déploiement, changement d’authentification, migration ou écriture Supabase.

## État initial et Production

Le dépôt était propre sur `main`, qui contenait déjà le Sport Premium et le prototype Rowing V2. `git ls-remote origin refs/heads/main` a confirmé `5de25da9fdcdfd2090ec659df6a5e9f4a514d417`.

Vérification distante en lecture seule : [déploiement GitHub Production 7614797856](https://api.github.com/repos/abdeljalilhouchou/app-track-perso/deployments/7614797856/statuses), état `success`, SHA `5de25da9fdcdfd2090ec659df6a5e9f4a514d417`, le **7 novembre 2026 à 02:37:22, heure de Paris**. URL retournée : https://app-track-perso-lmzjc2qfk-abdeljalils-projects-52a427be.vercel.app. Ce sont les métadonnées du déploiement, pas une validation du comportement de l’application distante.

## Couverture calculée

| Mesure | Nombre |
| --- | ---: |
| Exercices prédéfinis `DEFAULT_EXERCISES` | 69 |
| Exercice éditorial déjà présent : squat au poids du corps | 1 |
| Total du catalogue Musculation versionné | 70 |
| Configurations contrôlées techniquement | 69 |
| Dont couvertes dans leur périmètre déclaré | 66 |
| Dont partielles | 3 |
| Non pris en charge | 1 |
| Validation anatomique professionnelle accomplie par cette mission | 0 |

Ces nombres viennent de `node scripts/anatomy-coverage.mjs`, pas de la liste indicative de la demande. [Inventaire des 70 références](./INVENTORY.md) ; [mapping détaillé, meshes, rôles, traductions, limites et programme prédéfini](./coverage.json).

Les 11 catégories réelles sont parcourues. Les 24 exercices du programme prédéfini ont tous un mapping. L’ensemble des configurations référence 122 identifiants de maillages distincts dans le fichier réel.

Partiels : **Rowing machine** (machine et trajectoire non précisées), **Arnold press** (rotation/participation de la coiffe décrites globalement), **Marche du fermier** (muscles intrinsèques de la main absents). Non pris en charge : **Pull-over haltère**, dont la variante et la répartition pectoral/dorsal doivent être précisées avant association.

Les exercices personnels, programmes modifiés et historiques réels dépendent du compte. Ils n’ont pas été lus en Production. Leur nombre ne peut donc pas être donné honnêtement ici. La bibliothèque calcule et affiche la couverture de ses lignes réellement chargées pour le compte, y compris les exercices personnels non pris en charge.

## Architecture et identification

Un seul moteur Three.js, un seul atlas masculin, un seul dialogue partagé. Aucun nouveau paquet, Canvas ou modèle par exercice.

- `identity.ts` : registre léger des identifiants et alias canoniques explicites. Bibliothèque/fiche : clé stable `strength-*` ou `bodyweight-squat`. Séances/programmes/historique : identité historique existante, nom canonique exact **et** catégorie musculaire stockée. Les collisions sont refusées ; aucune recherche floue.
- `types.ts` : contrat `ExerciseAnatomyConfig`, rôles, cadrage, confiance, limites, textes, sources et groupes.
- `atlas.ts` : groupes et valeurs `extras.key` réellement inspectées dans le GLB, noms/actions FR/EN/AR. Aucun nom de mesh inventé.
- `configs.ts` : une entrée indépendante par exercice existant. Des profils de mouvement communs évitent les duplications tout en gardant les variantes et leurs notes distinctes.
- `highlights.ts` : résolution par `key`, `side` **et** `muscleId` réel. Les structures inconnues restent neutres. Les rôles colorent les deux côtés, sauf le rowing unilatéral conservé avec moteurs du côté choisi et stabilisateurs bilatéraux.
- `guide-content.ts` : données éditoriales pures extraites sans modifier leur contenu. `guides.ts` conserve son entrée `server-only`. Les données éditoriales du visualiseur sont chargées dans le dialogue différé.

Les exercices personnels explicitement identifiés comme tels sont refusés même si leur titre correspond à une fiche éditoriale. Le contrat accepte un `validatedAnatomyId` pour une association explicitement validée ; aucune association ni nouvelle colonne n’est créée dans Supabase. Les anciennes lignes de séance n’ont pas d’identifiant de catalogue : un nom/catégorie exactement identiques à un mouvement canonique constituent leur identité existante. Un exercice réellement différent mais enregistré avec exactement le même couple reste indiscernable dans ce schéma ; aucune certitude supplémentaire n’est prétendue.

## Composants et accès

Réutilisés et généralisés : `ExerciseMuscleButton`, `ExerciseMuscleDialog`, `MuscleViewer3D`, `anatomy-engine`, `MuscleInformationPanel`, `MuscleList`, `MuscleLegend`, `AnatomyFallback`. Aucun second moteur.

Accès direct depuis les cartes de la bibliothèque, les fiches techniques, les cartes de séance, les exercices de programme et les exercices identifiables de l’historique. Le dialogue conserve la page sous-jacente. La consultation ne déclenche aucune mutation ou lecture Supabase supplémentaire. Les exercices sans mapping gardent leur fiche et affichent un état indisponible dans la fiche détaillée.

L’en-tête utilise le nom localisé, la catégorie traduite, l’équipement et le niveau réellement documentés. Les champs inconnus sont indiqués comme tels. Les onglets techniques existants sont conservés lorsqu’un vrai guide existe ; aucune fiche technique n’est fabriquée pour compléter les autres exercices.

Rotation/pincement, zoom par boutons, avant/arrière/corps entier/reset, agrandissement, modes Light/Dark/System et AR/RTL sont conservés. Le reset respecte la vue et le cadrage de l’exercice. Les jambes démarrent en corps entier. La sélection par liste donne les mêmes informations sans utiliser le Canvas. Dialogue HTML natif, Échap, restitution du focus, libellés ARIA, onglets clavier, focus visible et mouvement réduit restent en place.

## Anatomie, limites et sources

Rouge : principaux ; vert : secondaires ; orange : stabilisateurs ; gris : autres. Tous les matériaux, couleurs, émissions, opacités et états de transparence sont recalculés pour la configuration courante. Les muscles neutres sont contrôlés dans les diagnostics de rendu. Les groupes mixtes superficiels/profonds ne masquent pas automatiquement le reste du corps ; la commande d’atténuation reste disponible. Les groupes entièrement profonds peuvent être révélés à la sélection.

Les portions pectorales restent distinctes sans prétention d’isolation. Le curl marteau diffère du curl supiné ; les mollets assis mettent l’accent sur le soléaire ; les exercices de charnière excluent le chef court du biceps fémoral du groupe d’extension de hanche. Les relevés de jambes distinguent la flexion de hanche et le contrôle abdominal. Le grand dorsal possède une action propre au tirage vertical, différente du rowing.

Les rhomboïdes, l’ilio-psoas, le transverse, le soléaire et d’autres structures profondes **sont réellement présents** dans l’atlas ; ils ne sont pas remplacés par des régions voisines. Les muscles intrinsèques de la main, demandés pour la prise du fermier, n’ont aucun maillage : ils figurent dans la liste avec une note, sans coloration de substitution. Le fallback 2D reste un schéma limité aux repères représentables ; les groupes sans zone distincte sont consultables dans la liste. Le fonctionnement WebGL normal garde le vrai modèle 3D.

Certains groupes combinent plusieurs portions superficielles/profondes. L’atténuation ne sépare pas les structures d’un même groupe : leurs superpositions peuvent persister. La sélection est celle du groupe pédagogique ; elle n’offre pas une dissection de chaque portion ni une mesure de recrutement individuel.

Sources primaires consultées pour contrôler les familles de mouvements : [ACE, rowing avec appui](https://www.acefitness.org/resources/everyone/exercise-library/126/single-arm-row/), [NASM, développé incliné](https://www.nasm.org/resource-center/exercise-library/incline-barbell-bench-press), [NASM, biomécanique du tirage vertical](https://www.nasm.org/resource-center/blog/training/the-biomechanics-of-the-lat-pulldown-muscles-grip-and-form), [NASM, mollets](https://www.nasm.org/resource-center/blog/training/calf-training-how-to-program-this-stubborn-muscle-group-for-clients), [NASM, leg curl assis](https://www.nasm.org/resource-center/exercise-library/seated-leg-curl), [ACE, curl marteau](https://www.acefitness.org/resources/everyone/exercise-library/10/hammer-curl/), [catalogue NASM](https://www.nasm.org/resource-center/exercise-library).

La classification détaillée des rôles est une synthèse pédagogique tirée du mouvement et de l’anatomie, pas une certification des sources ni une mesure EMG. Une revue professionnelle des 69 configurations reste à effectuer, en priorité pour les trois partiels et le pull-over non associé. L’atlas debout n’anime aucun exercice et ne reproduit pas sa posture.

Licence et crédits conservés : Fit Mit With / Z-Anatomy / BodyParts3D, auteur dans l’attribution amont, projet et commit d’origine, fichier complet CC BY-SA 4.0, provenance et adaptations. Le GLB et les notices de redistribution ne sont pas modifiés.

## Fichiers modifiés et créés

Moteur/interface : les six fichiers TS/TSX existants de `src/components/sport/anatomy/` et `anatomy.css` ; bibliothèque et détail dans `src/components/sport/exercises/` ; `program-manager.tsx` et `session-list.tsx` ; traductions `src/lib/i18n/modules/exercise-library.ts`.

Configuration : six nouveaux fichiers dans `src/lib/anatomy/` (`types`, `identity`, `atlas`, `configs`, `highlights`, `general-copy`) ; extraction `guide-content.ts` et façade `guides.ts`.

Vérification : `anatomy-configs.test.mjs`, `anatomy-coverage.mjs`, `anatomy-v3-browser-checks.mjs` ; extension de `anatomy-browser-checks.mjs` et `audit-anatomy-bundles.mjs`. Preuves et captures dans ce dossier.

## Vérifications automatisées

- `npx --no-install tsc --noEmit` : succès.
- `npm run lint` : succès, sans avertissement.
- `node --test --test-reporter=dot scripts/anatomy-configs.test.mjs scripts/anatomy.test.mjs scripts/exercise-library.test.mjs scripts/sport-hub.test.mjs scripts/design-system.test.mjs scripts/performance.test.mjs` : **114 tests réussis**, dont 75 tests V3 ciblés.
- Chaque configuration : vrais identifiants gauche/droite dans le GLB, aucun doublon de rôle, principaux documentés, traductions FR/EN/AR, groupes absents explicitement signalés.
- Identification : variantes distinctes, noms proches refusés, catégorie contradictoire refusée, origine personnelle refusée sans association validée, comptage réel des lignes de bibliothèque.
- [Contrôle de préservation](./preservation.json) : GLB, notices, code de séance et contenu des guides inchangés ; aucun diff dans les actions, Supabase, schémas ou mécanismes d’authentification.

Le premier build sans accès réseau a échoué sur les polices Google déjà utilisées par le projet. Les builds suivants ont été lancés avec cet accès. Un premier build d’intégration a détecté l’import interdit du module `server-only` : corrigé par l’extraction éditoriale décrite plus haut. La première campagne Edge a atteint les 69 mappings mais s’est arrêtée en cherchant le bouton d’une carte de programme repliée ; le scénario a été corrigé pour déplier la carte. Ces tentatives ne sont pas comptées comme validations réussies.

Une autre tentative s’est arrêtée sur une assertion du pilote CDP renvoyant un élément DOM au lieu d’un booléen. Cette assertion a été corrigée. La campagne complète suivante a réussi : `node scripts/performance-browser.mjs --production --anatomy-only`, avec un vrai rendu WebGL2 sous Edge et un GPU logiciel, Auth/REST de test sur localhost. [Résultats globaux](./browser-results.json), [résultats V3](./anatomy-v3-results.json), [matériaux/maillages par exercice](./material-checks.json), [diagnostics du prototype conservé](./anatomy-pilot-results.json).

- **70 passages de configuration** : les **69 exercices distincts**, puis le rowing à nouveau pour contrôler le retour à une configuration antérieure.
- **346 sélections** : tous les groupes de chaque exercice, rôle affiché et cohérence des vrais matériaux WebGL avec la palette. Zones neutres sans coloration résiduelle.
- Vue initiale et cadrage de chaque mouvement, absence de Canvas après fermeture, aucune lecture de table à l’ouverture.
- Accès direct depuis bibliothèque, programme déplié et historique ; accès séance validé par le scénario du prototype. Variante non associée sans bouton 3D et avec message approprié.
- **36 cas du prototype + 12 cas V3** : FR/EN/AR, RTL, clair/sombre, largeurs 320/390/430/1440 et écrans courts/paysage selon le scénario ; System, mouvement réduit et DPR 3 vérifiés séparément.
- Rotation souris, rotation tactile simulée, pincement simulé, zoom et bornes, vues avant/arrière/corps entier/reset, sélection d’un vrai mesh, liste, fermeture, focus et cycles de réouverture.
- Fallback sans WebGL, après perte de contexte, et pour les jambes avec repères de quadriceps sélectionnables.
- Brouillon/séries/champs de séance conservés à l’identique. Repos **1:31 → 0:45 en 46,186 secondes**, sans pause ni réinitialisation.
- **Zéro écriture** sur toute la campagne, aucune erreur console inattendue. Les disciplines désactivées ne consultent pas leurs tables.

Mémoire JavaScript après GC forcé : **4 981 200 octets** avant ouverture, **8 245 240** après la première fermeture, puis **8 297 376 / 8 421 580 / 8 437 464** après trois réouvertures. Les modules différés restent chargés. Les contextes WebGL sont effectivement perdus à la fermeture et les Canvas retirés. Trois cycles ne prouvent pas l’absence de toute fuite à long terme ; ces nombres excluent les allocations GPU et ne mesurent pas un téléphone.

## Captures du rendu testé

| Cas | Capture |
| --- | --- |
| Développé incliné haltères, mobile clair | [Voir](./v3-strength-developpe-incline-halteres.png) |
| Curl marteau, mobile clair | [Voir](./v3-strength-curl-marteau.png) |
| Squat, mobile clair | [Voir](./v3-strength-squat.png) |
| Mollets assis, mobile clair | [Voir](./v3-strength-mollets-assis.png) |
| Marche du fermier, mobile clair | [Voir](./v3-strength-marche-du-fermier.png) |
| Squat, desktop anglais clair | [Voir](./v3-squat-en-light-desktop.png) |
| Squat, arabe RTL sombre 320 px | [Voir](./v3-squat-ar-dark-mobile.png) |
| Leg extension, fallback sans WebGL | [Voir](./v3-leg-extension-fallback.png) |
| Rowing de référence, mobile clair | [Voir](./rowing-fr-light.png) |
| Rowing de référence, desktop sombre | [Voir](./rowing-desktop-dark.png) |

Captures Edge réelles, sans image générée. Aucun appareil iPhone ou Android physique, Safari/iOS ou réseau mobile réel n’a été utilisé.

## Performances avant/après et build livré

Build normal final `npm run build` : **succès**, configuration habituelle restaurée après la campagne avec API fictive. `git diff --check` : succès. Aucune dépendance ajoutée, aucun fichier de configuration d’environnement modifié.

Mesures de builds normaux locaux, addition des gzip par fichier JS initial référencé dans les manifestes de route ; ce ne sont pas des transferts réseau ni des mesures de temps sur téléphone. [Avant](./before-build.json), [après](./after-build.json), [audit des bundles](./bundle-audit.json).

| Route | Avant, gzip octets | Après, gzip octets | Variation |
| --- | ---: | ---: | ---: |
| Dashboard | 300 216 | 300 504 | +288 |
| Nutrition | 322 429 | 322 717 | +288 |
| Sport Hub | 302 563 | 302 851 | +288 |
| Musculation | 326 698 | 330 207 | +3 509 |
| Bibliothèque | 303 860 | 308 409 | +4 549 |
| Fiche exercice | 307 022 | 311 003 | +3 981 |

L’augmentation générale vient des nouveaux libellés partagés ; les pages concernées ajoutent le registre léger d’identification, les boutons et le comptage. **Three.js et les détails anatomiques restent absents du JS initial des 13 routes contrôlées.** Le moteur différé mesure **654 903 octets bruts / 162 125 gzip**. Les configurations et informations pédagogiques sont dans les modules différés du dialogue, pas dans le registre initial.

Un seul GLB inchangé : **2 545 068 octets**, SHA-256 `d80bebc4045069b660ca8e7afe599d76d15ccc7d96410b3727c600ef01d24e54`. Aucun téléchargement de modèle avant ouverture sur Dashboard, Nutrition et Musculation pendant le test. Les modules et le cache HTTP peuvent être réutilisés entre ouvertures ; les géométries/matériaux et le contexte de chaque scène sont libérés à la fermeture.

Budgets conservés : DPR maximal 2 et 1 200 000 pixels, contraintes GPU prises en compte, rendu déclenché par interaction, arrêt au repos/hors vue/onglet masqué, aucune texture d’environnement ni post-traitement ajouté. Pas de mesure de LCP/INP/4G, de batterie, de chauffe ou de mémoire GPU sur téléphone réel.

## Validation avant Production

Relire l’inventaire et les trois fiches partielles, puis faire valider les rôles et traductions. Essayer sur iPhone/Safari et Android physiques : toucher, changement d’orientation, défilement, mémoire, fluidité, première ouverture et arrière-plan. Vérifier une séance autorisée avec les données et règles Supabase de l’environnement cible, les séries/charges/répétitions, le brouillon, le repos et les exercices personnels ambigus. Les tests locaux n’attestent pas la disponibilité des données ni les politiques RLS distantes.

Valider le diff de la branche, puis autoriser explicitement les étapes Git et le déploiement souhaités. Rien n’est publié automatiquement.
