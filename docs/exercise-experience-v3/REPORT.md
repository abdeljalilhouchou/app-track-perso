# Exercise Experience V3 — revue visuelle

Travail local sur `exercise-visual-library-v3`, à partir du lot photographique V3 déjà présent. Référence graphique : les deux vues transmises dans la conversation, dont `a_high_detail_design_proposal_for_a_sports_app_exe.png`. La seconde vue fournit la structure principale de la fiche. Les couleurs proviennent du Design System existant et les photos du registre réel de l’application.

## Présentation

- Carte de séance compacte : miniature, nom complet, pastilles muscle/matériel, objectif, dernière performance réelle, accès visibles Muscles 3D et Technique. Déplacement et suppression restent accessibles dans un menu discret. Les séries et leurs actions restent dans la carte ; aucune galerie permanente.
- Fiche mobile en bottom sheet : poignée utilisable au clavier, au clic et par glissement vertical, agrandissement, petite photo, nom complet, muscle et matériel, fermeture toujours accessible, défilement intérieur et safe areas. Sur tablette et ordinateur, la même fiche devient une fenêtre centrée.
- Quatre onglets avec icônes et navigation clavier adaptée au RTL : Photos, Technique, Muscles, Erreurs et conseils.
- Galerie : grande photographie avec position lisible en surimpression, légende complète, miniatures Départ/Arrivée, état sélectionné, navigation tactile et clavier. L’ouverture commence par la première position réellement enregistrée. Une photo statique n’affiche aucune navigation fictive.
- Agrandissement à la demande dans un dialogue au-dessus de la fiche. La fermeture rend le focus à son bouton et conserve la photo sélectionnée. Aucun bouton vidéo n’est ajouté aux exercices sans vidéo.
- Technique : préparation, position, exécution et retour documentés, puis respiration, amplitude et tempo. Erreurs et conseils présentés avec icône, titre et description, à partir des textes existants.
- Muscles : principaux, secondaires, stabilisateurs et actions documentées dans la configuration anatomique. Le bouton « Voir les muscles en 3D » ouvre le visualiseur partagé existant. Retour dans la fiche, puis dans la séance, avec focus et défilement restaurés.
- Micro-animations CSS à l’ouverture/fermeture, au changement d’onglet, de photo et de miniature ; prise en compte de `prefers-reduced-motion`.

## Composants

| Fichier | Changement |
| --- | --- |
| [exercise-guide-dialog.tsx](../../src/components/sport/exercises/exercise-guide-dialog.tsx) | En-tête, poignée, agrandissement, défilement, animation de fermeture et focus initial |
| [exercise-photo-gallery.tsx](../../src/components/sport/exercises/exercise-photo-gallery.tsx) | Photo principale, miniatures réelles, position active et agrandissement |
| [exercise-photo-dialog.tsx](../../src/components/sport/exercises/exercise-photo-dialog.tsx) | Nouveau dialogue photo chargé uniquement à la demande |
| [exercise-premium-detail.tsx](../../src/components/sport/exercises/exercise-premium-detail.tsx) | Onglets avec icônes, technique, rôles musculaires et conseils structurés |
| [exercise-guide-button.tsx](../../src/components/sport/exercises/exercise-guide-button.tsx) | Libellé visible facultatif pour l’accès Technique |
| [exercise-library.css](../../src/components/sport/exercises/exercise-library.css) | Présentation responsive, thèmes existants, gestes et animations réduites |
| [session-logger.tsx](../../src/components/strength/session-logger.tsx) | Présentation de la carte, menu compact et accès aux fiches ; logique conservée |
| [exercise-muscle-button.tsx](../../src/components/sport/anatomy/exercise-muscle-button.tsx) | Libellé facultatif et retour du focus sans déplacement ; même dialogue et même moteur |
| [exercise-muscle-dialog.tsx](../../src/components/sport/anatomy/exercise-muscle-dialog.tsx) | Correction ciblée de la gestion d’Échap pour fermer uniquement le dialogue 3D imbriqué |
| [sport-icons.tsx](../../src/components/sport/ui/sport-icons.tsx) | Deux pictogrammes SVG : fermer et agrandir |
| [exercise-library.ts](../../src/lib/i18n/modules/exercise-library.ts) | Libellés FR/EN/AR |
| [data.ts](../../src/lib/exercises/data.ts), [types.ts](../../src/lib/exercises/types.ts) | Ajout des descriptions musculaires existantes au résultat de présentation ; aucune nouvelle requête |

## Préservation

L’[audit de préservation](preservation.json) compare les empreintes des photos, registres et fichiers anatomiques au début de cette refonte. Il compare également le code des gestionnaires de séance, des effets de sauvegarde, des minuteurs et des lecteurs de performances. Les actions, identités du catalogue, calculs et dépendances restent conservés. Le déclencheur 3D reçoit un libellé facultatif et restaure le focus après fermeture. Dans son dialogue existant, seule la gestion d’Échap est corrigée ; une comparaison exacte vérifie que le reste de ce fichier est conservé. Le moteur, les configurations et les modèles 3D restent inchangés.

