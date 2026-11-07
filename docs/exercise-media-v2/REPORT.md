# Exercise Media Experience V2 — cinq pilotes

Travail local sur `exercise-media-experience-v2`, créée depuis `2bdc46d`. La branche de départ était propre. Aucun commit, push, déploiement, migration ou changement Supabase. Aucune nouvelle photographie ni dépendance.

**Parcours livré.** Dans une séance Musculation, la miniature ouvre la fiche technique partagée sans navigation ni démontage du journal de séance. L’icône d’information ouvre la même fiche, avec le même identifiant stable. Sur mobile, le dialogue s’affiche en bottom sheet et peut occuper tout l’écran ; sur desktop, il devient un dialogue large. Le titre complet, le matériel illustré et les commandes restent accessibles. La carte conserve son tableau de séries et une petite miniature de 64 px.

La présentation est aussi partagée avec la page de bibliothèque du même exercice. Les autres exercices conservent leur présentation classique.

| Pilote | Identifiant stable | Technique utilisée |
| --- | --- | --- |
| Développé incliné haltères | `strength-developpe-incline-halteres` | Texte de la variante photographiée ajouté en FR/EN/AR |
| Rowing haltère unilatéral | `strength-rowing-haltere-unilateral` | Guide existant réutilisé |
| Squat | `strength-squat` | Texte ajouté en FR/EN/AR, explicitement limité au squat barre haute illustré |
| Curl incliné | `strength-curl-incline` | Texte de la variante photographiée ajouté en FR/EN/AR |
| Tirage horizontal poulie | `strength-tirage-horizontal-poulie` | Guide existant réutilisé |

**Les quatre sections.** Photos présente la position sélectionnée, son libellé et sa légende. Technique rassemble préparation, placement du corps et des mains, exécution, retour et respiration. Muscles reprend les rôles et limites du registre anatomique existant et propose son bouton 3D. Erreurs et conseils regroupe erreurs/corrections, stabilité, tempo, amplitude et précautions. Les sources techniques existantes restent consultables. L’affichage des performances est extrait dans un composant partagé, sans changement de calcul.

**Galerie.** Seules les positions réellement présentes au registre sont proposées. Une seule grande image est montée à la fois, avec `next/image`, cadrage `contain` et ratio réservé. Les boutons précédent/suivant et les boutons de position naviguent entre les deux photographies. Le balayage tactile a été vérifié avec les événements tactiles d’Edge, en LTR et RTL. Les flèches, Début et Fin fonctionnent au clavier. La transition dure 160 ms et disparaît avec `prefers-reduced-motion`. Une seule image ne produit aucune commande de galerie ; une image indisponible affiche l’illustration de remplacement et permet de rejoindre l’autre position.

**3D.** Réutilisation directe de `ExerciseMuscleButton` et de son dialogue existant. Aucun moteur, modèle, mapping ou composant anatomique n’est modifié. Les résumés proviennent de `getExerciseAnatomy` et `ATLAS_MUSCLES`, avec les mêmes rôles et limitations. Aucun GLB n’est demandé pendant la consultation des photos, de la technique ou du résumé musculaire. Le modèle est chargé au clic explicite sur le bouton 3D. Échap ferme d’abord le 3D, puis la fiche ; le focus revient à la miniature.

**Conservation de la séance.** La campagne Edge remplit les champs à travers React : 27,5 kg, 13 répétitions et une série validée. Elle vérifie l’égalité exacte du JSON `strength-draft-v1` après consultation, fermeture du 3D, fermeture de la fiche et trois réouvertures. `startedAt`, ordre, séries, charges, répétitions et validations restent identiques. L’ajout puis la suppression d’une série vide et un aller-retour de réorganisation conservent ces données.

La position est capturée au clic avant le chargement différé du dialogue, puis restaurée à sa fermeture. Le test retrouve le défilement à 399 px et la miniature au focus. Sur la dernière exécution, le repos passe de `1:31` à `1:28`, la durée de séance de `3:04` à `3:07`, pour 2,834 s de consultation : aucun arrêt ni redémarrage. Zéro écriture REST observée sur les fixtures locales. Aucun compte réel n’a été utilisé.

L’[audit de préservation](preservation.json) compare aussi le code au commit de départ : états, effets de persistance, minuteurs, calculs, gestionnaires d’événements de séance et lecteur de performances inchangés. Les répertoires d’actions, Supabase, anatomie, modèles et médias publics sont inchangés ; les trois photographies originales gardent leurs SHA-256.

**Mesures de performance.** Somme des fichiers JavaScript initiaux uniques, compressés individuellement en gzip, à partir des manifests de compilation. Ce sont des tailles de build, pas des temps de chargement sur téléphone ou réseau 4G.

| Route | Avant, octets gzip | Après, octets gzip | Écart |
| --- | ---: | ---: | ---: |
| `/dashboard` | 301 212 | 301 524 | +312 |
| `/sport` | 303 572 | 303 884 | +312 |
| `/sport/musculation` | 337 664 | 339 228 | +1 564 |
| `/sport/exercises` | 309 281 | 309 593 | +312 |
| `/sport/exercises/[key]` | 311 609 | 314 310 | +2 701 |

Les [mesures avant](before-build.json), [mesures après](after-build.json) et l’[audit des bundles](bundle-audit.json) couvrent 13 routes. Aucun moteur Three.js ni détail anatomique n’entre dans leur JavaScript initial. Le moteur reste dans un chunk différé de 162 125 octets gzip. La séance initiale ne demande que les miniatures visibles ou proches du viewport ; les grandes photographies arrivent à l’ouverture. Le build normal a été rétabli après la campagne utilisant des fixtures.

