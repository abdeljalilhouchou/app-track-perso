# Lot B — Design system Sport premium

6 novembre 2026. Lot A validé par l’utilisateur sous réserve des validations réelles sur smartphone et Supabase. Ce livrable couvre le Lot B uniquement.

## État du dépôt

Branche vérifiée avant le travail : `track-perso-sport-premium-lot-a`, HEAD `742b0f6`. Les modifications non commitées du Lot A ont été conservées. Pas de changement de branche, commit, push, migration ou déploiement. `main` conserve son commit initial. Les inventaires ci-dessous concernent les changements du **Lot B**, en plus du Lot A déjà présent dans l’arbre de travail.

## Audit et direction visuelle

L’application possède déjà des variables de thème complètes, un ThemeProvider unique, le contexte FR/EN/AR, des icônes SVG, un squelette de chargement et les wrappers de graphiques différés du Lot A. Les cartes Sport présentaient toutefois plusieurs styles de bordure, de titre et d’espacement ; les statistiques utilisaient un effet 3D au pointeur ; les textes verts et contrôles ne disposaient pas d’un token spécifique de contraste.

Le Lot B reprend la direction des maquettes fournies : surfaces neutres, identité violette conservée, vert pour les actions et progrès, typographie hiérarchisée, cartes aux bordures fines, statistiques compactes et visuels d’ambiance sportifs. Les nouveaux styles sont limités à `.sport-ui`. Aucun remplacement de la palette globale, nouveau provider ou nouvelle police.

## Architecture et composants développés

La référence complète des propriétés et les exemples d’intégration sont dans [ARCHITECTURE.md](./ARCHITECTURE.md).

| Famille | Composants |
| --- | --- |
| Structure | `SportCard`, `SportPageHeader`, `SportSectionHeading`, `SportBadge` |
| Actions | `SportButton`, `SportLink`, `SportSegmentedControl` |
| Navigation | `SportSectionNavigation`, compacte et à liens Next |
| Cartes métier de présentation | `SportDisciplineCard`, `WorkoutCard`, `ExerciseCard` |
| Données et progression | `SportStatCard`, `SportProgressBar`, `SportProgressRing`, `PersonalRecordBadge` |
| États et médias | `SportMedia`, `SportEmptyState`, `SportErrorState`, squelette existant réutilisé |
| Icônes | `SportIcon`, en continuité avec les SVG déjà présents |

Les composants statiques sont compatibles avec un rendu serveur. Seuls les médias en erreur et les contrôles interactifs ajoutent de petites frontières clientes. Les composants reçoivent leurs valeurs et actions ; ils n’exécutent ni requête sportive ni écriture. Les indicateurs inconnus n’annoncent pas un faux 0 %, et le badge de record ne détecte ni ne célèbre un nouveau PR sans preuve fournie par l’écran.

**Intégration réelle effectuée :** cartes de statistiques, objectif hebdomadaire et ses boutons/barre, icônes des records, en-têtes Musculation/Calendrier/Statistiques et style des deux plots partagés. Les calculs et actions de ces écrans sont conservés.

**Préparé sans démarrer le Lot C :** nouvelles cartes de discipline/séance/exercice et navigation compacte dans une page interne de vérification. Le Sport Hub conserve sa structure et sa navigation actuelles. Aucune bibliothèque d’exercices, contenu technique ou nouveau Workout Mode n’a été créé.

## Améliorations visuelles et accessibilité

- Surfaces et bordures cohérentes, coins de 18 px, espacements de 16 px et ombres discrètes ; retrait de l’effet de tilt sur les tuiles Sport.
- Titres et chiffres mieux différenciés ; chiffres tabulaires, retours à la ligne et isolation des valeurs mixtes par `bdi`.
- Tuiles statistiques en deux colonnes sur mobile ; boutons et segments d’au moins 44 × 44 px, état disabled/busy et focus visible.
- Tokens `--sport-ink` et `--sport-action` dérivés des couleurs existantes : contraste du bouton principal mesuré dans Edge à **5,66:1 en clair** et **12,53:1 en sombre**. Cela ne vaut pas audit WCAG complet de l’application.
- Traits SVG cohérents ; chevrons adaptés au RTL ; propriétés CSS logiques ; nouvelles chaînes explicitement traduites en FR/EN/AR.
- Transitions CSS de 160 ms, survol réservé aux pointeurs fins, spinner et transformations désactivés en mode réduit. Aucun masquage du contenu avant hydratation.
- Barres de graphique en dégradé, coins arrondis, grille discrète, tooltips thématiques et ligne de progression plus lisible. Aucun changement de séries, de domaines ou de calcul de données ; les animations JS des deux plots partagés sont désactivées.

## Médias