La photothèque V3 antérieure est conservée. La nouvelle présentation s’applique aux 20 identités déjà prises en charge par l’expérience photographique partagée (5 pilotes et 15 références du lot V3). Les autres exercices gardent leur fiche existante ; aucune technique ni deuxième position n’est attribuée à une variante non documentée.

Aucun changement de Supabase, de schéma, de données réelles, de programme enregistré ni de migration. Aucun commit, push ou déploiement. `main` reste inchangée.

## Validation et captures

| Contrôle | Résultat |
| --- | --- |
| TypeScript, `npx tsc --noEmit` | Réussi |
| ESLint, `npm run lint` | Réussi, aucune erreur ni alerte |
| Tests Node | 167 réussis, 0 échec — [sortie complète](unit-tests.txt) |
| Edge, campagne complète | 419 cas : 75 fiches pilotes + 24 fenêtres de séance + 200 fiches du lot V3 + 120 panneaux de la nouvelle fiche |
| Interactions | Agrandissement, photo statique, glissement de la poignée, menu compact, ajout/suppression de série, réorganisation, clavier, focus, 3D et retours validés |
| Séance conservée | JSON exact du brouillon inchangé après consultation ; charges, répétitions, séries validées et ordre conservés ; minuteurs continuent |
| Thèmes et langues | FR/EN/AR et RTL ; clair/sombre ; System simulé dans les deux préférences OS ; animations réduites |
| Écrans | 320, 390, 430, 768 et 1440 px ; contrôles de séries de 44 × 44 px |
| JavaScript et données | 0 erreur JavaScript, 0 écriture dans les réponses HTTP fictives |
| Build Next.js normal | Réussi et rétabli après les essais ; aucune clé de fixture dans les 73 chunks client |
| `git diff --check` | Réussi |
| Préservation | 95 fichiers protégés identiques ; correction clavier du dialogue 3D isolée par comparaison exacte ; HEAD, main et origin/main restent à `4f7d915` |

La [campagne complète](browser-results.json) est accompagnée des [résultats de la nouvelle fiche](experience-results.json), des [régressions pilotes](pilot-regression.json) et des [régressions de la photothèque](library-regression.json). Un [contrôle complémentaire](photo-final-checks.json) valide la présentation finale de l’agrandissement mobile : la photographie passe réellement de 360 à 390 px de largeur. Ce contrôle confirme aussi les retours photo/3D, le menu, la poignée et System après cet ajustement CSS limité au dialogue photo. Il produit [son propre rapport navigateur](photo-final-browser-results.json).

Les [17 captures réelles](SCREENSHOTS.md) montrent les deux thèmes, les quatre onglets, l’arabe RTL en 320 px, la photographie agrandie, la 3D ouverte, le retour à la fiche et la séance conservée. Les tests utilisent exclusivement des comptes, séances et réponses HTTP fictifs sur la machine locale. Ils ne mesurent pas un environnement déployé.

La [liste des fichiers de cette refonte](changed-files.json) est établie par comparaison avec l’état du lot photographique V3 présent avant ce travail. Le [récapitulatif des contrôles](checks.json) rassemble les résultats finaux.

## Performances

Comparaison du JavaScript initial compressé du build normal, par rapport au lot photographique V3 avant cette refonte :

| Route | Avant, octets gzip | Après, octets gzip | Écart |
| --- | ---: | ---: | ---: |
| Dashboard | 301 524 | 301 756 | +232 |
| Sport | 303 884 | 304 161 | +277 |
| Musculation | 340 465 | 341 064 | +599 |
| Bibliothèque | 309 593 | 309 934 | +341 |
| Fiche complète | 315 103 | 315 954 | +851 |

L’[audit des bundles](bundle-audit.json) vérifie 13 routes : aucun moteur Three.js ni contenu anatomique complet dans leur JavaScript initial. Le même chunk 3D reste différé : 654 903 octets bruts, 162 125 gzip. L’[audit du contenu différé](copy-bundle-audit.json) confirme que la collection complète de textes et de photographies V3 n’entre pas dans le JavaScript initial.

Aucune dépendance ajoutée. Les listes conservent leurs petites miniatures ; les images de position sont demandées pour l’exercice ouvert, avec des miniatures optimisées à 128 px. Le dialogue de photographie et le visualiseur 3D sont chargés sur demande. Ces mesures portent sur les fichiers de build et les requêtes locales, sans prétendre mesurer la fluidité ou le temps de chargement d’un téléphone physique.

## Limites

Safari/iOS et téléphone physique ne sont pas disponibles dans cet environnement Windows. Les safe areas sont prévues dans le CSS, mais leur comportement réel, le clavier numérique et les gestes natifs doivent encore être revus sur appareil. La direction graphique est reprise avec le Design System et les photos disponibles ; les boutons vidéo dessinés dans la proposition ne sont pas reproduits en l’absence d’une vidéo réelle.

Le travail reste sans commit pour validation visuelle.
