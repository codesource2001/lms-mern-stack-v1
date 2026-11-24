import { z } from 'zod';

import { validate } from '../../middlewares/validate.js';

const emailSchema = z
  .string()
  .trim()
  .min(3, 'email is required')
  .max(254)
  .email('must be a valid email address')
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(12, 'password must be at least 12 characters')
  .max(128, 'password must be at most 128 characters');

const nameSchema = z.string().trim().min(2, 'name must be at least 2 characters').max(100);

const tokenSchema = z.string().trim().min(20).max(200);

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const verifyEmailSchema = z.object({
  token: tokenSchema,
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: 'new password must differ from the current password',
    path: ['newPassword'],
  });

export const updateProfileSchema = z.object({
  name: nameSchema,
});

export const validateRegister = validate({ body: registerSchema });
export const validateLogin = validate({ body: loginSchema });
export const validateVerifyEmail = validate({ body: verifyEmailSchema });
export const validateResendVerification = validate({ body: resendVerificationSchema });
export const validateForgotPassword = validate({ body: forgotPasswordSchema });
export const validateResetPassword = validate({ body: resetPasswordSchema });
export const validateChangePassword = validate({ body: changePasswordSchema });
export const validateUpdateProfile = validate({ body: updateProfileSchema });
