import { z } from 'zod';

export const GetReportingMetricsQuerySchema = z.object({
  start: z.coerce.number().int().positive().optional(),
  end: z.coerce.number().int().positive().optional(),
  preset: z.enum(['today']).optional(),
  interval: z.enum(['hour', 'day', 'week', 'month']).optional(),
  compare: z.enum(['previous_period', 'none']).optional(),
  metrics: z.string().optional(),
  timezone: z.string().optional(),
});

export const GetReconciliationParamsSchema = z.object({
  start: z.coerce.number().int().nonnegative().optional(),
  end: z.coerce.number().int().positive().optional(),
  account: z.string().optional(),
  currency: z.string().default('usdc').optional(),
});

export type GetReconciliationParamsInput = z.infer<
  typeof GetReconciliationParamsSchema
>;
