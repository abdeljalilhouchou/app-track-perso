# Anatomy 3D Premium V2 — rowing haltère unilatéral

La V2 améliore le visualiseur existant avec un cadrage rapproché, un éclairage plus lisible et un panneau mobile compact. Elle reste limitée au rowing haltère unilatéral. Le modèle masculin, ses maillages, ses métadonnées et les données d’entraînement sont conservés.

Branche : `track-perso-sport-premium-lot-a`. `main` et `HEAD` restent à `742b0f6fe65475381ae483a60e0f4fee0df9d91e`. Aucun commit, déploiement, migration ou changement Supabase. Les travaux antérieurs non commités restent présents.

## Améliorations du rendu

- Vue arrière et haut du corps affichés par défaut, de la tête au haut des cuisses. Les jambes restent dans le modèle ; elles sont simplement hors cadrage dans cette vue.
- Cadrage calculé selon les dimensions du visualiseur, avec mise à l’échelle uniforme du modèle et marges autour de la tête et des mains. La commande **Corps entier** recadre l’atlas complet en conservant son orientation. **Réinitialiser** revient au cadrage arrière rapproché.
- Éclairage de studio avec une lumière principale, un éclairage de contour, un complément et une lumière hémisphérique. Exposition réduite et matériaux ajustés pour mieux révéler les reliefs existants.
- Rouge pour le principal, vert pour les secondaires, orange pour les stabilisateurs et gris pour les autres zones. Le libellé orange clair utilise une teinte plus sombre pour rester lisible ; les couleurs du maillage gardent leur saturation.
- La sélection reste visible lorsque les couleurs sont désactivées. Son accent lumineux apparaît en 180 ms ; les transitions de caméra durent 280 ms. Aucune animation permanente. Les animations et transitions sont désactivées avec `prefers-reduced-motion`.

Une projection indépendante des centres des triangles du grand dorsal droit compare les deux cadrages à largeur identique : **34,74 px en V1 → 59,31 px en V2, soit +70,7 %** dans la configuration mobile testée. Cela mesure le grossissement à l’écran, pas une modification anatomique. Les diagnostics des 36 configurations confirment que la boîte du cadrage initial reste dans l’image : [audit de cadrage](./framing-audit.json).

## Interface et interactions

L’en-tête affiche le nom de l’exercice, Dos, Haltère/Banc et le niveau indicatif. Les quatre onglets Muscles, Technique, Erreurs et Conseils sont conservés. Les commandes de rotation, zoom et réinitialisation sont placées sur le bord de la scène, avec des cibles d’au moins 44 px. Les vues avant, arrière et corps entier sont regroupées sous la scène.

Le panneau natif conserve son défilement interne, sa fermeture fixe, son agrandissement et la restitution du focus à la fermeture. La scène est agrandie en portrait et réduite sur les écrans courts/paysage. Le glissement à un doigt tourne le modèle ; le pincement le rapproche. Le défilement du panneau reste disponible en dehors du canvas. Les boutons de zoom cumulent leur destination lors d’appuis rapides, même si la transition précédente n’est pas terminée.

Les neuf groupes affichent leur nom, leur catégorie, leur action pendant le tirage et une courte explication. La liste est regroupée en principaux, secondaires et stabilisateurs. FR/EN/AR, RTL, Light/Dark/System et le fallback 2D explicite sont conservés. Les textes d’action résument les explications existantes.

## Anatomie et licence

Le contrôle indépendant confirme **17 clés anatomiques correspondant à 34 structures gauche/droite** dans le fichier réel. Les moteurs sont colorés du côté travaillé ; la stabilisation du tronc reste bilatérale. Aucun nouveau muscle ni pourcentage d’activation n’est ajouté. Voir le [registre et le mapping complet](../ASSET_REGISTRY.md).

Le GLB masculin conserve son SHA-256 : `d80bebc4045069b660ca8e7afe599d76d15ccc7d96410b3727c600ef01d24e54`. Il contient **221 maillages, 128 917 triangles, 64 819 sommets et aucune texture/image**.

Les crédits Fit Mit With / Z-Anatomy / BodyParts3D, les attributions amont et la licence complète restent accessibles depuis le panneau. La mention d’adaptation précise désormais les couleurs, matériaux, éclairage et cadrage, avec géométrie conservée, dans les trois langues. `SOURCE.json` et le script de récupération décrivent les mêmes adaptations. Les notices locales ont répondu avec le statut 200 pendant les tests.

