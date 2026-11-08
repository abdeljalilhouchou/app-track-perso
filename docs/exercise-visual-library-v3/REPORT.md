# Exercise Visual Library V3 — lot de 15 exercices

Travail du 8 novembre 2026 sur **`exercise-visual-library-v3`**, créée depuis `main` au commit `4f7d915`. L’arbre était propre et `main` synchronisée avec `origin/main` lors du contrôle initial. Aucun commit, push, déploiement, reset, migration ou changement Supabase effectué. `main` conserve le commit de départ.

**Résultat livré.** Quinze références supplémentaires ont leur photographie principale, leur miniature et la fiche interactive V2 existante. Quatorze mouvements ont deux photographies distinctes. Le gainage a une seule image de maintien, avec un libellé et une description propres, sans commande de galerie superflue. La photo d’arrivée sert de photo principale ; aucun fichier supplémentaire identique n’est produit pour la compter deux fois.

**Catalogue réellement audité.**

| Mesure | Avant | Après |
| --- | ---: | ---: |
| Références Musculation versionnées | 70 | 70 |
| Références disposant d’une photo | 7 | 22 |
| Références sans photo | 63 | 48 |
| Références illustrées dans les 24 exercices du programme fourni | 3 | 17 |

Le décompte vient des 69 exercices prédéfinis, du squat au poids du corps éditorial et du registre effectif. La composition du catalogue, les identifiants, les alias et le calcul des totaux sont inchangés. Aucun programme personnel de Production n’a été lu. Le chiffre 80 n’est pas supposé être le nombre actuel du compte : la campagne locale vérifie séparément une fixture de 80 = 70 références + 10 exercices personnels. Les origines Calisthenics restent gérées par le mécanisme existant.

Les [inventaires avant](before-inventory.json) et [après](after-inventory.json) consignent les enregistrements et empreintes. Le [tableau du catalogue](INVENTORY.md) donne les 70 références et leur état ; les **48 références restantes sans photo** sont aussi exportées explicitement dans `after-inventory.json`, champ `remainingWithoutPhoto`.

**Sélection exacte.** La priorité est donnée à `DEFAULT_PROGRAM`, accessible dans le code. Quatorze références sélectionnées appartiennent à ses quatre séances. Le gainage complète le lot avec une fiche déjà documentée et un cas statique. Neuf catégories musculaires sont représentées ; les variantes proches n’occupent pas tout le lot.

| Exercice | Programme fourni | Photographies retenues |
| --- | --- | ---: |
| Développé couché barre | Pectoraux & Triceps | 2 |
| Écarté poulie vis-à-vis | Pectoraux & Triceps | 2 |
| Tractions | Dos & Biceps | 2 |
| Rowing barre | Dos & Biceps | 2 |
| Développé militaire barre | Épaules & Abdos | 2 |
| Élévations latérales | Épaules & Abdos | 2 |
| Curl marteau | Dos & Biceps | 2 |
| Extension poulie haute (corde) | Pectoraux & Triceps | 2 |
| Presse à cuisses | Jambes | 2 |
| Leg extension | Jambes | 2 |
| Fentes marchées | Jambes | 2 |
| Leg curl allongé | Jambes | 2 |
| Mollets debout | Jambes | 2 |
| Crunch poulie | Épaules & Abdos | 2 |
| Gainage (planche) | Catalogue, guide existant | 1 |

Les identifiants stables, liens vers chaque position, miniatures et poids par exercice sont dans [SELECTED.md](SELECTED.md). Les variantes illustrées sont explicites : banc plat pour le développé couché, pronation pour les tractions et le rowing, prise neutre pour le marteau, presse à chariot incliné et mollets au poids du corps avec appui léger. Le point bas d’une fente est nommé comme tel ; il n’est pas présenté comme la fin complète d’une marche.

**Production et revue des médias.** Outil **`image_gen` intégré**, avec le Curl incliné existant comme référence de style. Chaque proposition a été affichée et inspectée. Les secondes positions sont éditées à partir du cliché correspondant pour conserver homme adulte, tenue sobre, matériel, appuis et environnement. Aucun texte n’est incrusté et aucune photographie tierce n’est copiée.

| Bilan des propositions générées | Nombre |
| --- | ---: |
| Propositions produites | 34 |
| Photographies rejetées | 5 |
| Photographies retenues après revue visuelle | 29 |
| Miniatures créées | 15 |

Les rejets portent sur deux vues de développé couché où le soutien de la tête et du haut du dos était insuffisant, le cou trop relevé du premier rowing, le soutien de la tête sur la première presse et les coudes trop fléchis sur la première arrivée de l’écarté. Ces propositions sont remplacées dans les fichiers finaux.

