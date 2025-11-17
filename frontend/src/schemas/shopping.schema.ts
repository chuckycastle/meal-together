/**
 * Zod schemas for shopping list forms
 */

import { z } from 'zod';

export const shoppingListSchema = z.object({
  name: z
    .string()
    .min(1, 'List name is required')
    .max(255, 'List name too long')
    .optional()
    .default('Shopping List'),
});

export const shoppingItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Item name is required')
    .max(255, 'Item name too long'),
  quantity: z
    .string()
    .max(50, 'Quantity too long')
    .optional(),
  category: z
    .string()
    .max(100, 'Category too long')
    .optional(),
  notes: z
    .string()
    .max(500, 'Notes too long')
    .optional(),
});

export type ShoppingListFormData = z.infer<typeof shoppingListSchema>;
export type ShoppingItemFormData = z.infer<typeof shoppingItemSchema>;
