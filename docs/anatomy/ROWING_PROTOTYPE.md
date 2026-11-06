# Prototype premium — muscles du rowing unilatéral

Le pilote est intégré au système existant, uniquement pour **Rowing haltère unilatéral**. Il utilise un vrai atlas masculin GLB, des muscles nommés et une sélection par raycasting. Les visuels sportifs du rowing et des pompes montrent maintenant des hommes ; le curl présentait déjà un homme.

Travail sur `track-perso-sport-premium-lot-a`, en conservant les modifications des lots précédents. `main` et `HEAD` restent à `742b0f6fe65475381ae483a60e0f4fee0df9d91e`. Aucun commit, push, déploiement, migration ou changement de données Supabase. Les fichiers d’environnement ne sont pas modifiés.

## Fonctionnement livré

Dans une séance contenant le rowing reconnu, le bouton **Muscles ciblés** ouvre un panneau natif. Sur smartphone, il se présente en bottom sheet scrollable et agrandissable ; sur desktop, en dialogue. Un second accès existe sur la fiche documentée du rowing, y compris depuis le dialogue de consultation déjà intégré aux programmes et à l’historique.

Le visualiseur offre :

- Rotation à un doigt, à la souris et par boutons.
- Vues avant/arrière, zoom à deux doigts et boutons, remise à zéro.
- Zoom borné et inclinaison limitée ; aucun déplacement latéral permettant de perdre le corps hors écran.
- Côté travaillé gauche/droit, couleurs activables et légende immédiatement sous le modèle.
- Sélection d’un muscle coloré dans le vrai maillage ou dans une liste accessible.
- Nom, rôle et explication FR/EN/AR ; lecture RTL et thèmes Light/Dark/System.
- Atténuation des couches voisines pour repérer les groupes profonds.
- Onglets Muscles, Technique, Erreurs et Conseils, avec navigation clavier.
- Fermeture, retour du focus, état de chargement, reprise et fallback 2D explicite si WebGL échoue.

Les valeurs des séries, leur validation, le brouillon et le minuteur restent gérés par les composants existants. Le visualiseur ne contient aucun appel Supabase. Son ouverture n’interroge pas les tables et ne déclenche aucune écriture. Les actifs publics de l’atlas sont exclus du proxy de session, avec vérification que les pages de l’application restent couvertes par son matcher.

## Architecture et bibliothèques

**Three.js 0.187.0** et **@types/three 0.187.0** sont installés avec versions exactes. Le rendu impératif reste isolé dans un contrôleur, avec un cycle de vie React limité à l’ouverture/fermeture et aux changements de réglages.

React Three Fiber et Drei ont été examinés. La documentation actuelle de Fiber associe sa version 9 à React 19. Three.js direct a été retenu pour conserver un contrôleur autonome et un rendu déclenché par les interactions. Fiber et Drei ne sont pas ajoutés. La compatibilité retenue a été vérifiée par TypeScript, le build et le vrai rendu WebGL dans Edge.

| Fichier | Responsabilité |
| --- | --- |
| `src/lib/anatomy/pilots.ts` | Identité stable du pilote et correspondances explicites |
| `src/lib/anatomy/rowing.ts` | Mapping des meshes, rôles, couleurs, côté travaillé et limites caméra |
| `src/lib/anatomy/copy.ts` | Libellés et explications anatomiques FR/EN/AR chargés avec le dialogue |
| `exercise-muscle-button.tsx` | Accès conditionnel et import dynamique du dialogue |
| `exercise-muscle-dialog.tsx` | Panneau natif, agrandissement, onglets et état de sélection |
| `muscle-viewer-3d.tsx` | Chargement client du moteur, thème/réduction du mouvement, contrôles et repli |
| `anatomy-engine.ts` | GLTFLoader, scène Three.js, OrbitControls, matériaux, raycasting et destruction |
| `muscle-information-panel.tsx` | Légende, liste accessible et explications du groupe sélectionné |
| `anatomy-fallback.tsx` | Repères 2D originaux, vues avant/arrière et sélection textuelle |
| `anatomy.css` | Présentation du panneau, surfaces, contrastes, tactile et animations réduites |

