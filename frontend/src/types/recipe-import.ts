/**
 * Recipe Import Types
 * Schema-aligned with backend Pydantic models
 */

export interface ImportedIngredient {
  name: string;
  quantity: string;
}

export interface ImportedStep {
  order: number;
  instruction: string;
  estimated_time: number | null; // minutes
}

export interface ImportedTimer {
  name: string;
  duration: number; // seconds
  step_order: number | null;
}

export interface ImportedRecipe {
  name: string;
  description: string;
  prep_time: number; // minutes
  cook_time: number; // minutes
  servings: number;
  image_url?: string; // Optional - may be empty string
  source_url: string;
  ingredients: ImportedIngredient[];
  steps: ImportedStep[];
  timers: ImportedTimer[];
}

export type ImportConfidence = 'high' | 'medium' | 'low';
export type ExtractionMethod = 'json-ld' | 'heuristic' | 'ai' | 'cached';

export interface ImportResponse {
  recipe: ImportedRecipe;
  confidence: ImportConfidence;
  extraction_method: ExtractionMethod;
}

export interface ImportRecipeRequest {
  url: string;
}

export interface ImportRecipeError {
  error: string;
}
