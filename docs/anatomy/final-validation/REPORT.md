# Validation finale — visualiseur du rowing unilatéral

**Validation technique locale réussie sous Edge.** Les essais emploient un vrai contexte WebGL2 avec GPU logiciel, une émulation tactile et un serveur Auth/REST local. Ils ne remplacent pas des essais sur un téléphone physique.

Branche vérifiée : `track-perso-sport-premium-lot-a`. `main` et `HEAD` restent à `742b0f6fe65475381ae483a60e0f4fee0df9d91e`. Aucun commit, push, déploiement, migration ou modification de données Supabase.

## Résultats des sept contrôles

| Point demandé | Résultat | Preuve et portée |
| --- | --- | --- |
| Modèle masculin et couleurs | Validé dans Edge | GLB masculin authentifié par son hash, 221 maillages chargés et rendu inspecté en clair/sombre. Principal rouge, secondaires verts, stabilisateurs orange, autres zones neutres. |
| Rotation tactile, zoom, avant/arrière | Validé en émulation | Événements tactiles à un doigt, pincement à deux doigts, souris et boutons. Vues avant/arrière, bornes de zoom et réinitialisation vérifiées sur la position réelle de la caméra. |
| Zones, noms et explications | Correspondance technique validée | Les 17 clés configurées correspondent à 34 maillages gauche/droite du GLB et à sa table anatomique. Clic sur un vrai maillage du grand dorsal ; sélection des neuf groupes et comparaison de leurs noms/explications FR/EN/AR avec le contenu documentaire. |
| Crédits, CC BY-SA 4.0, adaptations | Présents et accessibles | Crédits visibles, notices locales servies avec statut 200, licence complète, auteurs et adaptations amont. Mention Track Perso et lien vers sa provenance ajoutés au panneau, dans les trois langues. |
| Performances mobiles | Mécanismes vérifiés ; mesures matérielles restantes | Chargement différé, absence du GLB avant ouverture, rendu arrêté à l’arrêt et hors vue, contexte détruit à la fermeture. Poids détaillé ci-dessous. Aucun FPS de téléphone ou débit 4G réel n’est revendiqué. |
| Séries, charges, brouillon, minuteur | Validé avec données QA locales | Brouillon complet identique avant/après, même champ de séance conservé et focus restitué. Séries, charges, répétitions et validation inchangées. Minuteur poursuivi sans pause ni remise à zéro. Aucune lecture de table ni écriture Supabase à l’ouverture. |
| Captures clair/sombre | Préparées | Nouvelles captures mobiles, desktop, crédits, RTL, groupe profond et fallback dans ce dossier. |

Le compte à rebours observé est passé de **1:31 à 1:09 en 21,567 secondes** pendant le contrôle du dialogue. L’écart d’arrondi est compatible avec l’affichage à la seconde ; il n’y a pas de pause ou de redémarrage constaté.

## Crédits : amélioration apportée pendant le contrôle

Le contrôle a trouvé les attributions et la licence déjà présentes. Les modifications d’affichage propres à Track Perso étaient décrites dans `SOURCE.json` et la documentation, sans mention directe dans le panneau.

Deux fichiers d’interface ont été ajustés :

- `src/lib/anatomy/copy.ts` : mention d’adaptation et intitulé du lien, en FR/EN/AR.
- `src/components/sport/anatomy/exercise-muscle-dialog.tsx` : affichage de cette mention et lien vers `/models/anatomy/SOURCE.json`.

La mention française est : « Adaptation d’affichage Track Perso : couleurs et cadrage ; géométrie du fichier conservée. » Elle décrit les changements de matériaux et de cadrage réellement appliqués. La géométrie du GLB n’a pas été modifiée.

