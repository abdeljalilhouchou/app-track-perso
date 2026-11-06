# Lot C — Sport Hub premium

6 novembre 2026. Les lots A et B ont été validés par l’utilisateur ; ce livrable couvre uniquement le Lot C. Les validations physiques sur smartphone et les contrôles Supabase réels restent distincts des tests locaux.

## Dépôt et périmètre

Branche contrôlée avant modification : `track-perso-sport-premium-lot-a`, HEAD `742b0f6`. L’arbre contenait les changements non commités des lots A et B ; ils ont été conservés. `main` reste sur son commit initial. Aucun changement de branche, commit, push, déploiement, migration ou écriture en base réelle.

La bibliothèque d’exercices et la refonte du Workout Mode ne sont pas commencées. Les modifications de Musculation concernent seulement la sélection d’onglets par URL, afin de raccorder les accès rapides au véritable espace existant.

## Interface livrée

`/sport` est désormais un dashboard rendu côté serveur, assemblé avec les composants du Lot B :

1. En-tête Sport compact, avec l’icône et la description traduites.
2. Carte principale avec photo d’ambiance et action « Préparer ma séance », qui rejoint la section de suggestion.
3. Résumé de semaine en trois cartes : séances, minutes, réalisation de l’objectif. Le contrôle existant d’édition de l’objectif reste disponible dans « Ajuster mon objectif ».
4. Trois cartes de discipline côte à côte, avec les images WebP du Lot B, icônes et état de disponibilité.
5. Quatre accès rapides vers Calendrier, Historique, Programmes et Statistiques.
6. Carte de prochaine séance proposée depuis un programme réellement enregistré, ou état vide donnant accès à la séance libre/programmes existants.
7. Repères de volume musculation, fréquence actuelle et durée cumulée, avec portée de chaque mesure indiquée.
8. Six activités récentes au maximum, avec date et durée réelles et liens vers les détails adaptés à leur discipline.
9. Graphique hebdomadaire différé et répartition identifiable conservés, déplacés sous les actions principales.

Les surfaces, coins, contrôles tactiles, icônes, couleurs vert/violet et états de focus proviennent du design system. Aucun nouveau provider, moteur d’animation, package ou police. Le mode réduit continue de supprimer les micro-transitions.

Les cartes sont compactes sur mobile ; à partir de 1 024 px, suggestion et repères se présentent sur deux colonnes. Graphique et répartition occupent également deux colonnes sur grand écran. Safe areas, barre principale mobile et sidebar desktop existantes sont conservées.

## Navigation réelle

Les six grandes cartes permanentes de `SportHubNav` sont supprimées. Sur le Hub, les disciplines et raccourcis constituent les entrées directes. Sur les autres pages Sport, une seule ligne contient un retour vers Sport et un sélecteur contextuel natif `details/summary` réutilisant `SportSectionNavigation` du Lot B.

Ce sélecteur conserve les six destinations précédentes. Il se ferme à la sélection, à l’extérieur et avec Échap ; Échap rend le focus au résumé. Ce n’est pas un menu ARIA imposant une navigation clavier spéciale : les liens restent des liens natifs accessibles au Tab. La liste s’affiche seulement à l’ouverture, dans une zone de hauteur bornée.

| Accès | Destination |
| --- | --- |
| Musculation | `/sport/musculation` |
| Calisthenics | `/sport/calisthenics` — page existante, gate conservé |
| Running | `/sport/running` — page existante, gate conservé |
| Calendrier | `/sport/calendar` |
| Historique multisport | `/sport/calendar#sport-calendar-activities` — liste réelle du mois, mois antérieurs accessibles dans le calendrier |
| Programmes | `/sport/musculation?tab=program` |
| Statistiques | `/sport/stats` |
| Historique Musculation, dans le sélecteur de cet espace | `/sport/musculation?tab=history` |

Le parseur accepte aussi les onglets session/progress/stats. Une modification de query string ajuste l’onglet actif **sans remonter les panneaux visités** : la séance en cours conserve son état. Les liens `?date=…` continuent d’ouvrir l’historique ; la redirection de compatibilité `/sport?date=…` est conservée.

## Origine et règles des données

Le composant de présentation ne contacte pas Supabase et ne crée aucune donnée. Le loader existant reçoit une option `dashboard: true` pour les seules données supplémentaires du Hub.

