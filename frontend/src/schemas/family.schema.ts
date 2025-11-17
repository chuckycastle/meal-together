/**
 * Zod schemas for family forms
 */

import { z } from 'zod';

export const familySchema = z.object({
  name: z
    .string()
    .min(1, 'Family name is required')
    .max(255, 'Family name too long'),
  description: z
    .string()
    .max(1000, 'Description too long')
    .optional(),
});

export const addMemberSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  role: z
    .enum(['owner', 'admin', 'member'])
    .optional()
    .default('member'),
});

export type FamilyFormData = z.infer<typeof familySchema>;
export type AddMemberFormData = z.infer<typeof addMemberSchema>;