La [revue](REVIEW.md) et [generation.json](generation.json) conservent les prompts exacts, références d’édition, chemins d’origine et décisions des 34 opérations. La revue est visuelle, réalisée par l’assistant ; elle ne constitue pas une certification biomécanique ou clinique. Les quinze nouvelles entrées portent **`pending-batch-validation`** pour la validation utilisateur.

**Médias optimisés et chemins livrés.**

| Type | Nombre | Dimensions | Total | Plus gros fichier |
| --- | ---: | --- | ---: | ---: |
| Photographies WebP | 29 | 960 × 640 | 1 627 326 octets | 69 532 octets |
| Miniatures WebP | 15 | 320 × 213 | 114 710 octets | 8 964 octets |
| Ensemble du lot | 44 fichiers | — | **1 742 036 octets**, environ 1,74 Mo | — |

Les photographies sont dans `public/images/exercises/v3/` et les nouvelles miniatures dans `public/images/exercises/thumbnails/`. Sharp assure redimensionnement et encodage, sans modification du contenu des images. Les chemins, dimensions, poids, origines et SHA-256 sont dans [assets.json](assets.json). Les 19 fichiers de médias antérieurs, comprenant les cinq pilotes, gardent leurs empreintes.

**Intégration réutilisée.** Aucun nouveau composant de galerie ou moteur 3D. Le même déclencheur de miniature, le même dialogue, les quatre sections de fiche et `ExercisePhotoGallery` servent le nouveau lot. Le périmètre explicite passe des cinq pilotes aux cinq pilotes + quinze nouvelles références. Les deux anciennes photos hors pilotes conservent leur présentation existante.

Les grandes photos restent côté registre serveur et arrivent à l’ouverture de la fiche ; une seule image est montée dans la galerie. Les cartes utilisent l’index léger et les miniatures. Le cadre réserve son ratio et les photos restent en `contain`, sans déformation. Les photographies manquantes gardent le repli existant. Le gainage fournit un `staticPositionImage` unique ; aucun couple Départ/Arrivée n’est fabriqué.

Les guides existants du développé couché barre, des tractions et du gainage restent prioritaires et inchangés. Douze compléments techniques FR/EN/AR couvrent les variantes photographiées auparavant sans guide complet. Les résumés musculaires reprennent exclusivement les rôles, noms et limitations des configurations anatomiques existantes. Le visualiseur, ses mappings, couleurs, modèle, contrôles et traductions sont inchangés.

**Conservation des fonctionnalités.** L’audit vérifie le catalogue et les sept enregistrements médias antérieurs, les empreintes de leurs fichiers, l’absence de modification des composants Musculation, actions, calculs, schéma et code anatomique. Il compare également les fonctions de lecture de performances, de résolution d’identité et de chargement du catalogue au commit de départ : elles sont identiques.

Dans Edge, une séance locale de quinze exercices est réellement rendue par `SessionLogger`. Les champs sont modifiés à 32,5 kg et 9 répétitions, puis une série est validée. Après ouverture de la miniature, changement de position, lecture des sections, accès au 3D imbriqué et fermeture, le JSON complet du brouillon est identique, avec l’ordre, les valeurs, la validation et `startedAt`. Focus et défilement sont restaurés. Sur la dernière passe, le repos passe de `1:31` à `1:28` pendant 2,562 s de consultation. Les tests des pilotes confirment aussi la durée de séance, les réouvertures et les commandes de séries/réorganisation. Aucune écriture REST n’est observée.

**Vérifications exécutées.**

- `npx --no-install tsc --noEmit` : réussi.
- `npm run lint` : réussi, sans erreur ni avertissement.
- `npm run build` : réussi ; la compilation normale est rétablie après la campagne avec fixtures.
- `git diff --check` : réussi.
- Neuf suites Node : **167 tests réussis**, aucun échec. [Sortie complète](unit-tests.txt).
- `node scripts/exercise-media-v3-audit.mjs --bundles` : catalogue, anciennes photos, métier, requêtes, mappings et découpage serveur/client préservés.
- `node scripts/performance-browser.mjs --production --exercise-media-v3` : **299 cas de présentation**, dont 200 pour le lot V3 et 99 pour les cinq pilotes, plus contrôles fonctionnels.
- V3 : les 15 exercices × FR/EN/AR × clair/sombre × 320/1440 px, les 15 à 768 px en arabe sombre, puis cinq cas à 390/430 px. Les contrôles existants couvrent aussi les dialogues en séance sur les trois langues et plusieurs tailles.
- Bibliothèque, programme, miniatures, correspondance des identifiants, positions distinctes, cas statique, boutons, tactile LTR/RTL, clavier, repli/reprise après image bloquée, mode système clair/sombre et réduction des animations : réussis.
- Zéro erreur JavaScript et zéro écriture REST sur la campagne finale. [Résultats complets](browser-results.json), [cas V3 et séance](browser-cases.json), [régression des pilotes](pilot-regression.json).

