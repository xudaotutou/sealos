import { getPasswordStrength } from '@/utils/tools';
import { z } from 'zod';
export const loginParamsSchema = z
  .object({
    email: z.string().email({ message: 'Invalid email format' }),
    password: z
      .string()
      .refine((pw) => getPasswordStrength(pw) >= 50, { message: 'Password is too weak' })
  })
  .passthrough();
export const registerParamsSchema = z
  .object({
    email: z.string().email({ message: 'Invalid email format' }),
    password: z
      .string()
      .refine((pw) => getPasswordStrength(pw) >= 50, { message: 'Password is too weak' }),
    firstname: z.string().min(1, { message: 'Firstname is required' }),
    lastname: z.string().min(1, { message: 'Lastname is required' }),
    country: z.enum(['US'], { message: 'Invalid country code' }).default('US'),
    language: z.enum(['en', 'zh'], { message: 'Invalid language code' }).default('en')
  })
  .passthrough();

const forgotPasswordParamsSchema = z
  .object({
    email: z.string().email({ message: 'Invalid email format' })
  })
  .passthrough();

export type ILoginParams = z.infer<typeof loginParamsSchema>;
export type IRegisterParams = z.infer<typeof registerParamsSchema>;
export type IForgotPasswordParams = z.infer<typeof forgotPasswordParamsSchema>;