Les composants sont dans `src/components/sport/anatomy/`. La configuration anatomique est séparée du moteur et des traductions, pour préparer une extension ultérieure. Aucun autre exercice ne reçoit un visualiseur fonctionnel.

Les textes techniques du rowing ont été déplacés dans `src/lib/exercises/rowing-guide.ts`, partagé avec le catalogue serveur existant. Leur contenu et leurs références sont conservés ; les sept autres fiches restent exclusivement dans le module serveur du catalogue.

## Identification du mouvement

La fiche documentée fournit le slug stable `one-arm-dumbbell-row`. Les anciens brouillons de musculation utilisent un identifiant de ligne généré et un nom d’exercice, sans clé étrangère stable vers le catalogue. Ils restent inchangés.

Dans ces brouillons, un petit résolveur reconnaît uniquement les noms canoniques explicites FR/EN/AR, après normalisation Unicode/casse/espaces, puis utilise le slug stable. Un groupe musculaire incompatible ou un nom comme « Rowing haltère », « Rowing barre » ou « Rowing haltère unilatéral incliné » ne l’active pas. Il n’y a ni recherche approximative ni modification d’identifiant existant.

## Atlas et droits

Le GLB masculin provient de **Fit Mit With**, basé sur Z-Anatomy / BodyParts3D, sous **CC BY-SA 4.0**. Révision source figée : `4120ee68b6604b8f2f69105d6de6166fad4734c4`.

Le fichier intégré fait **2 545 068 octets (2,43 Mio)**, avec **221 meshes**, **128 917 triangles** et aucune texture. Son SHA-256 est vérifié contre la table source et dans les tests. La géométrie n’est pas modifiée ; les transformations de cadrage et matériaux sont appliqués à l’exécution.

Le [registre de l’asset](./ASSET_REGISTRY.md) indique le créateur/adaptateur, les sources, la licence, les attributions et les limites connues. Le dossier `public/models/anatomy/` contient le modèle, la table des muscles, la provenance, les notices amont et la licence Three.js MIT. Le dialogue donne accès aux crédits et licences. Aucun modèle commercial non autorisé n’est utilisé.

## Mapping, couleurs et sélection

- **Rouge** : grand dorsal du côté travaillé.
- **Vert** : rhomboïdes, trapèzes moyen et inférieur, deltoïde postérieur, biceps et autres fléchisseurs du coude du côté travaillé.
- **Orange** : paroi abdominale et stabilisateurs du rachis, bilatéraux.
- **Gris** : autres structures du modèle.

Les noms `extras.key` et côtés du GLB définissent les correspondances. Les 17 clés musculaires utilisées sont présentes dans de vrais meshes des deux côtés ; les portions du trapèze et du deltoïde restent distinctes. Le tableau complet figure dans le registre.

Le raycasting utilise le premier mesh opaque touché et sa métadonnée anatomique. Une zone non documentée ne produit aucune description supposée. Les groupes profonds peuvent être sélectionnés par la liste ; les couches voisines sont alors atténuées. Les couleurs sont accompagnées de textes et la sélection est aussi visible sur la liste.

Les explications concernent la variante avec une main et un genou sur banc. La trajectoire du coude et les appuis peuvent modifier les rôles. La validation par un professionnel de l’anatomie reste à compléter ; elle n’est pas déduite de la seule correspondance technique des identifiants.

## Caméra, gestes et accessibilité

OrbitControls gère la rotation à un doigt et le zoom à deux doigts dans une zone tactile dédiée. Le reste du panneau reste scrollable. Les boutons offrent les mêmes commandes principales au clavier et au clic.

