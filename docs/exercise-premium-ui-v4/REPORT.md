# Exercise Premium UI V4 — carte de séance et fiche d'exercice

Travail local sur la branche `exercise-premium-ui-v4`, créée depuis `bfc8529` (état de `main` et `origin/main`, arbre propre). Références visuelles : les deux maquettes validées (bloc d'exercice compact, fiche technique premium). Aucun commit, push, déploiement, migration ni accès Supabase. `main` est inchangée.

Périmètre : les 20 identités qui disposent déjà de l'expérience premium (5 pilotes + 15 du lot V3). Les autres exercices gardent leur carte et leur fiche actuelles, à l'identique.

## Écarts constatés entre les maquettes et l'interface précédente

| Élément | Avant | Maquette | Après |
| --- | --- | --- | --- |
| Miniature de la carte | 64 px | Grande, à gauche | 104 px (88 px sous 360 px de large) |
| Accent des actions | Vert | Violet | Violet profond, texte blanc, clair et sombre |
| Muscle | Pastille + ligne de texte en double | Pastille seule | Pastille seule |
| Bouton ⓘ | Présent, en plus de la miniature et de « Technique » | Présent | Retiré (voir écarts volontaires) |
| Menu ⋮ | Flottant sous l'en-tête | Dans la ligne du titre | Dans la ligne du titre |
| En-têtes de colonnes | « kg », « Reps » | « Charge (kg) », « Répétitions » | « Charge (kg) », « Répétitions » |
| Ajout de série | « + Série », vert | « Ajouter une série », pleine largeur, violet | Idem maquette |
| Onglet actif de la fiche | Fond changeant | Pastille violette | Indicateur violet qui glisse d'un onglet à l'autre |
| Bouton 3D de la fiche | Contour vert | Violet plein | Violet plein |
| Galerie | Miniatures | Points de pagination | Points ajoutés, miniatures conservées |

## Composants modifiés

| Fichier | Changement |
| --- | --- |
| [exercise-session-header.tsx](../../src/components/strength/exercise-session-header.tsx) | **Nouveau.** En-tête de carte présentationnel : miniature, nom, pastilles, dernière performance, menu, raccourcis Muscles 3D et Technique. Ne possède aucune donnée de séance. |
| [session-logger.tsx](../../src/components/strength/session-logger.tsx) | L'en-tête premium est délégué au nouveau composant ; l'en-tête des autres exercices est conservé. Libellés de colonnes et du bouton d'ajout pour les cartes premium. Brouillon, séries, minuteurs et gestionnaires inchangés. |
| [exercise-library.css](../../src/components/sport/exercises/exercise-library.css) | Règles de la carte réécrites ; indicateur d'onglet, bouton 3D, points de galerie ; animations et `prefers-reduced-motion`. |
| [exercise-guide-button.tsx](../../src/components/sport/exercises/exercise-guide-button.tsx), [exercise-guide-dialog.tsx](../../src/components/sport/exercises/exercise-guide-dialog.tsx), [exercise-detail.tsx](../../src/components/sport/exercises/exercise-detail.tsx), [exercise-premium-detail.tsx](../../src/components/sport/exercises/exercise-premium-detail.tsx) | Propriété facultative `initialTab` : le raccourci « Technique » ouvre la fiche sur cet onglet. Indicateur d'onglet. |
| [exercise-photo-gallery.tsx](../../src/components/sport/exercises/exercise-photo-gallery.tsx) | Points de pagination décoratifs. |
| [exercise-thumbnail.tsx](../../src/components/sport/exercises/exercise-thumbnail.tsx) | Propriété `large` pour demander une image adaptée à 104 px. |
| [sport.ts](../../src/lib/i18n/modules/sport.ts) | Trois clés ajoutées en FR, EN et AR. |
| [performance-browser.mjs](../../scripts/performance-browser.mjs), [exercise-premium-v4-browser-checks.mjs](../../scripts/exercise-premium-v4-browser-checks.mjs) | Mode `--exercise-premium-v4` du banc existant et sa campagne. |

Le moteur 3D, le dialogue anatomique, les registres de médias, les photos et les configurations anatomiques ne sont pas modifiés.

## Écarts volontaires avec les maquettes

- **Pas de bouton lecture sur la miniature** : aucun média vidéo n'existe.
- **Pas de bouton ⓘ** : la miniature et « Technique » ouvrent déjà la fiche ; un troisième accès aurait été un doublon. La miniature ouvre sur Photos, « Technique » sur Technique.
- **Dernière performance** au format existant de l'application (`12,5×12 · 12,5×12`), calculée sur les vraies séances, et non le format agrégé « 12,5 × 12 (×3) ».
- **Ordre des onglets** conservé : Photos, Technique, Muscles, Erreurs et conseils.
- **Suppression d'une série** : la croix reste sur chaque ligne (absente de la maquette, mais fonction existante).

## Animations

Validation d'une série (rebond du bouton), indicateur d'onglet glissant, points de galerie, pression sur les boutons, apparition du menu. Tout est en CSS ; aucune dépendance ajoutée. `prefers-reduced-motion` les désactive.

## Validation

| Contrôle | Résultat |
| --- | --- |
| TypeScript, `npx tsc --noEmit` | Réussi |
| ESLint, `npm run lint` | Réussi |
| Tests Node | 167 réussis, 0 échec |
| Build Next.js normal | Réussi |
| `git diff --check` | Réussi |
| Campagne Edge, build de production à fixtures locales | 16 cas (FR sombre, FR clair, AR sombre, EN clair × 320, 390, 430 et 1440 px) : aucun débordement horizontal, 0 erreur console, 0 écriture |
| Carte → fiche → fermeture | Brouillon local strictement identique, dans les 16 cas |
| Raccourci Technique | Ouvre la fiche sur l'onglet Technique |
| Carte → Muscles 3D → Échap | Le visualiseur s'ouvre, se ferme, brouillon identique |
| Validation d'une série | Seul l'indicateur `done` de la série change ; le minuteur de repos démarre |

Les [résultats](browser-results.json) listent les 58 captures produites ; 28 sont conservées dans [screenshots/](screenshots/) (13 paires avant/après, plus la série validée et le menu ouvert).

| Vue | Avant | Après |
| --- | --- | --- |
| Carte, sombre, 390 px | [avant](screenshots/v4-before-card-fr-dark-390.webp) | [après](screenshots/v4-after-card-fr-dark-390.webp) |
| Carte, clair, 390 px | [avant](screenshots/v4-before-card-fr-light-390.webp) | [après](screenshots/v4-after-card-fr-light-390.webp) |
| Carte, arabe RTL, 320 px | [avant](screenshots/v4-before-card-ar-dark-320.webp) | [après](screenshots/v4-after-card-ar-dark-320.webp) |
| Fiche, Photos | [avant](screenshots/v4-before-sheet-photos-fr-dark-390.webp) | [après](screenshots/v4-after-sheet-photos-fr-dark-390.webp) |
| Fiche, Technique | [avant](screenshots/v4-before-sheet-technique-fr-dark-390.webp) | [après](screenshots/v4-after-sheet-technique-fr-dark-390.webp) |
| Fiche, ordinateur | [avant](screenshots/v4-before-sheet-photos-fr-dark-1440.webp) | [après](screenshots/v4-after-sheet-photos-fr-dark-1440.webp) |

## Performances

JavaScript initial compressé, même script ([measure-build.mjs](../../scripts/measure-build.mjs)) ; référence : la mesure commitée du lot V3, qui correspond à `main`.

| Route | Avant, octets gzip | Après, octets gzip | Écart |
| --- | ---: | ---: | ---: |
| Dashboard | 301 756 | 301 823 | +67 |
| Sport | 304 161 | 304 228 | +67 |
| Musculation | 341 064 | 341 752 | +688 |
| Bibliothèque | 309 934 | 310 001 | +67 |
| Fiche complète | 315 954 | 316 103 | +149 |

Les +67 octets communs viennent des clés de traduction. La fiche, le dialogue photo et le visualiseur 3D restent chargés à la demande. Détail dans [after-build.json](after-build.json).

## Correctif après essai sur téléphone

Le premier essai réel a montré deux défauts que la campagne initiale ne couvrait pas : la fiche ouverte par « Technique » avait un en-tête écrasé (titre vertical), et la croix de fermeture du visualiseur 3D sortait de l'écran. Cause commune : ces dialogues sont rendus à l'intérieur de la rangée d'actions de la carte, et les règles « bouton pleine largeur » de cette rangée atteignaient leurs boutons. Les règles de la carte ciblent maintenant uniquement ses enfants directs (`>`), y compris celles des champs et des boutons de validation. La flèche d'agrandissement du visualiseur reçoit le sélecteur de variante texte pour ne plus s'afficher en émoji sur iOS.

La campagne vérifie désormais ces deux en-têtes : [fiche depuis Technique](screenshots/v4-fix-sheet-from-technique-fr-dark-390.webp), [visualiseur depuis la carte](screenshots/v4-fix-viewer-from-card-fr-dark-390.webp).

## Limites

- **Mode développement** : sous `next dev`, le visualiseur 3D ouvert depuis une carte se referme aussitôt. React StrictMode rejoue l'effet du dialogue anatomique, et son nettoyage émet un `close` natif qui appelle `onClose`. Le défaut vient de `exercise-muscle-dialog.tsx`, non modifié ici, et n'apparaît pas sur un build de production. La campagne doit donc tourner avec `--production`.
- Aucune mesure sur un téléphone physique ni sur l'environnement déployé : Edge sans interface, comptes et réponses HTTP fictifs.
- Le déplacement et la suppression d'un exercice par le menu sont capturés ouverts mais non rejoués par la campagne ; leur code est celui d'avant, appelé par les mêmes fonctions.
- Les 50 autres références du catalogue gardent l'ancienne carte.
- Les textes « Première fois — pas d'historique » des captures viennent des fixtures, qui ne contiennent pas d'historique pour ces exercices.
