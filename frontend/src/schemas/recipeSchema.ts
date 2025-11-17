/**
 * Recipe Form Validation Schema
 */

import { z } from 'zod';

// Ingredient schema
export const ingredientSchema = z.object({
  name: z.string().min(1, 'Ingredient name is required'),
  quantity: z.string().optional(),
});

// Cooking step schema
export const cookingStepSchema = z.object({
  instruction: z.string().min(1, 'Instruction is required'),
  estimated_time: z.number().min(0).optional(),
});

// Timer schema
export const timerSchema = z.object({
  name: z.string().min(1, 'Timer name is required'),
  duration: z.number().min(1, 'Duration must be at least 1 second'),
  step_order: z.number().optional(),
});

// Full recipe schema
export const recipeSchema = z.object({
  name: z.string().min(1, 'Recipe name is required').max(200, 'Recipe name is too long'),
  description: z.string().optional(),
  prep_time: z.number().min(0, 'Prep time must be 0 or greater'),
  cook_time: z.number().min(0, 'Cook time must be 0 or greater'),
  servings: z.number().min(1, 'Must serve at least 1 person').max(100, 'Too many servings'),
  image_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  source_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  assigned_to_id: z.number().optional(),
  ingredients: z.array(ingredientSchema).min(1, 'At least one ingredient is required'),
  steps: z.array(cookingStepSchema).min(1, 'At least one cooking step is required'),
  timers: z.array(timerSchema),
});

export type RecipeFormValues = z.infer<typeof recipeSchema>;
