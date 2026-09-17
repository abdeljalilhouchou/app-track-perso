export type SeedFood = {
  name: string;
  icon: string;
  category: string;
  // Per 100g
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export const FOOD_CATEGORIES = [
  "Viandes & volailles",
  "Poissons & fruits de mer",
  "Œufs & laitiers",
  "Féculents",
  "Légumineuses",
  "Légumes",
  "Fruits",
  "Matières grasses & oléagineux",
  "Autres",
] as const;

export const DEFAULT_FOODS: SeedFood[] = [
  // Viandes & volailles
  { name: "Poitrine de poulet (crue)", icon: "🍗", category: "Viandes & volailles", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "Cuisse de poulet (crue)", icon: "🍗", category: "Viandes & volailles", calories: 209, protein: 26, carbs: 0, fat: 10.9 },
  { name: "Bœuf haché 5% MG", icon: "🥩", category: "Viandes & volailles", calories: 137, protein: 21, carbs: 0, fat: 5 },
  { name: "Bœuf haché 15% MG", icon: "🥩", category: "Viandes & volailles", calories: 215, protein: 19, carbs: 0, fat: 15 },
  { name: "Steak de bœuf", icon: "🥩", category: "Viandes & volailles", calories: 271, protein: 25, carbs: 0, fat: 19 },
  { name: "Agneau", icon: "🍖", category: "Viandes & volailles", calories: 294, protein: 25, carbs: 0, fat: 21 },
  { name: "Blanc de dinde", icon: "🍗", category: "Viandes & volailles", calories: 135, protein: 30, carbs: 0, fat: 1 },
  { name: "Merguez", icon: "🌭", category: "Viandes & volailles", calories: 300, protein: 17, carbs: 2, fat: 25 },
  { name: "Jambon", icon: "🍖", category: "Viandes & volailles", calories: 145, protein: 21, carbs: 1, fat: 6 },
  { name: "Foie de bœuf", icon: "🍖", category: "Viandes & volailles", calories: 135, protein: 20, carbs: 3.9, fat: 3.6 },

  // Poissons & fruits de mer
  { name: "Saumon", icon: "🐟", category: "Poissons & fruits de mer", calories: 208, protein: 20, carbs: 0, fat: 13 },
  { name: "Thon (nature, égoutté)", icon: "🐟", category: "Poissons & fruits de mer", calories: 132, protein: 28, carbs: 0, fat: 1 },
  { name: "Sardine", icon: "🐟", category: "Poissons & fruits de mer", calories: 208, protein: 25, carbs: 0, fat: 11 },
  { name: "Crevettes", icon: "🦐", category: "Poissons & fruits de mer", calories: 99, protein: 24, carbs: 0.2, fat: 0.3 },
  { name: "Cabillaud", icon: "🐟", category: "Poissons & fruits de mer", calories: 82, protein: 18, carbs: 0, fat: 0.7 },
  { name: "Dorade", icon: "🐟", category: "Poissons & fruits de mer", calories: 96, protein: 20, carbs: 0, fat: 1.7 },

  // Œufs & laitiers
  { name: "Œuf entier", icon: "🥚", category: "Œufs & laitiers", calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  { name: "Blanc d'œuf", icon: "🥚", category: "Œufs & laitiers", calories: 52, protein: 11, carbs: 0.7, fat: 0.2 },
  { name: "Lait entier", icon: "🥛", category: "Œufs & laitiers", calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 },
  { name: "Lait écrémé", icon: "🥛", category: "Œufs & laitiers", calories: 34, protein: 3.4, carbs: 5, fat: 0.1 },
  { name: "Yaourt nature", icon: "🥣", category: "Œufs & laitiers", calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3 },
  { name: "Yaourt grec", icon: "🥣", category: "Œufs & laitiers", calories: 97, protein: 9, carbs: 4, fat: 5 },
  { name: "Fromage blanc", icon: "🥣", category: "Œufs & laitiers", calories: 98, protein: 11, carbs: 3.6, fat: 4.3 },
  { name: "Fromage (type gouda/cheddar)", icon: "🧀", category: "Œufs & laitiers", calories: 356, protein: 25, carbs: 2, fat: 27 },
  { name: "Fromage frais (type Kiri/Vache qui rit)", icon: "🧀", category: "Œufs & laitiers", calories: 260, protein: 9, carbs: 3, fat: 23 },

  // Féculents
  { name: "Riz blanc (cuit)", icon: "🍚", category: "Féculents", calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: "Riz blanc (cru)", icon: "🍚", category: "Féculents", calories: 365, protein: 7, carbs: 80, fat: 0.7 },
  { name: "Pâtes (cuites)", icon: "🍝", category: "Féculents", calories: 131, protein: 5, carbs: 25, fat: 1.1 },
  { name: "Pâtes (crues)", icon: "🍝", category: "Féculents", calories: 371, protein: 13, carbs: 75, fat: 1.5 },
  { name: "Pain blanc", icon: "🍞", category: "Féculents", calories: 265, protein: 9, carbs: 49, fat: 3.2 },
  { name: "Pain complet", icon: "🍞", category: "Féculents", calories: 247, protein: 13, carbs: 41, fat: 3.4 },
  { name: "Khobz (pain marocain)", icon: "🍞", category: "Féculents", calories: 275, protein: 8.5, carbs: 53, fat: 3 },
  { name: "Pomme de terre (cuite)", icon: "🥔", category: "Féculents", calories: 87, protein: 1.9, carbs: 20, fat: 0.1 },
  { name: "Frites", icon: "🍟", category: "Féculents", calories: 312, protein: 3.4, carbs: 41, fat: 15 },
  { name: "Couscous (cuit)", icon: "🍚", category: "Féculents", calories: 112, protein: 3.8, carbs: 23, fat: 0.2 },
  { name: "Quinoa (cuit)", icon: "🍚", category: "Féculents", calories: 120, protein: 4.4, carbs: 21, fat: 1.9 },
  { name: "Semoule (crue)", icon: "🌾", category: "Féculents", calories: 360, protein: 12.7, carbs: 72, fat: 0.6 },
  { name: "Flocons d'avoine", icon: "🌾", category: "Féculents", calories: 389, protein: 16.9, carbs: 66, fat: 6.9 },

  // Légumineuses
  { name: "Lentilles (cuites)", icon: "🫘", category: "Légumineuses", calories: 116, protein: 9, carbs: 20, fat: 0.4 },
  { name: "Pois chiches (cuits)", icon: "🫘", category: "Légumineuses", calories: 164, protein: 8.9, carbs: 27, fat: 2.6 },
  { name: "Haricots blancs (cuits)", icon: "🫘", category: "Légumineuses", calories: 127, protein: 8.7, carbs: 23, fat: 0.5 },
  { name: "Fèves (cuites)", icon: "🫘", category: "Légumineuses", calories: 88, protein: 7.6, carbs: 17.6, fat: 0.4 },

  // Légumes
  { name: "Tomate", icon: "🍅", category: "Légumes", calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  { name: "Concombre", icon: "🥒", category: "Légumes", calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1 },
  { name: "Carotte", icon: "🥕", category: "Légumes", calories: 41, protein: 0.9, carbs: 10, fat: 0.2 },
  { name: "Courgette", icon: "🥒", category: "Légumes", calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3 },
  { name: "Oignon", icon: "🧅", category: "Légumes", calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
  { name: "Brocoli", icon: "🥦", category: "Légumes", calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  { name: "Épinards", icon: "🥬", category: "Légumes", calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  { name: "Poivron", icon: "🫑", category: "Légumes", calories: 31, protein: 1, carbs: 6, fat: 0.3 },
  { name: "Salade verte", icon: "🥬", category: "Légumes", calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2 },
  { name: "Aubergine", icon: "🍆", category: "Légumes", calories: 25, protein: 1, carbs: 6, fat: 0.2 },

  // Fruits
  { name: "Pomme", icon: "🍎", category: "Fruits", calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { name: "Banane", icon: "🍌", category: "Fruits", calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { name: "Orange", icon: "🍊", category: "Fruits", calories: 47, protein: 0.9, carbs: 12, fat: 0.1 },
  { name: "Datte", icon: "🌴", category: "Fruits", calories: 277, protein: 1.8, carbs: 75, fat: 0.2 },
  { name: "Raisin", icon: "🍇", category: "Fruits", calories: 69, protein: 0.7, carbs: 18, fat: 0.2 },
  { name: "Fraise", icon: "🍓", category: "Fruits", calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3 },
  { name: "Pastèque", icon: "🍉", category: "Fruits", calories: 30, protein: 0.6, carbs: 7.6, fat: 0.2 },
  { name: "Avocat", icon: "🥑", category: "Fruits", calories: 160, protein: 2, carbs: 8.5, fat: 14.7 },
  { name: "Figue", icon: "🫒", category: "Fruits", calories: 74, protein: 0.8, carbs: 19, fat: 0.3 },
  { name: "Mangue", icon: "🥭", category: "Fruits", calories: 60, protein: 0.8, carbs: 15, fat: 0.4 },

  // Matières grasses & oléagineux
  { name: "Huile d'olive", icon: "🫒", category: "Matières grasses & oléagineux", calories: 884, protein: 0, carbs: 0, fat: 100 },
  { name: "Beurre", icon: "🧈", category: "Matières grasses & oléagineux", calories: 717, protein: 0.9, carbs: 0.1, fat: 81 },
  { name: "Amandes", icon: "🌰", category: "Matières grasses & oléagineux", calories: 579, protein: 21, carbs: 22, fat: 50 },
  { name: "Noix", icon: "🌰", category: "Matières grasses & oléagineux", calories: 654, protein: 15, carbs: 14, fat: 65 },
  { name: "Cacahuètes", icon: "🥜", category: "Matières grasses & oléagineux", calories: 567, protein: 26, carbs: 16, fat: 49 },
  { name: "Beurre de cacahuète", icon: "🥜", category: "Matières grasses & oléagineux", calories: 588, protein: 25, carbs: 20, fat: 50 },

  // Autres
  { name: "Miel", icon: "🍯", category: "Autres", calories: 304, protein: 0.3, carbs: 82, fat: 0 },
  { name: "Sucre", icon: "🧂", category: "Autres", calories: 387, protein: 0, carbs: 100, fat: 0 },
  { name: "Chocolat noir", icon: "🍫", category: "Autres", calories: 546, protein: 7.8, carbs: 46, fat: 31 },
  { name: "Houmous", icon: "🥣", category: "Autres", calories: 166, protein: 7.9, carbs: 14, fat: 9.6 },
  { name: "Olives", icon: "🫒", category: "Autres", calories: 115, protein: 0.8, carbs: 6, fat: 11 },
];

export function computeMacros(food: { calories: number; protein: number; carbs: number; fat: number }, grams: number) {
  const ratio = grams / 100;
  return {
    calories: Math.round(food.calories * ratio),
    protein: Math.round(food.protein * ratio * 10) / 10,
    carbs: Math.round(food.carbs * ratio * 10) / 10,
    fat: Math.round(food.fat * ratio * 10) / 10,
  };
}
