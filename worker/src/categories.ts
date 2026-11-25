/**
 * Store sections for shopping items, guessed from the ingredient name
 */

// First matching keyword wins, so more specific groups come first
const CATEGORY_KEYWORDS: Array<[string, string[]]> = [
  ['Pantry', ['broth', 'stock', 'juice']],
  ['Meat', ['turkey', 'ham', 'chorizo', 'sausage', 'bacon', 'beef', 'pork']],
  ['Dairy & eggs', ['butter', 'milk', 'cream', 'half-and-half', 'egg', 'cheese', 'yogurt']],
  [
    'Produce',
    ['potato', 'onion', 'garlic', 'celery', 'apple', 'orange', 'lemon', 'cranberr', 'green bean', 'mushroom',
     'chive', 'sprout', 'carrot', 'fresh'],
  ],
  ['Spices', ['cinnamon', 'clove', 'ginger', 'nutmeg', 'allspice', 'pepper', 'salt', 'sage', 'rosemary', 'thyme']],
  ['Baking', ['flour', 'sugar', 'pie shell', 'pie crust', 'panko', 'bread crumb', 'vanilla', 'honey', 'pumpkin']],
  ['Bakery', ['roll', 'bread', 'stuffing']],
  ['Pantry', ['mustard', 'oil', 'spray', 'vinegar']],
];

export function guessCategory(name: string): string {
  const lowered = name.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((keyword) => lowered.includes(keyword))) return category;
  }
  return 'Other';
}