| Donnée affichée | Source / règle |
| --- | --- |
| Séances et durée de semaine, totaux, objectif et semaines d’objectif | `computeSportStats` et préférences existantes, sans modification de calcul. |
| Répartition Musculation/Calisthenics/Running/non classé | Logique de l’ancien Hub extraite sans changement. Les lignes historiques sans discipline restent identifiables par leur programme ou leurs séries. Une activité non classée ne reçoit pas arbitrairement une icône Musculation. |
| Volume musculation de la semaine | Séries `workout_sets` appartenant à l’utilisateur, liées aux séances de la semaine jusqu’à aujourd’hui, hors Calisthenics/Running ; calcul existant `setsVolume` (somme charge × répétitions, arrondie au kg). Aucun tonnage attribué aux autres disciplines. |
| Aucune série connue cette semaine | « — » avec explication ; pas de faux 0 kg. Des séries réellement enregistrées avec charge additionnelle nulle peuvent afficher un vrai 0 kg. |
| Fréquence | Nombre réel de séances dans la semaine en cours, sans projection ni moyenne annuelle inventée. |
| Durée cumulée | Total existant de toutes les séances enregistrées, seulement formaté en heures/minutes. |
| Prochaine séance | Programme privé existant choisi par `suggestNextTemplate`, avec le même ordre et périmètre que Musculation. Badge « Suggestion du programme », aucune date ou durée estimée ajoutée. L’accès ouvre l’espace existant, où l’utilisateur prépare/démarre sa séance. |
| Activités récentes | Les six premières séances réelles datées d’aujourd’hui ou avant, dans l’ordre du loader existant. Aucun événement futur présenté comme activité accomplie. |

Les totaux, la répartition et le graphique gardent leurs règles existantes ; le filtre de date sur les activités récentes et le volume ne modifie pas les lignes enregistrées. Aucun nouveau record n’est annoncé, aucune calorie calculée.

Les tables Calisthenics/Running ne sont jamais interrogées par le Hub. Les flags de schéma existants sont seulement lus pour afficher « En préparation » lorsque nécessaire. Aucun flag activé et aucun schéma présumé appliqué. Les liens restent accessibles vers les pages de préparation existantes.

## Performance et médias

- Rendu du dashboard côté serveur ; pas d’état global supplémentaire.
- Lectures indépendantes et traductions parallèles, cache utilisateur/préférences limité à la requête, validations et revalidations préservées.
- Une seule nouvelle lecture paginée des programmes, filtrée par propriétaire ; seulement id, nom et groupes musculaires demandés.
- La lecture déjà présente des identifiants de séries récupère aussi reps/charge pour calculer le volume dans le même passage, sans requête N+1. Le coût de deux colonnes supplémentaires sur cet historique est réel et n’est pas présenté comme une réduction de données SQL.
- Les scans historiques nécessaires aux totaux et à la classification restent paginés sans troncature silencieuse.
- Graphiques toujours différés ; panneaux Musculation montés à la demande ; absence de préchargement intégral forcé. Les liens des six activités récentes utilisent `prefetch={false}`.
- Les trois WebP du Lot B sont réutilisés : **109 616 octets au total**, aucune nouvelle image créée. Seule l’image principale utilise `loading="eager"` ; les cartes restent en lazy loading avec `sizes` adapté et hauteur réservée. Aucune vidéo ni ressource distante ajoutée.

Le [registre des médias](../design-system/MEDIA_REGISTRY.md) conserve les sources et prompts de génération, et décrit maintenant l’utilisation sur le Hub. Les illustrations d’ambiance ne servent pas de démonstrations techniques.

| Route | Avant Lot C (Kio gzip) | Après Lot C (Kio gzip) | Variation (Kio) |
| --- | ---: | ---: | ---: |
| /dashboard | 288.2 | 289.6 | +1.3 |
| /habits | 302.6 | 304.0 | +1.3 |
| /nutrition | 309.9 | 311.2 | +1.3 |
| /humeur | 296.7 | 298.0 | +1.3 |
| /profil | 356.3 | 357.6 | +1.3 |
| /sport | 284.3 | 291.8 | +7.5 |
| /sport/musculation | 312.6 | 314.3 | +1.8 |
| /sport/calendar | 280.2 | 283.7 | +3.5 |
| /sport/stats | 293.1 | 295.0 | +1.9 |
| /sport/calisthenics | 299.7 | 303.1 | +3.4 |
| /sport/running | 295.5 | 299.0 | +3.5 |

La comparaison utilise les mêmes manifestes de build et le même calcul gzip fichier par fichier que les lots précédents. Elle ne constitue pas une mesure réseau sur téléphone ou une comparaison LCP/INP/TTFB. Les snapshots A et B sont conservés ; aucun gain de latence Supabase réelle n’est inventé.

## Tests

**Tests ciblés : 22 réussis**, dont les 14 tests des lots A/B et huit tests du Hub : classification historique sans double compte, volume hebdomadaire sans futur/autres disciplines, distinction volume absent/zéro connu, suggestion issue d’un programme existant sans date fictive, onglets par URL et compatibilité date, liens de détail encodés, lectures isolées au propriétaire sans tables désactivées et traductions FR/EN/AR.

**Edge headless, build de production local, serveur Auth/REST fictif isolé :**

