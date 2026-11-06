# Lot D — Bibliothèque et fiches d’exercices

Les chiffres de ce rapport décrivent le Lot D. Le [prototype anatomique ultérieur](../anatomy/ROWING_PROTOTYPE.md) possède ses propres mesures et contrôles. Les captures ont été rafraîchies avec les visuels masculins demandés ; leur poids actuel est de 116,4 Kio et leur historique est conservé dans le registre.

Travail local sur `track-perso-sport-premium-lot-a`, en conservant les changements non commités des Lots A/B/C. `main` et `HEAD` restent sur `742b0f6fe65475381ae483a60e0f4fee0df9d91e`. Aucun commit, déploiement, accès en écriture à Supabase ou exécution de migration. Les fichiers d’environnement ne sont pas modifiés.

## Résultat et couverture

La route `/sport/exercises` propose recherche insensible aux accents et signes diacritiques arabes, filtrage par discipline/groupe musculaire/matériel/niveau indicatif, tri alphabétique localisé, cartes compactes, décompte accessible et affichage progressif de 24 cartes. Les métadonnées inconnues sont identifiées et filtrables comme telles.

Les **69 exercices de référence existants** sont conservés avec leurs noms canoniques et leur présentation FR/EN/AR. Une entrée documentaire précise « Squat au poids du corps » s’ajoute, soit **70 entrées de référence**, auxquelles s’ajoutent les exercices personnels distincts réellement présents en base. La consultation ne crée aucun exercice Supabase.

**Huit fiches techniques complètes** sont intégrées :

| Mouvement | Média principal | Correspondance Calisthenics globale, si gate autorisée |
| --- | --- | --- |
| Rowing haltère unilatéral | Visuel IA dédié | — |
| Développé couché barre | Schéma original | — |
| Curl haltères en supination | Visuel IA dédié | — |
| Pompes au sol | Visuel IA dédié | `push-up` |
| Planche sur avant-bras | Schéma original | `plank` |
| Tractions en pronation | Schéma original | `pull-up` |
| Tirage horizontal poulie | Schéma original | — |
| Squat au poids du corps | Schéma original | `bodyweight-squat` |

Chaque fiche documentée contient description, objectif technique, préparation, position, exécution, retour contrôlé, respiration, amplitude, tempo, erreurs/corrections, stabilité/adaptation et sécurité. Les consignes sont propres au mouvement, avec les trois langues rédigées explicitement. Les muscles principaux/secondaires sont nommés et représentés par zones simplifiées face/dos.

Les **62 autres entrées de référence conservent une fiche de base à compléter**, avec leurs informations connues et un état documentaire explicite. Elles n’ont pas de technique attribuée par supposition. Un nom ambigu comme « Squat » ne reçoit pas la fiche d’une variante arbitraire. Les descriptions/consignes personnelles Calisthenics restent consultables lorsqu’elles existent.

Le modèle Running actuel décrit des sorties, types de course et objectifs ; il ne fournit pas de catalogue d’exercices techniques. Le filtre Running affiche un état vide et un lien vers la destination existante. Les gates Calisthenics et Running restent inchangées ; aucune de leurs tables n’est interrogée lorsqu’elles sont désactivées.

## Intégration et composants

Accès à la bibliothèque depuis le Sport Hub, l’en-tête Musculation, la navigation compacte et le catalogue Calisthenics déjà protégé. Accès aux fiches depuis les résultats du sélecteur, les exercices de séance, les programmes, les séries de l’historique et la progression.

Le bouton d’information ouvre un **dialogue natif chargé à la demande**, sans changer la route ni démonter le formulaire. Échap ferme le dialogue ; le focus revient au bouton. Le contenu est annulable/rechargeable en cas d’erreur. Une page dédiée permet aussi de consulter chaque fiche. La barre mobile et la sidebar desktop sont conservées.

Composants ajoutés :

- `ExerciseLibrary` : recherche, filtres, tri, résultats et états vides.
- `ExerciseDetailContent` : sections Technique, Muscles, Erreurs, Conseils, performances et références.
- `ExerciseGuideButton` / `ExerciseGuideDialog` : consultation intégrée et gestion du focus.
- `ExerciseDemonstration` : lecteur local sur demande et remplacement sans vidéo.
- `MovementSketch` : cinq schémas de mouvement et pictogramme de remplacement.
- `MuscleMap` : zones correspondant aux huit variantes documentées, alternative textuelle et contours différenciés.

Réutilisation des cartes, médias, boutons, liens, titres, badges, indicateurs et états du Lot B. `ExerciseCard` accepte un détail et un remplacement visuel ; son préchargement est désactivé dans la bibliothèque. `SportMedia` accepte ce remplacement sans changer son comportement par défaut.

