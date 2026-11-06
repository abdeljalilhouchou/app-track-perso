# Médias des exercices — Lot D

Le registre détaillé [media-registry.json](./media-registry.json) contient les chemins, origines, auteurs, statut de licence, attributions, exercices correspondants, textes alternatifs FR/EN/AR, dimensions, poids et empreintes SHA-256. Les prompts exacts et chemins originaux figurent aussi dans [media-prompts.json](./media-prompts.json).

## Visuels intégrés

| Fichier dans `public/images/exercises/` | Mouvement précis | Dimensions | Poids |
| --- | --- | --- | --- |
| `one-arm-dumbbell-row.webp` | Homme : rowing haltère unilatéral avec appui sur banc | 960 × 640 | 50 120 octets |
| `push-up.webp` | Homme : pompe au sol, jambes tendues | 960 × 640 | 41 694 octets |
| `dumbbell-curl.webp` | Curl haltères debout, prise en supination | 960 × 640 | 27 420 octets |

Total actuel : **119 234 octets, soit 116,4 Kio**. Les trois visuels actifs montrent des hommes, conformément à la préférence utilisateur. Les éditions du rowing et des pompes sont documentées avec leurs prompts exacts dans [male-media-update.json](./male-media-update.json) ; les révisions précédentes sont conservées dans le registre.

Génération/édition par l’outil intégré `image_gen`, le 6 novembre 2026 ; pas de CLI ni d’utilisation d’une clé API du projet. Les sorties PNG ont été inspectées puis redimensionnées/encodées avec Sharp. Les originaux sont conservés au chemin de génération Codex, sans être référencés par l’application. Les WebP définitifs sont dans le dépôt.

Il s’agit de visuels générés par IA, signalés comme tels sur les fiches. Aucune photographie de tiers n’a été téléchargée ou copiée ; aucune licence Creative Commons, banque d’images ou autorisation d’un photographe n’est inventée. Le registre indique leur origine de sortie IA créée pour ce projet, sans leur attribuer une licence tierce ni revendiquer une exclusivité. La mention affichée est une indication de provenance, pas une attribution à un photographe réel.

Les images d’ambiance du Lot B ne servent pas de démonstration d’un mouvement.

## Illustrations originales

`movement-sketch.tsx` dessine cinq schémas SVG légers : développé couché barre, traction en pronation, planche sur avant-bras, tirage horizontal poulie, squat au poids du corps. Les autres exercices sans visuel montrent un pictogramme de remplacement, sans prétendre illustrer leur exécution. Les schémas sont du code original ajouté au dépôt ; aucune illustration anatomique tierce n’a été copiée.

`muscle-map.tsx` contient une représentation simplifiée face/dos. Le choix des zones dépend de la variante documentée, et non du groupe musculaire saisi librement. Les zones secondaires utilisent un contour pointillé en plus de la couleur ; les listes de muscles restent disponibles en texte. Les mouvements non documentés n’ont pas de zones mises en évidence.

## Vidéos

**Aucune vidéo de production n’est intégrée** : aucune ressource existante avec provenance et réutilisation vérifiées n’a été trouvée dans le projet. Le composant `ExerciseDemonstration` affiche cet état sans bouton de lecture. Il accepte ultérieurement une vidéo locale enregistrée dans `/videos/exercises/`, un poster, une transcription et une piste de sous-titres. Avant intégration d’une vidéo : documenter sa provenance et ses droits dans ce registre, vérifier le mouvement, les sous-titres et la transcription.

Sans clic explicite, il n’instancie ni élément vidéo ni source. Une fois chargé, le lecteur natif fournit lecture/pause et déplacement ; un contrôle permet la relecture. `preload="none"`, `playsInline`, pas d’autoplay ni d’iframe externe.

## Références techniques

Les références sont consultées pour les repères techniques et liées sur chaque fiche ; leurs photos, vidéos et textes ne sont pas réutilisés comme actifs. Les résumés et traductions ont été rédigés pour ce projet. Consultation : 6 novembre 2026.

| Mouvement | Référence |
| --- | --- |
| Rowing unilatéral | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/126/single-arm-row/), [PureGym](https://www.puregym.com/exercises/back/rows/single-arm-dumbbell-row/) |
| Développé couché barre | [PureGym](https://www.puregym.com/exercises/chest/bench-press/barbell-bench-press/) |
| Curl haltères | [Mayo Clinic](https://www.mayoclinic.org/healthy-lifestyle/fitness/multimedia/biceps-curl/vid-20084675) |
| Pompes | [NASM](https://www.nasm.org/resource-center/exercise-library/push-up) |
| Planche sur avant-bras | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/32/front-plank/) |
| Tractions | [PureGym](https://www.puregym.com/exercises/back/pull-up/) |
| Tirage horizontal poulie | [PureGym](https://www.puregym.com/exercises/back/rows/seated-cable-row/) |
| Squat au poids du corps | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/135/bodyweight-squat/) |
