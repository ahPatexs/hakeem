import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  AUTH_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  AUTH_DEV_INBOX: z.string().optional(),
  BLOB_STORAGE_DIR: z.string().optional(),
  PAYMENT_PROVIDER: z.string().optional(),
  TELEMEDICINE_PROVIDER: z.string().optional(),
  AI_ASSISTANT_PROVIDER: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv(): AppEnv {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.warn("[env] Invalid environment shape", parsed.error.flatten().fieldErrors);
    return {};
  }
  return parsed.data;
}

export function requireAuthSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set to a string of at least 32 characters");
    }
    return "dev-only-auth-secret-change-me-32chars!";
  }
  return secret;
}