La distance caméra reste entre 2,2 et 5,6 unités de scène, avec une valeur initiale de 3,7 et une inclinaison bornée. Les vues avant/arrière suivent les axes déclarés de l’asset : avant +Z, Y vertical. Les transitions contrôlées durent 240 ms et deviennent immédiates avec `prefers-reduced-motion`. Une interaction interrompt une transition en cours. Aucune rotation automatique permanente.

Le dialogue natif gère l’inertie de l’arrière-plan. Les accès et commandes principaux font au moins 44 px ; les onglets gèrent les flèches selon le RTL. La liste fournit une alternative aux petites zones anatomiques du dessin ou du modèle.

Le fallback 2D porte un message explicite. Il conserve vues avant/arrière, liste, sélection et explications, avec un schéma simplifié. Il ne simule pas une rotation 3D, et n’affiche pas de commandes tactiles 3D prétendument fonctionnelles dans ce mode.

## Performances et ressources

Le dialogue est importé à la demande, puis le moteur est importé côté client lorsque sa scène est créée. Aucun canvas ni GLB n’est demandé sur Dashboard, Nutrition ou les pages ordinaires avant ouverture.

Le moteur rend uniquement après chargement, redimensionnement, changement de réglage ou interaction. Il n’utilise pas de boucle permanente ni de damping nécessitant un rendu continu. Les scènes masquées/hors viewport sont suspendues. Le ratio de pixels est plafonné à 1,5 ; l’asset utilise un budget mobile sans textures.

À la fermeture : requête annulée si nécessaire, contrôles et observers retirés, géométries et matériaux détruits, renderer libéré, contexte WebGL perdu volontairement et canvas supprimé. Le test navigateur vérifie aussi `isContextLost()` après fermeture. L’URL du GLB est versionnée par hash et le chargement utilise le cache navigateur.

Mesure des fichiers JS initiaux du build normal, selon la méthode des lots précédents, en gzip par fichier :

| Route | Avant, Kio gzip | Après | Différence exacte |
| --- | ---: | ---: | ---: |
| `/dashboard` | 293,15 | 293,18 | +32 octets |
| `/nutrition` | 314,84 | 314,87 | +32 octets |
| `/sport` | 295,38 | 295,47 | +97 octets |
| `/sport/musculation` | 318,55 | 319,04 | +504 octets |
| `/sport/exercises` | 296,64 | 296,74 | +97 octets |
| `/sport/exercises/[key]` | 299,07 | 299,83 | +770 octets |

L’audit confirme l’absence du moteur Three.js dans le JavaScript initial des **13 routes mesurées**. Le fichier différé contenant les implémentations Three.js fait environ **157 Kio gzip** (160 757 octets), chargé à l’ouverture. Le dialogue et ses textes ont aussi leurs fichiers différés. Le GLB de 2,43 Mio s’ajoute uniquement à la première consultation selon le cache disponible.

Ces mesures concernent des artefacts de build, pas des temps de chargement sur un vrai téléphone ni un transfert 4G mesuré. Les gains des Lots A/B/C, charts différés et cache isolé par requête restent en place.

Preuves : [avant](./rowing-before.json), [après](./rowing-after.json), [audit des bundles](./bundle-audit.json).

## Tests exécutés

- `npx --no-install tsc --noEmit` : succès.
- `npm run lint` : succès sans avertissement.
- `npm run build` : succès ; build normal rétabli après les fixtures QA.
- `git diff --check` : succès.
- `node --test scripts/anatomy.test.mjs scripts/exercise-library.test.mjs scripts/sport-hub.test.mjs scripts/design-system.test.mjs scripts/performance.test.mjs` : **39 tests réussis**.
- `node scripts/performance-browser.mjs --production --anatomy` : campagne complète réussie sous Edge.
- `node scripts/audit-anatomy-bundles.mjs` : moteur absent du chargement initial des 13 routes, fichier différé réel trouvé.