## Données et records

Les données personnelles proviennent des lectures Supabase authentifiées et filtrées par propriétaire, sans nouveau schéma. Les données éditoriales locales sont séparées des identités et relations Supabase existantes.

La dernière séance et les records Musculation utilisent les séries enregistrées, jusqu’à aujourd’hui, et `computeStrengthData` inchangé. L’identité garde la normalisation existante de casse/espaces ; les alias traduits ne fusionnent pas des performances différentes. Affichage de la meilleure charge et du meilleur volume uniquement lorsqu’ils sont calculables. Aucun faux entraînement, record ou badge « nouveau PR ».

Calisthenics conserve les séries, répétitions, secondes, assistance, lest et variantes réels. Les records globaux entre conditions différentes ne sont pas calculés dans cette version. Une erreur de lecture n’est pas présentée comme un historique vide.

## Médias et références

Trois WebP locaux, **113,3 Kio cumulés**, créés avec le skill `imagegen` et l’outil intégré `image_gen`, inspectés puis encodés en 960 × 640. Cinq schémas SVG de mouvement et la représentation musculaire sont du code original. Aucune photo/vidéo de tiers n’a été copiée et aucune licence externe n’est inventée.

Le [registre des médias](./MEDIA_REGISTRY.md), le [registre JSON](./media-registry.json) et les [prompts exacts](./media-prompts.json) indiquent origine, auteur, statut de licence, attribution, fichier, mouvement et alternatives traduites. Les fiches citent les références techniques consultées : ACE, PureGym, Mayo Clinic et NASM ; leurs actifs ne sont pas importés.

**Aucune vidéo réelle intégrée.** Le lecteur préparé n’affiche aucun bouton fictif sans ressource. Il attend un clic avant de créer l’élément vidéo, utilise les contrôles natifs, `preload="none"`, un poster facultatif, une transcription et des sous-titres. Lecture manuelle, pause native et relecture, sans autoplay ni service externe. Le scénario avec une vraie vidéo de production reste à valider après ajout d’un actif autorisé.

## Performances

Pas de dépendance ajoutée. Textes techniques et anatomiques exclusivement serveur ; seule la langue active est transmise à une fiche. Le catalogue ne reçoit pas les textes des huit techniques. Dialogue chargé avec `next/dynamic`, GET démarré à l’ouverture, réponse privée `no-store`, pagination et lectures des séances par lots d’identifiants. Le test Edge confirme l’absence de préchargement des séries depuis les cartes de bibliothèque.

Images `next/image` avec `sizes`, dimensions réservées, WebP et chargement différé ; vidéo absente du chargement initial. Cache isolé par requête, charts différés, panneaux conservés et brouillons des Lots A/B/C restent en place. Les trois visuels du Lot B restent des images d’ambiance.

Mesure des artefacts du build normal, selon la même méthode qu’au Lot A : union des JS initiaux déclarés par route, gzip par fichier. Ce ne sont ni des temps de chargement réels ni des transferts réseau complets ; HTML/RSC, CSS et images ne sont pas comptés dans cette colonne.

| Route | Avant D, JS gzip Kio | Après D | Évolution |
| --- | ---: | ---: | ---: |
| `/sport` | 291,8 | 295,4 | +3,6 |
| `/sport/musculation` | 314,3 | 318,5 | +4,2 |
| `/sport/calisthenics` | 303,1 | 307,2 | +4,1 |
| `/sport/calendar` | 283,7 | 287,3 | +3,6 |
| `/sport/stats` | 295,0 | 298,6 | +3,6 |
| `/sport/running` | 299,0 | 302,6 | +3,6 |
| `/sport/exercises` | Nouvelle route | 296,6 | — |
| `/sport/exercises/[key]` | Nouvelle route | 299,1 | — |

La hausse partagée d’environ 3,6 Kio correspond essentiellement aux nouveaux libellés dans l’architecture de dictionnaire globale existante. Les autres routes mesurées augmentent du même ordre. Les gains du Lot A restent présents ; le coût ajouté est explicite. Détails dans [avant](./lot-d-before.json) et [après](./lot-d-after.json).

## Vérifications

- `npx --no-install tsc --noEmit` : succès.
- `npm run lint` : succès, sans avertissement.
- `npm run build` : succès ; build habituel rétabli après les essais avec fixtures locales.
- `git diff --check` : succès.
- `node --test scripts/exercise-library.test.mjs scripts/sport-hub.test.mjs scripts/design-system.test.mjs scripts/performance.test.mjs` : **33 tests réussis**.
- `node scripts/performance-browser.mjs --production --hub --exercise-library` : succès sous Microsoft Edge local.

