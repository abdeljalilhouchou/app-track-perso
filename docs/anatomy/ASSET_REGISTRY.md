# Atlas masculin du pilote rowing

## Fichier effectivement intégré

- Fichier : `public/models/anatomy/male-mobile.glb`.
- Source : [Fit Mit With anatomy atlas](https://github.com/slfresh/fitmitwith-anatomy-atlas), révision `4120ee68b6604b8f2f69105d6de6166fad4734c4`.
- [Téléchargement source figé](https://raw.githubusercontent.com/slfresh/fitmitwith-anatomy-atlas/4120ee68b6604b8f2f69105d6de6166fad4734c4/models/full-body-male-mobile.glb).
- Auteur de l’adaptation : projet Fit Mit With, publié par le compte `slfresh` ; aucun nom civil n’est supposé.
- Sources anatomiques : Z-Anatomy / BodyParts3D. Les auteurs et crédits complets sont conservés dans `ATTRIBUTION-UPSTREAM.txt` et `Z-Anatomy-LICENSE.txt`.
- Licence du modèle distribué : **CC BY-SA 4.0**, copie complète dans `LICENSE-CC-BY-SA-4.0.txt`, également liée dans le dialogue.
- Poids : **2 545 068 octets** ; **221 meshes**, **128 917 triangles**, aucune image ni texture.
- SHA-256 vérifié : `d80bebc4045069b660ca8e7afe599d76d15ccc7d96410b3727c600ef01d24e54`.
- Modèle masculin en position anatomique debout, avec 218 régions musculaires identifiables et des maillages de contexte.

`SOURCE.json` conserve la révision, l’URL, le poids, le hash et les changements. `muscle-map.json` est la table source des identifiants anatomiques. Le script de téléchargement `scripts/fetch-anatomy-model.mjs` refuse un binaire dont le hash, le budget ou la licence attendue ont changé.

Le fichier GLB est redistribué sans modification géométrique. L’application adapte ses matériaux, ses couleurs, l’éclairage et le cadrage à l’exécution, selon les identifiants anatomiques ; la mise à l’échelle uniforme et le centrage restent des transformations de scène. La V2 cadre par défaut le haut du corps, en vue arrière ; la commande « Corps entier » permet de revoir l’atlas complet. Aucun triangle n’est choisi selon sa position pour inventer une zone musculaire.

Les copies de l’asset et de ses notices conservent la licence amont. Une adaptation redistribuée du modèle doit respecter les conditions d’attribution et de partage à l’identique de cette licence. Le code d’interface du projet est séparé de ces fichiers.

## Ressources examinées

L’atlas Z-Anatomy complet, Écorché et le modèle mobile Fit Mit With ont été examinés. Le modèle mobile retenu offre des portions nommées des trapèzes, du deltoïde et des fléchisseurs du coude, avec un budget adapté au pilote. Il fournit un vrai maillage 3D, et non une image animée.

Le fournisseur indique que sa géométrie n’a pas reçu de revue par un spécialiste de l’anatomie. Le prototype montre cette limite dans son contenu pédagogique. La vérification des identifiants contre les meshes réels n’est pas présentée comme une validation clinique.

## Mapping du rowing avec appui sur banc

| Rôle | Groupe affiché | `extras.key` exacts |
| --- | --- | --- |
| Principal | Grand dorsal | `latissimus_dorsi` |
| Secondaire | Rhomboïdes | `rhomboid_major`, `rhomboid_minor` |
| Secondaire | Trapèze moyen | `trapezius_middle` |
| Secondaire | Trapèze inférieur | `trapezius_lower` |
| Secondaire | Deltoïde postérieur | `deltoid_posterior` |
| Secondaire | Biceps brachial | `biceps_brachii_long`, `biceps_brachii_short` |
| Secondaire | Brachial et brachio-radial | `brachialis`, `brachioradialis_muscle` |
| Stabilisation | Paroi abdominale | `rectus_abdominis`, `transversus_abdominis`, `external_oblique`, `internal_oblique` |
| Stabilisation | Rachis | `iliocostalis_lumborum`, `longissimus_thoracis`, `multifidus_lumborum` |

Les moteurs et assistants sont colorés du côté travaillé sélectionné. Les stabilisateurs du tronc sont bilatéraux. Les autres meshes restent neutres ; cliquer sur une zone non documentée n’invente pas d’explication. Les rhomboïdes et autres groupes profonds peuvent être révélés en atténuant les couches voisines.

La classification concerne une variante avec une main et un genou sur le banc. Elle ne prétend pas décrire universellement toutes les trajectoires de rowing. Validation professionnelle du contenu et tests sur personnes réelles restent à effectuer.

## Références pédagogiques consultées

- [ACE — Single-arm row](https://www.acefitness.org/resources/everyone/exercise-library/126/single-arm-row/) : mise en place, appuis, contrôle du tronc et exécution.
- [PureGym — Single-arm dumbbell row](https://www.puregym.com/exercises/back/rows/single-arm-dumbbell-row/) : variante avec appui sur banc.
- [Fenwick, Brown et McGill, 2009](https://pubmed.ncbi.nlm.nih.gov/19197209/) : comparaison de variantes de rowing et de leurs contraintes sur le tronc. Cette étude ne mesure pas exactement notre variante main/genou sur banc ; elle ne sert pas à attribuer des pourcentages d’activation.

Les textes et traductions d’interface sont originaux. Aucune image ou vidéo provenant de ces références n’est copiée.

## Visuels sportifs masculins

Les photos du rowing et des pompes ont été remplacées, à la demande explicite de l’utilisateur, par des hommes générés avec l’outil intégré `image_gen`. Le curl présentait déjà un homme. Les trois fichiers actifs sont dans `public/images/exercises/` ; leur provenance et leurs révisions sont dans [le registre des médias](../exercise-library/media-registry.json) et [les prompts d’édition](../exercise-library/male-media-update.json).

Le fallback 2D est un schéma original avec des repères nommés, explicitement identifié comme tel. Il n’est jamais présenté comme un rendu 3D.
