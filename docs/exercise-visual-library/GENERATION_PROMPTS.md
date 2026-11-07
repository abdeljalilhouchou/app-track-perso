# Prompts de la série pilote

Outil utilisé : `image_gen` intégré, le 7 novembre 2026. Aucun appel à la CLI, aucune clé API du projet. Les fichiers et identifiants de sortie sont recensés dans [asset-files.json](./asset-files.json). Les textes ci-dessous constituent le jeu de prompts final normalisé pour réutilisation ; ils ne prétendent pas reproduire chaque répétition de contrainte des appels historiques.

## Direction commune

Use case: photorealistic-natural / scientific-educational. One landscape 3:2 instructional photograph for a premium exercise library. Exactly one adult male athlete, around 30, natural athletic build, short dark hair and short beard, opaque black sleeveless training shirt, charcoal shorts and plain training shoes. Quiet professional charcoal gym, soft natural window side light, subtle distant green accent, realistic skin and fabric, discreet background. Full working equipment and athlete visible. No text, arrows, captions, logos, watermarks, other people, extra limbs, fused hands, impossible joints, motion blur or collage. Preserve the same athlete, clothing, supports, camera angle and equipment between the two positions.

## 1. Développé incliné haltères — départ

Exact movement: two-dumbbell incline bench press. Bottom position at the start of the upward press. Adjustable bench with backrest visibly inclined moderately, approximately 30 degrees above horizontal, never flat or vertical. Head, shoulders, back and pelvis supported, both feet flat on floor. One matching dumbbell securely gripped in each hand beside the upper chest. Elbows bent around 90 degrees, wrists above elbows, elbows roughly 40–60 degrees from the torso. Palms generally forward, shoulders controlled. Side three-quarter view showing the bench incline, both dumbbells, limbs and feet. Leave room above the arms for the next position.

Sortie : `exec-47e9e317-eca7-4e66-b40f-5acb5199005b.png`.

## 2. Développé incliné haltères — arrivée

Edit the starting photograph. Preserve the same man, face, outfit, moderately inclined bench and mechanical base, supported back, planted feet, gym, light and camera angle. Change both arms to an almost fully extended press with separate dumbbells vertically above the upper chest/shoulder line. Neutral wrists, no shoulder shrug, no forced locking, no merged weights. Widen framing only if needed to keep the raised dumbbells and full bench visible. Do not turn the movement into a flat bench or seated shoulder press.

Référence : sortie 1. Sortie : `exec-b03cadbd-adcd-4d33-890a-cab793464e66.png`.

## 3. Rowing unilatéral — départ

Edit the existing `public/images/exercises/one-arm-dumbbell-row.webp` photograph, which already shows the contracted position. Preserve the exact adult man, gym, bench, same-side supporting hand and knee, opposite foot on the floor, square hips and neutral near-horizontal back. Lower only the working arm and dumbbell until the elbow is nearly straight and the wrist is below the working shoulder. Dumbbell hangs freely without intersecting bench or leg. Keep shoulder control and avoid torso rotation. The arm must be visibly straighter and the dumbbell lower than the reference.

Sortie : `exec-3ebf0eb0-6086-43f4-9d89-c8d2695a21d5.png`. La position d’arrivée et la photo principale existantes sont conservées, sans régénération.

## 4. Squat — départ

Exact illustrated variant: high-bar barbell back squat, clearly identified as one example for the generic catalog entry Squat. Standing position, hips and knees extended comfortably, feet shoulder-width with slight toe-out and whole feet grounded. Barbell rests on the upper-back trapezius shelf behind the neck, never on the neck or in front. Both hands grip outside the shoulders, neutral plausible wrists, elbows down/back. Matching modest plates and collars. Hip-height three-quarter camera showing the bar, hands, knees, heels and feet. Squat rack behind, safety arms outside the body and below the bar path.

Sortie : `exec-17a57a67-d075-4eb4-834b-2af6b70b79e1.png`.

## 5. Squat — point bas

Edit the standing photograph into the bottom of a controlled descent. Preserve the man, face, outfit, bar, plates, hands, rack, stance, gym and camera. Bend hips and knees until thighs are approximately parallel, heels and whole feet grounded, knees following toes, hips slightly back and spine neutral. Bar remains supported on the upper back and balanced over the midfoot. No exaggerated arch, collapsed ankles, floating bar or missing heels. The pelvis must be clearly lower than the reference. This is the bottom of the descent, not the end of the complete repetition.

Référence : sortie 4. Sortie : `exec-15b80147-9654-4333-9154-828982196a94.png`.

## 6. Curl incliné — départ

Exact movement: seated incline dumbbell biceps curl, never standing curl or chest press. Backrest approximately 55–60 degrees above horizontal. Back/head supported, feet planted. One dumbbell in each hand; upper arms hang vertically beside and slightly behind the torso, elbows almost straight without forced locking, palms forward in supination and wrists neutral. Upper arms must not lie along the bench or rise for a press. Three-quarter side view showing the bench recline, both hands/dumbbells and feet.

Sortie : `exec-b2888b29-66b0-4ece-a726-bc52c1adc4f3.png`.

## 7. Curl incliné — arrivée

Edit the starting photograph, preserving the same man, face, outfit, reclined bench, support points, light and camera. Keep upper arms/elbows beside and slightly behind the torso. Flex both elbows to bring each separate dumbbell toward its shoulder, palms supinated, wrists neutral. Forearms point upward, elbows clearly bent. No forward elbow drive, raised upper arms, overhead pressing, swinging or torso leaning away from the bench.

Référence : sortie 6. Sortie : `exec-e1b9b4da-6694-447a-8126-99271283784b.png`.

## 8. Tirage horizontal poulie — départ

Exact movement: seated low cable row with a close neutral-grip V-handle. Torso nearly upright and stable, neutral spine, knees softly bent, both feet braced on the machine's footplates. Both arms reach forward with elbows almost straight. Both hands grip the two parallel grips of one mechanically plausible handle, palms facing each other. One taut cable connects the center of the handle forward and slightly down to the visible low pulley in front of the feet. No cable through the body or attached to a hand. Side three-quarter view showing the entire handle, both arms, feet, footplates and pulley; not a lat pulldown.

Sortie : `exec-9c630a65-8f64-46ea-b3b9-235991317634.png`.

## 9. Tirage horizontal poulie — arrivée

Edit the starting photograph and preserve the same man, posture, seat, footplates, knees, pulley, handle, gym and camera. Flex both elbows to pull the same handle toward the upper abdomen/lower ribs. Elbows move back near the torso, shoulder blades retract gently, wrists stay neutral, no backward torso swing. Keep one taut cable connected to the handle center and the same low pulley. It must not pass through the body. Hands, elbows, footplates and pulley remain visible; the handle must be distinctly closer to the abdomen than in the start image.

Référence : sortie 8. Sortie : `exec-3609e9f5-c9fa-46c0-bad2-9ea25441f329.png`.

## Vérification et réutilisation

Les neuf sorties ont été inspectées avant encodage et intégration : mouvement/variante, équipement, appuis, prise, articulations visibles, différence de position et absence d’incohérence majeure apparente. Les proportions et angles sont appréciés visuellement, pas mesurés ni certifiés. La revue des cinq pilotes par l’utilisateur reste à faire.

Les trois photographies antérieures ont aussi été inspectées et leurs empreintes vérifiées. Aucune photographie de tiers n’a été téléchargée ; les références techniques ne fournissent pas les pixels des visuels. Aucune licence Creative Commons, propriété exclusive ou autorisation d’un photographe tiers n’est inventée.
