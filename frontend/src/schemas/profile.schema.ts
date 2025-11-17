/**
 * Zod schemas for profile forms
 */

import { z } from 'zod';

export const updateProfileSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name too long'),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name too long'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
});

export const changePasswordSchema = z.object({
  current_password: z
    .string()
    .min(1, 'Current password is required'),
  new_password: z
    .string()
    .min(1, 'New password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirm_password: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