- 42 combinaisons FR/EN/AR × clair/sombre × 320/360/375/390/430/768/1440 px, sans débordement horizontal de page.
- Thème Système vérifié en préférence claire puis sombre, avec changement effectif du fond.
- Six destinations Sport existantes parcourues ; menu compact, Échap et retour de focus vérifiés.
- Brouillon conservé entre onglets puis lors des transitions `?tab=program` et `?tab=history`, même champ et même valeur conservés.
- Un programme de test et un volume connu issus des fixtures sont visibles ; états sans séries et sans aucune donnée vérifiés séparément.
- Raccourci Programmes, ancre de l’historique mensuel et ancienne redirection de date vérifiés.
- Graphique différé effectivement rendu, aucune erreur console inattendue, aucune écriture HTTP ni lecture des tables Calisthenics/Running désactivées.
- Une lecture volontairement mise en échec avec HTTP 503 déclenche le véritable écran d’erreur ; le bouton de reprise utilise la propriété `retry` documentée par Next.js 16.3.5 et recharge le Hub après retour de l’API fictive. L’erreur React attendue est conservée séparément dans les résultats, sans masquer les erreurs des autres phases.

Les données fictives existent seulement dans le processus de test local. Le code livré lit les données Supabase de l’utilisateur authentifié. Les guides de navigation, d’images et de gestion d’erreurs de la version Next installée ont servi aux vérifications d’API.

Résultats : [lot-c-browser.json](./lot-c-browser.json). Captures : [clair](./hub-fr-light.webp), [sombre](./hub-fr-dark.webp), [arabe sombre](./hub-ar-dark.webp), [sans données](./hub-empty.webp).

**Vérifications techniques finales réussies :** `npx --no-install tsc --noEmit`, `npm run lint`, `npm run build`, `git diff --check` et les 22 tests ciblés. Le dernier build est un build normal, après restauration de la configuration habituelle.

Restent à vérifier sur environnement réel : smartphone physique, 4G, sessions Supabase, sauvegardes et politiques RLS. Les tests locaux ne valident pas l’exécution des migrations 0019/0020, la latence interrégions ni tous les anciens parcours de chaque discipline.

## Fichiers créés dans ce lot

- `src/components/sport/sport-dashboard.tsx`
- `src/lib/sport-hub.ts`
- `src/lib/sport-navigation.ts`
- `src/lib/i18n/modules/sport-hub.ts`
- `src/app/(app)/sport/error.tsx`
- `scripts/sport-hub.test.mjs`
- Sous `docs/sport-hub/` : ce rapport, snapshots avant/après, résultats Edge et captures de revue.

## Fichiers modifiés dans ce lot

- `src/app/(app)/sport/page.tsx` — page serveur du nouveau Hub et redirection conservée.
- `src/components/sport/sport-hub-nav.tsx` — suppression de la grille permanente, sélecteur contextuel.
- `src/lib/sport-hub-data.ts` — données supplémentaires du dashboard uniquement.
- `src/app/(app)/sport/musculation/page.tsx` et `src/components/sport/sport-tabs.tsx` — accès aux vrais onglets par query string, état conservé.
- `src/app/(app)/sport/calendar/page.tsx` — ancre sur la liste mensuelle existante, sans changement de loader/calcul.
- `src/components/sport/ui/sport-content-cards.tsx` — variante compacte des cartes de discipline, défaut du Lot B conservé.
- `src/components/sport/ui/sport-media.tsx` — option eager pour l’image principale, lazy par défaut conservé.
- `src/components/sport/ui/sport-ui.css` — layout du Hub, cartes compactes et disclosure contextuel, styles limités à Sport.
- `src/lib/i18n/modules/sport.ts` — raccordement des nouvelles traductions.
- `scripts/performance-browser.mjs` — scénario `--hub`, fixtures et synchronisation des navigations complètes.
- `docs/design-system/ARCHITECTURE.md` et `MEDIA_REGISTRY.md` — documentation vivante des composants et médias réutilisés.

La barre principale mobile, la sidebar desktop, les actions serveur, le logger de séance, les calculs sportifs existants, les schémas et migrations n’ont pas été modifiés dans ce lot.

## Reproduire

```powershell
node --test scripts/sport-hub.test.mjs scripts/design-system.test.mjs scripts/performance.test.mjs
npx --no-install tsc --noEmit
npm run lint
npm run build
git diff --check
```

Test Edge optionnel : `node scripts/performance-browser.mjs --production --hub`. Il construit avec une API fictive locale ; copier les résultats depuis `.next/qa`, puis refaire impérativement `npm run build` avant un `npm start` normal. Le build habituel est restauré pour la livraison ; aucun fichier de secrets n’est modifié.

Le Lot C est livré pour validation. Aucun travail de bibliothèque d’exercices ou de nouveau Workout Mode n’est inclus ou commencé.