**Vérifications exécutées.**

- `npx --no-install tsc --noEmit` : réussi.
- `npm run lint` : réussi, sans avertissement.
- `npm run build` : réussi, compilation normale après les tests navigateur.
- `git diff --check` : réussi.
- Huit suites Node : **132 tests réussis**, aucun échec. [Sortie complète](unit-tests.txt).
- `node scripts/exercise-media-v2-preservation.mjs` : conservation du métier, des médias et de l’anatomie confirmée.
- `node scripts/performance-browser.mjs --production --exercise-media-v2` : **75 cas de fiches et 24 cas de dialogue en séance**, plus contrôles fonctionnels. Français/anglais/arabe, LTR/RTL, clair/sombre, largeurs 320/390/430/768/1440 px selon la matrice. Les 24 dialogues couvrent FR/EN/AR × clair/sombre × 320/430/768/1440 px.
- Mode système clair/sombre simulé, réduction des animations, vraies interactions tactiles, clavier, images bloquées et récupération, fiches hors pilotes, réouvertures, séries, réorganisation, brouillon, durée, repos, focus, défilement et accès au 3D : réussis.
- Aucune erreur JavaScript, aucune écriture REST. [Résultats complets Edge](browser-results.json), [matrice et contrôles](browser-cases.json).

**Captures.** 23 captures WebP issues d’Edge sont conservées dans [l’index des captures](SCREENSHOTS.md). Exemples : [fiche claire à 320 px](screenshots/sheet-fr-light-320.webp), [fiche sombre à 320 px](screenshots/sheet-fr-dark-320.webp), [arabe RTL à 430 px](screenshots/sheet-ar-dark-430.webp), [3D imbriqué](screenshots/nested-3d-fr-light-mobile.webp). Les cinq pilotes disposent également chacun d’une capture desktop claire et sombre.

**Fichiers d’application créés.**

| Fichier | Rôle |
| --- | --- |
| [exercise-premium-detail.tsx](../../src/components/sport/exercises/exercise-premium-detail.tsx) | Quatre sections partagées entre dialogue et page |
| [exercise-photo-gallery.tsx](../../src/components/sport/exercises/exercise-photo-gallery.tsx) | Image sélectionnée, positions, commandes, tactile, clavier et repli |
| [exercise-performance.tsx](../../src/components/sport/exercises/exercise-performance.tsx) | Présentation des performances existantes extraite sans changer les calculs |
| [media-experience.ts](../../src/lib/exercises/media-experience.ts) | Périmètre explicite des cinq pilotes et sélection des images disponibles |
| [pilot-technique.ts](../../src/lib/exercises/pilot-technique.ts) | Trois techniques complémentaires FR/EN/AR, limitées aux variantes illustrées |

**Fichiers d’application modifiés.**

| Fichier | Modification |
| --- | --- |
| [exercise-thumbnail.tsx](../../src/components/sport/exercises/exercise-thumbnail.tsx) | Miniature cliquable pour les cinq identifiants pilotes |
| [exercise-guide-button.tsx](../../src/components/sport/exercises/exercise-guide-button.tsx) | Déclencheur partagé photo/information et capture de la position |
| [exercise-guide-dialog.tsx](../../src/components/sport/exercises/exercise-guide-dialog.tsx) | Identifiant stable, agrandissement, fermeture, focus et défilement |
| [exercise-detail.tsx](../../src/components/sport/exercises/exercise-detail.tsx) | Activation de la présentation premium sur les cinq pilotes |
| [exercise-library.css](../../src/components/sport/exercises/exercise-library.css) | Carte compacte, bottom sheet, galerie, onglets, RTL et mouvement réduit |
| [session-logger.tsx](../../src/components/strength/session-logger.tsx) | Présentation de l’en-tête uniquement : nom complet, équipement et disposition des commandes |
| [data.ts](../../src/lib/exercises/data.ts) | Ajout des textes des pilotes et résumés tirés des mappings existants, sans nouvelle requête |
| [types.ts](../../src/lib/exercises/types.ts) | Type optionnel du résumé anatomique |
| [media-thumbnails.ts](../../src/lib/exercises/media-thumbnails.ts) | Métadonnées légères de matériel partagées avec la carte |
| [media-registry.ts](../../src/lib/exercises/media-registry.ts) | Réutilisation de cette table de matériel, valeurs conservées |
| [exercise-library.ts](../../src/lib/i18n/modules/exercise-library.ts) | Nouveaux libellés FR/EN/AR |

**Scripts de vérification.** Création de [exercise-media-v2.test.mjs](../../scripts/exercise-media-v2.test.mjs), [exercise-media-v2-browser-checks.mjs](../../scripts/exercise-media-v2-browser-checks.mjs) et [exercise-media-v2-preservation.mjs](../../scripts/exercise-media-v2-preservation.mjs). Adaptation de [exercise-library.test.mjs](../../scripts/exercise-library.test.mjs), du [harnais Edge](../../scripts/performance-browser.mjs) et de son [point d’entrée média existant](../../scripts/exercise-media-browser-checks.mjs).

**Limites restantes.** Les essais sont locaux dans Edge headless, avec émulation de viewport et données fictives ; aucun téléphone physique, Safari iOS ou débit 4G réel n’a été mesuré. Pas de zoom photographique dédié ; l’agrandissement de la fiche est disponible. Les photographies sont des médias générés antérieurement et leur statut de validation pilote reste inchangé. L’atlas 3D reste un repérage anatomique debout, avec ses limitations existantes. L’extension aux autres exercices est volontairement arrêtée pour validation de ces cinq pilotes.