La source est l’[atlas Fit Mit With](https://github.com/slfresh/fitmitwith-anatomy-atlas/tree/4120ee68b6604b8f2f69105d6de6166fad4734c4), basé sur Z-Anatomy / BodyParts3D. Les notices distinguent les adaptations amont et celles de notre affichage. Les crédits détaillés, notamment Kousaku Okubo et Gauthier Kervyn, restent accessibles depuis les notices liées. Références : [attribution amont figée](https://github.com/slfresh/fitmitwith-anatomy-atlas/blob/4120ee68b6604b8f2f69105d6de6166fad4734c4/ATTRIBUTION.txt), [licence CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

Un contrôle d’empreintes sur 18 fichiers confirme que le modèle, le moteur et le composant des séries sont inchangés pendant cette validation. Seuls les deux fichiers d’interface cités ont changé dans ce périmètre ; les autres modifications concernent les scripts QA et ce rapport/captures. Les actions, calculs de force, schémas et gates conservent leur contenu.

## Poids et chargement

| Ressource | Poids constaté |
| --- | ---: |
| Modèle GLB complet, sans texture externe | **2 545 068 octets — 2,43 Mio** |
| Dossier complet de l’atlas, avec métadonnées et notices | 2 643 742 octets — 2,52 Mio |
| Fichier moteur Three.js différé | 650 810 octets bruts ; **160 757 octets gzip — environ 157 Kio** |

Le dossier complet n’est pas téléchargé automatiquement à l’ouverture : le visualiseur charge le GLB ; les notices sont consultées par leurs liens. Le modèle contient **128 917 triangles, 64 819 sommets et aucune texture/image**. SHA-256 inchangé : `d80bebc4045069b660ca8e7afe599d76d15ccc7d96410b3727c600ef01d24e54`.

Le nouvel audit confirme l’absence des implémentations Three.js dans le JavaScript initial des **13 routes mesurées**, notamment Dashboard et Nutrition. Le surcoût initial total du pilote sur Musculation reste d’environ **0,5 Kio gzip : +505 octets** par rapport au build de référence précédant son intégration. Ces chiffres proviennent des artefacts de build ; ils ne constituent pas une mesure du transfert total ou du temps de chargement sur réseau mobile.

Le ratio de pixels reste plafonné à 1,5. La scène n’effectue pas de rendu continu à l’arrêt, se suspend lorsqu’elle est masquée et libère son contexte à la fermeture. Le fallback a été testé après perte réelle du contexte et lorsque WebGL est forcé indisponible.

Preuves : [mesure du build normal](./build-metrics.json), [audit des fichiers initiaux et différés](./bundle-audit.json).

## Tests et preuves

- `node scripts/performance-browser.mjs --production --anatomy-only` : succès, **24 combinaisons FR/EN/AR × clair/sombre × 320/390/430/1440 px**, plus System, gestes tactiles, sélection, crédits, brouillon/minuteur et fallbacks.
- `node --test scripts/anatomy.test.mjs scripts/exercise-library.test.mjs scripts/sport-hub.test.mjs scripts/design-system.test.mjs scripts/performance.test.mjs` : **39 tests réussis**.
- `npx --no-install tsc --noEmit`, `npm run lint`, `npm run build`, `git diff --check` : succès, lint sans avertissement.
- Audit du moteur différé sur le build normal : succès. Le build habituel a été rétabli après les essais avec fixtures.
- Aucune erreur console inattendue ni écriture observée dans la campagne. Les tables Calisthenics/Running désactivées ne sont pas interrogées.

[Rapport navigateur détaillé](./browser-results.json) : positions de caméra et interactions vérifiées par le script, neuf groupes contrôlés, état du minuteur avant/après et résultats des 24 combinaisons.

## Captures préparées

| Vue | Clair | Sombre |
| --- | --- | --- |
| Mobile 390 px | [Capture](./anatomy-fr-light.webp) | [Capture](./anatomy-fr-dark.webp) |
| Desktop, modèle et explication visibles | [Capture](./anatomy-desktop-light.webp) | [Capture](./anatomy-desktop-dark.webp) |
| Crédits, licence et adaptations | [Capture](./anatomy-credits-light.webp) | [Capture](./anatomy-credits-dark.webp) |
| Arabe RTL | [Capture](./anatomy-ar-light.webp) | [Capture](./anatomy-ar-dark.webp) |

Autres vues : [rhomboïdes et couches profondes](./anatomy-rhomboids.webp), [fallback 2D explicite](./anatomy-fallback.webp). Les captures représentent le rendu WebGL réel ou, lorsque signalé, le fallback ; aucune maquette statique n’a remplacé le modèle durant les tests.

## Limites à conserver avant publication

**Sur téléphone réel :** vérifier la précision des gestes avec les doigts, les conflits de défilement du panneau, la fluidité/FPS, les temps de première ouverture en 4G et à froid, la mémoire GPU, la chauffe et la batterie sur les téléphones ciblés, notamment Safari/iOS. Vérifier les ouvertures répétées, l’arrière-plan/retour à l’application, la rotation de l’écran et le minuteur pendant ces transitions.

La campagne utilise des données Auth/REST locales. Un essai avec une séance réelle et les règles Supabase/RLS de l’environnement cible reste distinct ; aucune base réelle n’a été utilisée pour ces interactions QA.

**Anatomie :** la concordance technique maillage → identifiant → nom/explication est vérifiée. Elle ne certifie pas la justesse clinique de la géométrie ou de la classification des rôles. Le fournisseur signale l’absence de revue spécialisée ; la validation pédagogique par un professionnel reste à compléter.

**Sélection en profondeur :** les surfaces atténuées à 0,12 sont ignorées par la sélection 3D, qui retient une surface opaque identifiée. La liste reste nécessaire pour sélectionner certains groupes masqués ou profonds. Cette limite évite d’attribuer un nom arbitraire à une structure cachée.

Le prototype reste limité au rowing haltère unilatéral. Aucun autre visualiseur d’exercice n’est activé par ce contrôle.