Sources primaires vérifiées : [attribution amont figée](https://github.com/slfresh/fitmitwith-anatomy-atlas/blob/4120ee68b6604b8f2f69105d6de6166fad4734c4/ATTRIBUTION.txt), [licence CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), [variante avec appui décrite par ACE](https://www.acefitness.org/resources/everyone/exercise-library/126/single-arm-row/). La référence ACE étaye la variante et ses consignes générales ; elle ne certifie pas la classification détaillée des neuf groupes.

## Performances avant/après

Les poids JavaScript ci-dessous proviennent des builds normaux, avec addition des gzip par fichier. Ils ne mesurent pas le transfert réseau ni la vitesse sur téléphone. Référence V1 : dernière validation technique ; mêmes dépendances, aucune nouvelle bibliothèque.

| Ressource | V1 | V2 | Variation |
| --- | ---: | ---: | ---: |
| GLB complet | 2 545 068 octets | 2 545 068 octets | 0 |
| Moteur différé, brut | 650 810 octets | 653 908 octets | +3 098 |
| Moteur différé, gzip | 160 757 octets | 161 794 octets | +1 037, environ 1 Kio |
| JS initial Dashboard, gzip | 300 216 octets | 300 216 octets | 0 |
| JS initial Nutrition, gzip | 322 429 octets | 322 429 octets | 0 |
| JS initial Sport Hub, gzip | 302 563 octets | 302 563 octets | 0 |
| JS initial Musculation, gzip | 326 697 octets | 326 698 octets | +1 |
| JS initial Bibliothèque, gzip | 303 860 octets | 303 860 octets | 0 |
| JS initial Fiche exercice, gzip | 307 022 octets | 307 022 octets | 0 |

L’implémentation Three.js reste absente du JavaScript initial des **13 routes mesurées**. Aucun GLB n’est demandé sur Dashboard, Nutrition ou Musculation avant l’ouverture du pilote. Le chargement du moteur, du dialogue et du modèle reste différé. Preuves : [avant](./before-build.json), [après](./after-build.json), [audit du moteur différé](./bundle-audit.json).

Le DPR maximal passe de **1,5 à 2**, avec un plafond de **1 200 000 pixels**, en respectant aussi les dimensions maximales de texture, de renderbuffer et de viewport fournies par WebGL. Sur le viewport simulé 390 × 844 à DPR appareil 3, le rendu est plafonné à DPR 2, soit un canvas de **708 × 877 pixels**. La netteté accrue peut augmenter le coût GPU par image ; aucune baisse de consommation matérielle n’est affirmée.

Aucune shadow map, texture d’environnement ou passe de post-traitement n’est ajoutée. Les reliefs proviennent de l’éclairage et des normales existantes. Les attributs/index géométriques représentent **2 329 158 octets** ; ce chiffre exclut les autres allocations JavaScript et GPU. Le compteur d’une texture du moteur correspond à sa petite table interne DFG de 16 × 16, générée localement par Three.js, sans téléchargement ; le modèle ne contient toujours aucune texture.

Le rendu reste déclenché par les interactions et s’arrête au repos, hors vue et lorsque l’onglet est masqué. À la fermeture : requête annulée, animations arrêtées, observateurs/écouteurs retirés, contrôles, géométries et matériaux libérés, contexte WebGL détruit. Le contrôle a vérifié la perte du contexte et l’absence de canvas après fermeture, y compris sur trois cycles supplémentaires.

Mesure CDP du tas JavaScript après GC forcé, sous Edge avec GPU logiciel : **4,77 Mio avant la première ouverture**, **7,56 Mio après la première fermeture**, puis **7,61 / 7,72 / 7,74 Mio** après trois réouvertures. Les modules chargés restent en mémoire. Ces valeurs n’indiquent pas toute la mémoire GPU et trois cycles ne prouvent pas l’absence de toute fuite à long terme. [Résultats navigateur et diagnostics](./browser-results.json).

## Vérifications exécutées

- `npx --no-install tsc --noEmit` : succès.
- `npm run lint` : succès, sans avertissement.
- `npm run build` : succès ; build habituel restauré après le build avec fixtures QA.
- `git diff --check` : succès.
- `node --test --test-reporter=dot scripts/anatomy.test.mjs scripts/exercise-library.test.mjs scripts/sport-hub.test.mjs scripts/design-system.test.mjs scripts/performance.test.mjs` : **39 tests réussis**.
- `node scripts/performance-browser.mjs --production --anatomy-only` : **36 configurations réussies**, FR/EN/AR × clair/sombre × largeurs 320/390/430/1440, plus 320 × 568 et 568 × 320. Tests supplémentaires System, mouvement réduit, DPR 3, souris, gestes tactiles simulés, pincement, limites du zoom, avant/arrière/corps entier/reset, sélection d’un vrai maillage et des neuf groupes, descriptions/catégories/actions traduites, panneau agrandissable et crédits.
- Fallback testé sans WebGL et après perte réelle du contexte. Le bouton reste absent sur le curl, hors pilote.
- Brouillon complet identique avant/après, mêmes champs de séance et focus restitué. Le repos passe de **1:31 à 0:29 en 61,622 secondes**, sans pause ni réinitialisation. Aucune lecture de table ou écriture Supabase à l’ouverture du visualiseur ; aucune écriture dans toute la campagne locale.
- Vérification d’empreintes de **51 fichiers protégés**, dont le GLB, les séries, les actions, les migrations, les calculs et les gates : inchangés pendant la V2. Les tables de disciplines désactivées ne sont pas interrogées.

Les essais Edge utilisent un vrai rendu WebGL2 avec GPU logiciel et des données Auth/REST de test sur localhost. Aucun smartphone physique et aucune base Supabase réelle n’ont été utilisés. Aucune erreur console inattendue constatée.

## Captures du rendu réel

| Vue | Clair | Sombre |
| --- | --- | --- |
| Mobile, cadrage arrière initial | [Capture](./anatomy-fr-light.webp) | [Capture](./anatomy-fr-dark.webp) |
| Desktop, modèle et explication | [Capture](./anatomy-desktop-light.webp) | [Capture](./anatomy-desktop-dark.webp) |
| Vue avant | [Capture](./anatomy-front-light.webp) | [Capture](./anatomy-front-dark.webp) |
| Corps entier | [Capture](./anatomy-full-body-light.webp) | [Capture](./anatomy-full-body-dark.webp) |
| Informations musculaires | [Capture](./anatomy-information-light.webp) | [Capture](./anatomy-information-dark.webp) |
| Arabe RTL | [Capture](./anatomy-ar-light.webp) | [Capture](./anatomy-ar-dark.webp) |
| Crédits et adaptations | [Capture](./anatomy-credits-light.webp) | [Capture](./anatomy-credits-dark.webp) |

Autres captures : [rhomboïdes et couches atténuées](./anatomy-rhomboids.webp), [fallback explicitement 2D](./anatomy-fallback.webp). Les 16 images sont issues d’Edge, puis compressées en WebP ; aucune image générée ne remplace le rendu testé. La capture Corps entier conserve ici la vue avant sélectionnée juste auparavant.

## Fichiers modifiés pour la V2

| Fichier | Modification |
| --- | --- |
| `src/components/sport/anatomy/anatomy-engine.ts` | Caméra responsive, cadrages, éclairage, matériaux, transitions, zoom cumulé, budgets et diagnostics GPU. |
| `src/lib/anatomy/rowing.ts` | Palette, commande corps entier et limites de caméra/rendu ; mapping inchangé. |
| `src/components/sport/anatomy/muscle-viewer-3d.tsx` | Commandes flottantes et choix des vues. |
| `src/components/sport/anatomy/exercise-muscle-dialog.tsx` | En-tête et présentation du panneau. |
| `src/components/sport/anatomy/muscle-information-panel.tsx` | Action explicite, catégorie et groupes dans la liste. |
| `src/components/sport/anatomy/anatomy.css` | Présentation, tailles adaptatives, contraste et micro-animations. |
| `src/lib/anatomy/copy.ts` | Nouveaux libellés et résumés d’action FR/EN/AR, mention d’adaptation enrichie. |
| `public/models/anatomy/SOURCE.json` | Description précise des adaptations d’affichage. |
| `scripts/fetch-anatomy-model.mjs` | Même description de provenance lors d’une récupération future. Aucun téléchargement exécuté pour cette V2. |
| `scripts/anatomy.test.mjs` | Complétude des nouveaux textes d’action. |
| `scripts/anatomy-browser-checks.mjs` | Contrôles V2, cadrage, tailles courtes, rôle/action, mémoire, ouvertures répétées et captures. |
| `docs/anatomy/ASSET_REGISTRY.md` | Documentation du cadrage et des adaptations V2. |

Créés : ce rapport et les preuves dans `docs/anatomy/v2/` : mesures avant/après, audit des bundles, diagnostics navigateur/cadrage, empreintes de préservation et captures. Aucun fichier de suivi sportif, autre guide d’exercice, dépendance ou schéma n’est modifié pour cette V2.

## Limites et suites possibles

**Rendu :** l’atlas mobile a été décimé et lissé en amont. Il n’a pas de textures fines, de fibres détaillées, de squelette animé ni de pose de rowing. Certaines séparations de maillages et irrégularités restent visibles. L’éclairage améliore les volumes présents ; un rendu photoréaliste comparable à une illustration détaillée nécessiterait une autre source ou un travail de modèle, avec droits et compatibilité à vérifier avant intégration.

**Anatomie :** le fournisseur signale l’absence de revue spécialisée. La correspondance technique est contrôlée ; une validation anatomique/pédagogique professionnelle reste nécessaire. Les surfaces atténuées sont ignorées par le raycast pour éviter les sélections ambiguës : certains muscles profonds se sélectionnent dans la liste.

**Téléphones réels :** vérifier Safari/iOS et Android ciblés, précision des doigts, conflits de défilement, fluidité, première ouverture en 4G, mémoire GPU, chauffe/batterie, changement d’orientation, passage en arrière-plan et cycles prolongés. Une séance réelle avec Supabase/RLS de l’environnement cible reste également à essayer, sans modification de schéma.

Pour une généralisation future : conserver une configuration explicite par variante et identifiant de guide, faire valider les rôles/traductions, mesurer le budget sur les appareils ciblés et maintenir une provenance/licence par modèle. La V2 n’active aucun autre exercice et n’entame pas cette généralisation.