Trois visuels photoréalistes d’ambiance ont été générés avec l’outil intégré `image_gen.imagegen`, inspectés puis optimisés avec Sharp déjà installé. Ils ne prétendent représenter ni un utilisateur, ni un lieu réel, ni une technique d’exercice.

- `public/images/sport/strength.webp` — 33 270 octets.
- `public/images/sport/calisthenics.webp` — 36 606 octets.
- `public/images/sport/running.webp` — 39 740 octets.

Total **107,0 Kio**, images de 768 × 512. Source, droits, alternatives FR/EN/AR et usage sont consignés dans [MEDIA_REGISTRY.md](./MEDIA_REGISTRY.md) ; les prompts finaux exacts sont dans [media-prompts.json](./media-prompts.json). Aucun média de stock externe ni vidéo ajouté. Ces visuels restent dans l’aperçu pour ce lot, sans téléchargement sur le Hub actuel.

`SportMedia` utilise `next/image`, un ratio réservé, `sizes`, le chargement différé natif et un remplacement stable si la source est absente/vide ou échoue. Les captures de test sous `docs/design-system/` sont des preuves de QA, pas des médias envoyés à l’application.

## Performances du Lot A conservées

Pas de dépendance ajoutée ou de changement du lockfile. Les wrappers dynamiques Recharts, les panneaux montés à la demande, la conservation du brouillon, le cache isolé à la requête, les frontières de streaming, le calendrier borné au mois et les revalidations sont conservés. Aucun préchargement intégral forcé ni cache interutilisateur.

La petite hausse de JavaScript vient des primitives et traductions supplémentaires. Le poids des graphiques reste différé. Les mesures suivantes comparent un build normal du début du Lot B au build normal final ; même script et même méthode que le Lot A. Les snapshots du Lot A ne sont pas écrasés.

| Route | Gzip avant (Kio) | Gzip après (Kio) | Variation (Kio) |
| --- | ---: | ---: | ---: |
| /dashboard | 286.8 | 288.2 | +1.4 |
| /habits | 301.3 | 302.6 | +1.4 |
| /nutrition | 308.5 | 309.9 | +1.4 |
| /humeur | 295.2 | 296.7 | +1.4 |
| /profil | 354.9 | 356.3 | +1.4 |
| /sport | 280.8 | 284.3 | +3.5 |
| /sport/musculation | 311.1 | 312.6 | +1.4 |
| /sport/calendar | 278.8 | 280.2 | +1.4 |
| /sport/stats | 291.7 | 293.1 | +1.4 |
| /sport/calisthenics | 298.3 | 299.7 | +1.4 |
| /sport/running | 294.1 | 295.5 | +1.4 |

Ces valeurs sont les fichiers JS initiaux référencés par les manifestes, gzip calculé fichier par fichier ; pas des transferts réels sur smartphone. Les références clientes conditionnelles peuvent figurer dans le manifeste sans être rendues. Aucune mesure nouvelle de LCP/INP/TTFB en production ni de latence Supabase réelle n’est affirmée.

## Vérifications

**Vérifications techniques réussies :** `npx --no-install tsc --noEmit`, `npm run lint`, `npm run build` et `git diff --check`, tous terminés sans erreur. Le dernier build utilise la configuration habituelle, après les builds avec API fictive.

**14 tests ciblés réussis :** les neuf tests du Lot A et cinq tests supplémentaires sur les états de progression inconnus/invalides, les objectifs dépassés et ARIA, les trois dictionnaires, les fichiers WebP/budget de médias et la fermeture de l’aperçu par défaut sans lecture sportive.

**Edge headless, build de production local, API Auth/REST fictive locale :**

- Régression du Lot A : les six espaces Sport, le brouillon entre onglets et le rendu différé du graphique passent ; Hub sans débordement aux sept largeurs 320/360/375/390/430/768/1440 px.
- Galerie : **36 combinaisons** FR/EN/AR × clair/sombre × 320/360/390/430/768/1440 px, sans débordement horizontal de page.
- Contraste du bouton principal, segments contrôlés, fermeture de l’erreur de démonstration, focus clavier visible et cibles tactiles de 44 px contrôlés.
- Réduction des mouvements contrôlée ; image réellement bloquée dans le navigateur, remplacement affiché et hauteur de média conservée.
- Aucun message d’erreur console ou exception dans le scénario final ; aucune écriture HTTP et aucune interrogation des tables Calisthenics/Running désactivées.
- Parcours existant arabe/système réexécuté sur le Hub ; les nouveaux tokens suivent les variables existantes. Pas de nouvelle résolution de thème parallèle.

Résultats complets : [lot-b-browser.json](./lot-b-browser.json). Captures examinées : [français clair](./preview-fr-light.webp), [français sombre](./preview-fr-dark.webp), [arabe sombre](./preview-ar-dark.webp).