Edge : **48 combinaisons bibliothèque/fiche × FR/EN/AR × clair/sombre × 320/390/430/1440 px**, sans débordement. Contrôles supplémentaires : System clair/sombre, recherche accentuée, filtres combinés, tri inverse, recherche vide, Running vide, Calisthenics désactivé, chargement effectif d’image, image bloquée et place réservée, variante ambiguë, données de test 25 kg × 12 / 300 kg, dialogue, focus clavier, Échap, brouillon conservé et erreur GET locale puis nouvelle tentative réussie.

Régression Sport Hub : 42 combinaisons langue/thème/largeur, navigation des six destinations, brouillon conservé entre panneaux et raccourcis, calendrier historique, redirection de date, charts différés, états vides et reprise après erreur de lecture. L’erreur React attendue du scénario 503 volontaire est isolée dans le rapport ; aucune autre erreur console observée.

Les tests utilisent un serveur Auth/REST local et des données fictives **uniquement pour la QA**, sans écrire dans Supabase. Aucun appel aux tables Calisthenics/Running fermées. Le branchement Calisthenics autorisé est couvert par mocks unitaires sans activer les variables réelles. Les clés documentaires sont vérifiées contre les clés existantes de la migration, en lecture seule.

Preuves : [rapport navigateur](./lot-d-browser.json), [bibliothèque claire](./exercise-library-fr-light.webp), [bibliothèque sombre](./exercise-library-fr-dark.webp), [fiche claire](./exercise-detail-fr-light.webp), [fiche sombre](./exercise-detail-fr-dark.webp), [RTL](./exercise-detail-ar-dark.webp), [dialogue](./exercise-dialog.webp), [état vide](./exercise-empty.webp), [média manquant](./exercise-image-fallback.webp).

Les tests réels sur smartphone tactile, Safari/iOS, Supabase/RLS et migrations réellement appliquées restent à effectuer. Le build ne constitue pas une validation des règles RLS de production.

## Fichiers du Lot D

| Ensemble | Fichiers créés ou modifiés |
| --- | --- |
| Routes créées | `src/app/(app)/sport/exercises/page.tsx`, `src/app/(app)/sport/exercises/[key]/page.tsx`, `src/app/api/sport/exercise-guide/route.ts` |
| Données créées | `src/lib/exercises/{catalog,data,guides,identity,muscles,request,search,types}.ts` |
| UI créée | `src/components/sport/exercises/{exercise-library,exercise-detail,exercise-guide-button,exercise-guide-dialog,exercise-demonstration,movement-sketch,muscle-map}.tsx`, `exercise-library.css` |
| Navigation modifiée | `src/app/(app)/sport/layout.tsx`, `src/app/(app)/sport/musculation/page.tsx`, `src/components/sport/sport-dashboard.tsx`, `sport-hub-nav.tsx` |
| Intégrations modifiées | `src/components/strength/{exercise-picker,session-logger,program-manager,session-list,progression}.tsx`, `src/components/sport/calisthenics-workspace.tsx` |
| Composants partagés modifiés | `src/components/sport/ui/sport-media.tsx`, `sport-content-cards.tsx` |
| Traductions | Nouveau `src/lib/i18n/modules/exercise-library.ts`, intégration dans `sport.ts` |
| Médias créés | `public/images/exercises/{one-arm-dumbbell-row,push-up,dumbbell-curl}.webp` |
| Tests créés | `scripts/exercise-library.test.mjs`, `scripts/exercise-browser-checks.mjs` |
| Outils modifiés | `scripts/performance-browser.mjs`, `scripts/measure-build.mjs` |
| Documentation créée | Ce rapport, `ARCHITECTURE.md`, `MEDIA_REGISTRY.md`, registres/prompts JSON, mesures avant/après, rapport navigateur et neuf captures WebP dans `docs/exercise-library/` |

Les actions serveur, calculs métier existants, modèles de base, anciennes migrations, gates, dépendances et navigation principale n’ont pas changé. Aucun script SQL n’est nécessaire ou préparé : la couche documentaire ne requiert pas de nouvelle persistance.

## Limites et validation suivante

La structure et les intégrations du Lot D sont livrées avec une première couverture éditoriale de huit mouvements. Restent l’enrichissement documenté des 62 fiches de base, les photos/démonstrations supplémentaires avec droits vérifiés, la validation d’un vrai fichier vidéo, et les tests sur smartphone/Supabase réels. Les records Calisthenics par conditions comparables pourront être ajoutés sans mélanger assistance, lest et variantes.

Le Lot E et le nouveau Workout Mode ne sont pas commencés. Arrêt pour validation du Lot D.
