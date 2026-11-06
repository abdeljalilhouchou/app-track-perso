# Design system Sport — utilisation

Les composants sont dans `src/components/sport/ui/`. Ils ne chargent ni ne modifient de données sportives. Leurs valeurs, libellés et actions proviennent des écrans existants. Le Lot B ne crée ni catalogue d’exercices ni nouveau Workout Mode.

## Contexte et thèmes

Le layout Sport charge `sport-ui.css` et applique `.sport-ui`. Pour réutiliser un composant hors de ce layout, charger ce fichier puis placer le composant sous un conteneur `.sport-ui`. Aucun nouveau provider n’est nécessaire : les thèmes et traductions existants restent la source de vérité.

Les surfaces utilisent `--surface`, `--surface-muted`, `--background`, `--border` ; l’identité conserve `--accent` et `--sport`. `--sport-ink` et `--sport-action` sont des mélanges de ces couleurs avec `--foreground` pour rendre les petits textes et boutons lisibles en clair comme en sombre. Le mode System utilise les variables déjà résolues par le thème de l’application.

Espacements : grille de 4 px, corps de carte de 16 px, coins de 18 px, contrôles d’au moins 44 × 44 px. Les chiffres utilisent des chiffres tabulaires, les libellés peuvent revenir à la ligne. Propriétés CSS logiques et `bdi` protègent les valeurs mixtes en RTL. Les chevrons s’orientent avec la direction du document ; les icônes de discipline gardent leur orientation.

## Composants

| Module | Composants | Contrat |
| --- | --- | --- |
| `sport-primitives.tsx` | `SportCard`, `SportPageHeader`, `SportSectionHeading`, `SportBadge` | Présentation compatible serveur ; titres et textes fournis par l’appelant. Un `SportPageHeader` produit un `h1`. |
| `sport-primitives.tsx` | `SportButton`, `SportLink` | Variantes primary/secondary/ghost ; boutons natifs, état disabled/busy, liens Next conservés. Un bouton déclenche uniquement l’action fournie. Pour un bouton à icône seule, fournir `aria-label`. |
| `sport-primitives.tsx` | `SportEmptyState`, `SportErrorState` | Texte et action explicites ; `role="alert"` pour l’erreur. Pas de nouvelle logique de retry ou de suppression cachée. |
| `sport-stat-card.tsx` | `SportStatCard` | Valeur et unité déjà calculées et localisées ; pas d’agrégation ni de calcul de tendance dans la carte. |
| `sport-progress.tsx` | `SportProgressBar`, `SportProgressRing` | Valeur et maximum dans la même unité. Bornes visuelles et ARIA ; `null` ou maximum invalide représente une progression inconnue, sans annoncer 0 %. Fournir `valueText` localisé ; le texte central est obligatoire pour l’anneau. |
| `sport-progress.tsx` | `PersonalRecordBadge` | Affiche un record vérifié par l’appelant. Ne détecte pas de PR, ne prétend pas qu’un record est nouveau et ne lance pas de célébration automatique. |
| `sport-content-cards.tsx` | `SportDisciplineCard`, `WorkoutCard`, `ExerciseCard` | Cartes liées à des URL réelles ou descriptives. `compact` sur une discipline permet trois cartes sur mobile au Lot C. Métriques, tags et médias facultatifs ; actions d’exercice hors du lien principal. |
| `sport-media.tsx` | `SportMedia`, type `SportImageSource` | Petite frontière cliente pour l’erreur image ; source locale enregistrée, alt localisé, ratio réservé, sizes, lazy loading. Source absente/vide ou erreur de chargement : remplacement stable. Aucun support de vidéo implicite. |
| `sport-section-navigation.tsx` | `SportSectionNavigation` | Navigation compacte à liens Next, libellé accessible et état `aria-current`. Au Lot C, elle est réutilisée dans le sélecteur contextuel des pages Sport ; le Hub présente ses disciplines et raccourcis directement. |
| `sport-segmented-control.tsx` | `SportSegmentedControl` | Groupe de boutons contrôlé par l’écran (`value`, `options`, `onChange`), avec `aria-pressed`. Ce n’est pas un faux tablist sans panneaux. |
| `sport-icons.tsx` | `SportIcon` | Reprend les icônes SVG existantes et complète le même trait de 1,8 px. Icônes décoratives masquées aux lecteurs d’écran ; le contrôle porte son propre nom accessible. |
| `@/components/ui/page-loading-skeleton` | `PageLoadingSkeleton` | Squelette existant réutilisé. `routeLoading` reste vrai par défaut. La galerie passe false pour qu’un exemple de squelette ne soit pas pris pour une navigation en cours. |

Importer les modules directement pour garder de petites frontières clientes. Aucun barrel important tous les médias, graphiques et composants interactifs n’est ajouté.

## Exemple avec les données existantes

```tsx
import { SportStatCard } from "@/components/sport/ui/sport-stat-card";
import { SportProgressBar } from "@/components/sport/ui/sport-progress";

// Dans un écran ayant déjà chargé data et les traductions t :
const number = new Intl.NumberFormat(data.language);
const valueText = `${number.format(data.stats.thisWeek.sessions)} / ${number.format(data.weeklyGoal)}`;

<SportStatCard
  label={t("sport.hub.sessionsThisWeek")}
  value={number.format(data.stats.thisWeek.sessions)}
  icon="calendar"
/>;
<SportProgressBar
  label={t("sport.weeklyGoal.title")}
  value={data.stats.thisWeek.sessions}
  max={data.weeklyGoal}
  valueText={valueText}
/>;
```

Pour une image : `sportImage("strength", t)` renvoie une source locale et son texte alternatif traduit. Les médias autorisés, leurs poids et prompts sont documentés dans [MEDIA_REGISTRY.md](./MEDIA_REGISTRY.md). L’API locale actuelle ne configure aucun hôte distant : ne pas lui passer arbitrairement une URL externe sans son intégration et sa vérification préalables.

## Aperçu interne

L’aperçu `/sport/design-system` est dans l’espace authentifié, n’a aucun lien dans la navigation produit et renvoie une page introuvable sans activation explicite :

```powershell
$env:SPORT_UI_PREVIEW = 'true'
npm run dev
```

Pour un aperçu avec build de production, définir la variable avant le build et le lancement. Retirer la variable après revue. L’aperçu affiche les statistiques et la dernière séance issues du loader existant, et identifie explicitement les exemples d’états d’erreur/chargement. Aucun exercice ou conseil technique n’est créé. Les boutons de démonstration changent uniquement la période ou l’état de l’aperçu.

## Performances et animations

Pas de nouvelle dépendance, police ou moteur d’animation. Les micro-interactions sont des transitions CSS de 160 ms, sans contenu masqué avant hydratation. Le mode réduit retire ces transitions, la rotation de chargement et la transformation à l’appui. Les animations Recharts des deux plots partagés ont été désactivées pour afficher directement les données ; leurs imports restent différés par les wrappers du Lot A.

Les cartes ordinaires n’ajoutent ni effet de survol 3D ni calcul de position au mouvement du pointeur. Le survol ne s’applique qu’aux périphériques fins qui le permettent. Les médias chargent seulement quand le composant est effectivement utilisé ; les trois visuels ne sont pas injectés globalement dans le Sport Hub.

Les loaders, le cache isolé à la requête, les URLs, les actions serveur, leurs revalidations et les mécanismes de brouillons du Lot A restent en place.
