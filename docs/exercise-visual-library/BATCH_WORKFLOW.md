# Procédure après validation des cinq pilotes

La génération des autres exercices reste arrêtée jusqu’à la validation utilisateur des cinq fiches pilotes. Les 63 références sans photographie conservent leur schéma ou leur état sans photo ; aucune association n’est fabriquée pour les compter comme illustrées.

1. Sélectionner un lot limité de 5 à 10 identifiants dans `catalog-inventory.json`. Vérifier le nom canonique, l’équipement, les alias et la variante exacte ; clarifier une variante ambiguë avant de produire une image.
2. Consulter une source technique primaire et consigner les appuis, prises, trajectoire, position du bassin/rachis et points articulaires à inspecter. Ne copier ni images ni texte de la source sans droits appropriés.
3. Rédiger un prompt individuel selon `GENERATION_PROMPTS.md`, avec hommes adultes uniquement et direction visuelle commune. Définir explicitement la position principale et les positions techniques utiles.
4. Générer un premier cliché avec l’outil intégré ; l’inspecter avant de produire la seconde position en édition de ce même cliché. Préserver athlète, matériel, appuis et point de vue. Une pose techniquement incohérente reste rejetée, même si l’image est esthétique.
5. Archiver provenance, prompt, identifiant de sortie, revue, limites et référence technique. Le statut reste `pending` tant que l’image n’a pas passé la revue ; les enregistrements non revus ne doivent pas alimenter le registre actif.
6. Encoder uniquement les images acceptées : WebP principal/étapes de 960 × 640 au plus, miniature de 320 × 213, métadonnées inutiles supprimées. Conserver les corps et le matériel en entier ; utiliser le mode `contain` pour les petits cadres carrés.
7. Ajouter l’identifiant exact au registre détaillé côté serveur et à son index de miniatures. Ne créer aucune entrée de catalogue, migration ou association d’exercice personnalisé sur simple titre.
8. Relancer `node scripts/exercise-media-audit.mjs`, les tests de médias, TypeScript, ESLint, le build et `git diff --check`. Vérifier les empreintes des photos déjà présentes et des fichiers d’anatomie protégés.
9. Contrôler dans Edge : miniature dans bibliothèque/programme/séance, photo détaillée, vraies positions distinctes, absence de téléchargement de grandes images dans le catalogue, images d’étapes seulement après ouverture, fallback, AR/RTL et thèmes clair/sombre/System. Conserver les captures et métriques.
10. Faire valider le lot et son tableau de correspondance. Aucun commit, push ou déploiement sans instruction explicite.

Le nombre affiché doit toujours provenir des lignes réellement chargées et être ventilé entre références Musculation, exercices personnels et Calisthenics. Le nombre de médias est calculé à partir des fichiers existants et du registre revu, jamais à partir d’une cible commerciale.
