/**
 * Zod schemas for recipe forms
 */

import { z } from 'zod';

export const ingredientSchema = z.object({
  name: z.string().min(1, 'Ingredient name is required'),
  quantity: z.string().optional(),
});

export const stepSchema = z.object({
  instruction: z.string().min(1, 'Instruction is required'),
  estimated_time: z.number().min(0).optional(),
});

export const timerSchema = z.object({
  name: z.string().min(1, 'Timer name is required'),
  duration: z.number().min(1, 'Duration must be at least 1 second'),
  step_order: z.number().optional(),
});

export const recipeSchema = z.object({
  name: z
    .string()
    .min(1, 'Recipe name is required')
    .max(255, 'Recipe name too long'),
  description: z
    .string()
    .max(2000, 'Description too long')
    .optional(),
  prep_time: z
    .number()
    .min(0, 'Prep time cannot be negative')
    .max(1440, 'Prep time too long'),
  cook_time: z
    .number()
    .min(0, 'Cook time cannot be negative')
    .max(1440, 'Cook time too long'),
  servings: z
    .number()
    .min(1, 'Servings must be at least 1')
    .max(100, 'Servings too high'),
  image_url: z
    .string()
    .url('Invalid URL')
    .optional()
    .or(z.literal('')),
  source_url: z
    .string()
    .url('Invalid URL')
    .optional()
    .or(z.literal('')),
  assigned_to_id: z.number().optional(),
  ingredients: z
    .array(ingredientSchema)
    .min(1, 'At least one ingredient is required'),
  steps: z
    .array(stepSchema)
    .min(1, 'At least one step is required'),
  timers: z
    .array(timerSchema)
    .optional()
    .default([]),
});

export type RecipeFormData = z.infer<typeof recipeSchema>;
export type IngredientFormData = z.infer<typeof ingredientSchema>;
export type StepFormData = z.infer<typeof stepSchema>;
export type TimerFormData = z.infer<typeof timerSchema>;
