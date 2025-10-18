import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z
  .object({
    AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS access key id is required'),
    AWS_SECRET_ACCESS_KEY: z
      .string()
      .min(1, 'AWS secret access key is required'),
    AMAZON_PARTNER_TAG: z.string().min(1, 'Amazon partner tag is required'),
    AMAZON_REGION: z.string().min(1, 'Amazon region is required'),
    AMAZON_HOST: z
      .string()
      .min(1, 'Amazon host is required')
      .default('webservices.amazon.com')
  })
  .transform((env) => ({
    ...env,
    AMAZON_HOST: env.AMAZON_HOST.trim()
  }));

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(): AppConfig {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.errors
      .map((issue) => {
        const path = issue.path.join('.') || 'environment';
        return `${path}: ${issue.message}`;
      })
      .join('\n');

    throw new Error(`Invalid environment configuration.\n${details}`);
  }

  return parsed.data;
}
