# Registre des médias Sport — Lot B

Les trois visuels sont des images d’ambiance **générées pour ce projet**, pas des photos d’utilisateurs ni des démonstrations de mouvements. Aucun média de banque d’images ou de moteur de recherche n’a été repris. Aucun exercice n’y est associé.

| Fichier local | Discipline | Dimensions | Poids | Texte alternatif |
| --- | --- | --- | ---: | --- |
| `public/images/sport/strength.webp` | Musculation | 768 × 512 | 33 270 octets | Visuel d’ambiance généré : haltères sur le sol d’une salle de sport. |
| `public/images/sport/calisthenics.webp` | Calisthenics | 768 × 512 | 36 606 octets | Visuel d’ambiance généré : anneaux de gymnastique dans un parc de calisthenics. |
| `public/images/sport/running.webp` | Running | 768 × 512 | 39 740 octets | Visuel d’ambiance généré : chaussures de running sur une piste. |

Total : **109 616 octets, soit 107,0 Kio**. Les traductions explicites FR/EN/AR des alternatives se trouvent dans `src/lib/i18n/modules/sport-ui.ts`. Les images intégrées comme simple décoration d’un lien utilisent `alt=""`, car le nom de discipline est déjà présent dans ce lien.

**Source / auteur :** outil intégré `image_gen.imagegen`, génération du 6 novembre 2026. Les prompts finaux exacts sont conservés dans [media-prompts.json](./media-prompts.json). Production photoréaliste, sans texte, marque, personne ou mouvement sportif à valider. Les résultats ont été inspectés puis réduits et encodés en WebP avec Sharp déjà installé ; aucune dépendance ajoutée.

**Droits / licence :** contenu généré spécifiquement pour Track Perso, sans asset tiers importé ni licence de stock revendiquée. Aucune attribution à un photographe tiers ; aucune revendication de licence CC0, d’exclusivité ou de photographie d’un lieu réel. Les originaux restent dans le répertoire de génération de Codex ; seules les versions légères ci-dessus sont servies par l’application.

**Utilisation actuelle :** depuis le Lot C, carte principale et cartes de disciplines sur `/sport`, ainsi que la vignette de suggestion de séance. L’aperçu interne `/sport/design-system` reste disponible seulement avec `SPORT_UI_PREVIEW=true`. Aucun nouveau fichier d’image ni nouvelle génération pour le Lot C. Ne pas employer ces visuels d’ambiance sur une fiche d’exercice en prétendant illustrer une technique précise.

**Chargement :** `next/image`, dimensions réservées par le ratio CSS, `sizes` explicite, chargement natif différé. Seule l’image principale au-dessus de la ligne de flottaison utilise `loading="eager"` au Lot C ; les cartes restent différées. Une absence de source ou une erreur de chargement affiche un remplacement thématique stable. Aucun lecteur vidéo, autoplay ou média distant ajouté.