Les tests unitaires couvrent le pilote strict, les identifiants de vrais meshes et leur hash, les côtés, les rôles non documentés, les trois langues, les notices et le vrai matcher Next.js. Les tests des lots précédents restent verts.

Edge utilise un vrai contexte **WebGL2 avec GPU logiciel**, pas une capture statique substituée au modèle. Contrôles vérifiés : rotation souris, rotation tactile à un doigt, pincement à deux doigts, boutons, vues avant/arrière, zoom borné, réinitialisation, clic sur un vrai mesh du grand dorsal, sélection d’un groupe profond, côté, couleurs, panneau agrandissable, onglets, arrêt du rendu à l’arrêt/masqué, minuteur, brouillon et séries conservés, focus restauré et contexte graphique libéré.

Matrice : **24 combinaisons FR/EN/AR × clair/sombre × 320/390/430/1440 px**, sans débordement. Contrôles supplémentaires System/réduction du mouvement, perte réelle du contexte WebGL, absence forcée de WebGL avec fallback utilisable, et absence du bouton sur un autre exercice.

Régression : **48 combinaisons de la bibliothèque** et **42 du Sport Hub**, navigation, filtres, graphiques différés, erreurs/reprise et brouillons. Aucune écriture Supabase, aucune requête vers les tables Calisthenics/Running désactivées, aucune erreur console inattendue. L’erreur React attendue du test 503 du Hub est isolée dans le rapport.

Les données Auth/REST sont des fixtures locales, dans un profil Edge jetable, sans contact avec une base Supabase réelle. Les tests réels sur smartphone, Safari/iOS, réseau 4G et règles RLS restent à effectuer.

Preuve complète : [rapport navigateur](./rowing-browser.json).

## Captures

- [Clair](./anatomy-fr-light.webp).
- [Sombre](./anatomy-fr-dark.webp).
- [Arabe RTL](./anatomy-ar-dark.webp).
- [Groupe profond](./anatomy-rhomboids.webp).
- [Fallback 2D explicite](./anatomy-fallback.webp).

## Fichiers créés et modifiés

Créés : `src/lib/anatomy/{pilots,rowing,copy}.ts`, les sept fichiers de `src/components/sport/anatomy/`, `src/lib/exercises/rowing-guide.ts`, les actifs et notices de `public/models/anatomy/`, `scripts/{fetch-anatomy-model,anatomy-browser-checks,anatomy.test,audit-anatomy-bundles}.mjs`, ce rapport, le registre, les mesures, l’audit JSON, le rapport navigateur et six captures dans `docs/anatomy/`.

Modifiés : `package.json`, `package-lock.json`, `src/proxy.ts`, `src/app/(app)/sport/layout.tsx`, `src/components/strength/session-logger.tsx`, `src/components/sport/exercises/exercise-detail.tsx`, `src/components/sport/ui/sport-icons.tsx`, `src/lib/exercises/guides.ts`, `src/lib/i18n/modules/exercise-library.ts`, `scripts/performance-browser.mjs`, `scripts/exercise-browser-checks.mjs`, les deux images rowing/pompes, leurs registres/prompts et les captures documentaires concernées.

Les actions serveur, schémas, anciennes migrations, calculs de force, gates, programmes, séries et sessions enregistrées ne sont pas modifiés. Aucun script SQL n’est nécessaire.

## État de validation

**Opérationnel** : modèle masculin 3D segmenté, interactions et intégration du pilote, repli 2D, thèmes/langues/RTL et contrôles navigateur décrits.

**À valider sur le terrain** : exactitude pédagogique par un professionnel, expérience tactile/GPU sur les téléphones cibles, Safari/iOS et connexion 4G réels, données Supabase/RLS réelles. Le modèle reste statique en position anatomique de repérage ; il ne prétend pas être une animation de la répétition sur banc.

**Ressource 3D disponible** : aucun blocage lié à l’absence d’un modèle segmenté dans cette version. L’extension aux autres exercices n’est pas commencée.
