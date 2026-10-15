import { z } from "zod";

export const forecastDashboardSchema = z.object({
  history: z.array(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), count: z.number().int().nonnegative() })),
  forecasts: z.array(z.object({
    id: z.string(), modelVersion: z.string(), predictionType: z.string(), predictionValue: z.object({
      predicted_count: z.number().finite().nonnegative(), month: z.string().regex(/^\d{4}-\d{2}$/),
      model_version: z.string(), input_data_cutoff: z.string().regex(/^\d{4}-\d{2}$/),
      training_data_cutoff: z.string().regex(/^\d{4}-\d{2}$/), data_source: z.literal("sqlite_aggregate_export"),
      confidence: z.null(), note: z.string(),
    }).passthrough(), generatedAt: z.coerce.date(), inputDataCutoff: z.coerce.date(), explanation: z.unknown(),
  })),
  evaluation: z.record(z.string(), z.unknown()).nullable(),
  historyMonths: z.number().int().nonnegative(),
});

export type ForecastDashboard = z.infer<typeof forecastDashboardSchema>;