**Mesures de chargement.** Tailles des fichiers JavaScript initiaux uniques à partir des manifests, gzip appliqué par fichier. Ces mesures de build ne sont pas des temps de chargement sur réseau 4G ou sur téléphone physique.

| Route | Avant, octets gzip | Après, octets gzip | Écart |
| --- | ---: | ---: | ---: |
| `/dashboard` | 301 524 | 301 524 | 0 |
| `/sport` | 303 884 | 303 884 | 0 |
| `/sport/musculation` | 339 228 | 340 465 | +1 237 |
| `/sport/exercises` | 309 593 | 309 593 | 0 |
| `/sport/exercises/[key]` | 314 310 | 315 103 | +793 |

Les [mesures avant](before-build.json), [après](after-build.json), l’[audit 3D](bundle-audit.json) et l’[audit du contenu V3](copy-bundle-audit.json) couvrent 13 routes. Aucun moteur Three.js, détail anatomique ou bloc complet de techniques/photos V3 n’entre dans leur JavaScript initial. Le chunk moteur reste différé et inchangé, à 162 125 octets gzip. Le test réseau de la bibliothèque observe uniquement les miniatures, sans téléchargement des grandes photos. Aucune dépendance ajoutée.

**Captures Light/Dark et séance demandée.** **47 captures WebP** de l’application sont conservées dans [SCREENSHOTS.md](SCREENSHOTS.md), dont une vue claire et sombre pour chacun des quinze exercices.

- [Séance et galerie ouvertes, clair](screenshots/v3-session-gallery-light.webp).
- [Séance et galerie ouvertes, sombre](screenshots/v3-session-gallery-dark.webp).
- [Nouvelles miniatures en séance, clair](screenshots/v3-session-thumbnails-light.webp).
- [Nouvelles miniatures en séance, sombre](screenshots/v3-session-thumbnails-dark.webp).
- [Curl marteau, arabe sombre à 320 px](screenshots/v3-strength-curl-marteau-ar-dark-320.webp).
- [Gainage et position de maintien unique](screenshots/v3-strength-gainage-planche-light-desktop.webp).

Ce sont des captures de l’interface réelle, avec données de test et authentification locale fictive, et non des maquettes générées ou un compte Production.

**Fichiers modifiés et créés.** La [liste complète](CHANGES.md) inclut code, 44 médias et documents. Le registre actualisé est dans `src/lib/exercises/media-registry.ts`, alimenté par les nouvelles données de `media-v3-content.ts`. `after-inventory.json` exporte les 22 entrées réellement actives.

| Périmètre | Fichiers |
| --- | --- |
| Nouveaux contenus du lot | `src/lib/exercises/media-v3-index.ts`, `media-v3-content.ts` |
| Registre et accès à la fiche | `media-registry.ts`, `media-thumbnails.ts`, `media-experience.ts`, `visual-media-types.ts`, `data.ts` |
| Adaptations des composants partagés | `exercise-thumbnail.tsx`, `exercise-guide-dialog.tsx`, `exercise-detail.tsx` : ouverture de la présentation existante sur le lot explicite |
| Préparation/audit/rapport | `scripts/prepare-exercise-media-v3.mjs`, `exercise-media-v3-audit.mjs`, `exercise-media-v3-report.mjs` |
| Tests ciblés | `scripts/exercise-media-v3.test.mjs`, `exercise-media-v3-browser-checks.mjs` |
| Adaptation des contrôles existants | `scripts/exercise-media.test.mjs`, `exercise-library.test.mjs`, `performance-browser.mjs` |
| Médias et preuves | `public/images/exercises/v3/`, nouvelles miniatures et `docs/exercise-visual-library-v3/` |

**Limites et prochain lot.** La revue visuelle reste soumise à validation utilisateur. Les vues fixes ne représentent pas toute la trajectoire ; les variantes et appuis sont décrits dans chaque fiche. Aucun mouvement animé ou vidéo n’est ajouté. Les essais ont été réalisés dans Edge headless avec viewports et thèmes simulés ; Safari iOS, un téléphone physique, une connexion 4G réelle et une revue biomécanique professionnelle restent à vérifier. Les 48 références restantes gardent leur affichage de remplacement.

Le [prochain lot proposé](NEXT_BATCH.md) commence par les sept exercices encore sans photo dans les programmes fournis, puis complète la diversité avec les fessiers et avant-bras. Aucune image de ce prochain lot n’a été produite. Le travail s’arrête ici pour validation des quinze références actuelles.