Le pilote a été ajusté pour attendre l’hydratation avant l’interaction avec le bouton de séance, et pour tester l’image de la carte effectivement bloquée. Les essais échoués avant ces corrections du scénario ne sont pas comptés comme des réussites.

**Limites :** aucun iPhone/Android physique ou réseau 4G réel testé ; données, sauvegardes et RLS Supabase réelles toujours à valider. La vérification de contraste porte sur le bouton principal, pas sur chaque couleur ou état de tous les anciens écrans. Les nouvelles mesures ne constituent pas le Lot I.

## Fichiers créés et modifiés dans ce lot

**Créés — composants :**

- `src/components/sport/ui/sport-ui.css`
- `src/components/sport/ui/sport-icons.tsx`
- `src/components/sport/ui/sport-primitives.tsx`
- `src/components/sport/ui/sport-progress.tsx`
- `src/components/sport/ui/sport-stat-card.tsx`
- `src/components/sport/ui/sport-content-cards.tsx`
- `src/components/sport/ui/sport-media.tsx`
- `src/components/sport/ui/sport-section-navigation.tsx`
- `src/components/sport/ui/sport-segmented-control.tsx`
- `src/components/sport/ui/sport-design-preview.tsx`

**Autres créations :**

- `src/app/(app)/sport/design-system/page.tsx`
- `src/lib/i18n/modules/sport-ui.ts`
- `src/lib/sport-media.ts`
- `scripts/design-system.test.mjs`
- Les trois WebP sous `public/images/sport/` listés au registre.
- Sous `docs/design-system/` : ce rapport, `ARCHITECTURE.md`, `MEDIA_REGISTRY.md`, `media-prompts.json`, les snapshots `lot-b-before.json` / `lot-b-after.json`, `lot-b-browser.json` et les trois captures WebP.

**Modifiés :**

- `src/app/(app)/sport/layout.tsx` — scope et chargement des styles.
- `src/app/(app)/sport/musculation/page.tsx` — en-tête partagé.
- `src/app/(app)/sport/calendar/page.tsx` — en-tête partagé ; loader mensuel du Lot A conservé.
- `src/app/(app)/sport/stats/page.tsx` — en-tête partagé.
- `src/components/sport/sport-overview.tsx` — cartes de statistiques, surfaces et icônes cohérentes.
- `src/components/sport/weekly-goal.tsx` — carte, contrôles, formatage et progression ; même action serveur.
- `src/components/charts/weekly-bar-chart-plot.tsx` et `weekly-line-chart-plot.tsx` — présentation des plots déjà différés. Comme ces plots sont partagés, leur présentation bénéficie aussi aux autres écrans qui les utilisent.
- `src/components/ui/page-loading-skeleton.tsx` — option d’aperçu sans marqueur de navigation ; comportement par défaut conservé.
- `src/lib/i18n/modules/sport.ts` — raccordement des dictionnaires UI.
- `scripts/performance-browser.mjs` — option `--design-system`, contrôles de composants et synchronisation du pilote.
- `scripts/test-source-loader.mjs` — `esModuleInterop` conforme au tsconfig pour tester les imports réels.

## Aperçu et reproduction

L’aperçu authentifié `/sport/design-system` est fermé par défaut, absent des menus. Pour le consulter localement, définir `SPORT_UI_PREVIEW=true` avant le lancement ; voir [ARCHITECTURE.md](./ARCHITECTURE.md). Ses indicateurs viennent du loader existant et ses états de démonstration sont explicitement identifiés. Il ne remplace aucune page produit.

```powershell
node --test scripts/design-system.test.mjs scripts/performance.test.mjs
npx --no-install tsc --noEmit
npm run lint
npm run build
git diff --check
```

Le test navigateur facultatif est `node scripts/performance-browser.mjs --production --design-system`. Il construit avec une API fictive locale ; copier ses résultats depuis `.next/qa`, puis refaire impérativement `npm run build` avant de reprendre un `npm start` normal. Cette restauration a été effectuée après nos tests. Aucun fichier de secrets n’est modifié par le scénario.

## Suite pour le Lot C — non commencée

Après validation seulement : remplacer la navigation permanente actuelle par une organisation compacte adaptée au contexte, recomposer le Sport Hub autour des données réelles de la semaine et des séances, intégrer les cartes de discipline et leurs visuels dans cette organisation, et raccorder les accès rapides et états désactivés en préservant les URLs.

La bibliothèque d’exercices, les fiches techniques et le nouveau Workout Mode restent hors du Lot B. Aucun changement SQL, calcul métier, mécanisme de sauvegarde, gate de migration, export ou synchronisation d’habitudes n’a été effectué dans ce lot.
