export const DEFAULT_RETEST_INTERVAL_HOURS = 168;

export interface RetestSchedule {
  brandId: string;
  enabled: boolean;
  intervalHours: number;
  lastRunAt?: string;
  nextRunAt?: string;
}

export interface RetestScheduleUpdate {
  enabled: boolean;
  intervalHours: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateRetestScheduleUpdate(input: RetestScheduleUpdate): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!Number.isInteger(input.intervalHours) || input.intervalHours < 1 || input.intervalHours > 8760) {
    errors.push({
      field: "intervalHours",
      message: "intervalHours must be an integer between 1 and 8760",
    });
  }
  return errors;
}

export function computeNextRunAt(from: Date, intervalHours: number): Date {
  return new Date(from.getTime() + intervalHours * 60 * 60 * 1000);
}

export function defaultRetestSchedule(brandId: string): RetestSchedule {
  return {
    brandId,
    enabled: false,
    intervalHours: DEFAULT_RETEST_INTERVAL_HOURS,
  };
}

export function toRetestSchedule(row: {
  brandId: string;
  enabled: boolean;
  intervalHours: number;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
}): RetestSchedule {
  return {
    brandId: row.brandId,
    enabled: row.enabled,
    intervalHours: row.intervalHours,
    ...(row.lastRunAt ? { lastRunAt: row.lastRunAt.toISOString() } : {}),
    ...(row.nextRunAt ? { nextRunAt: row.nextRunAt.toISOString() } : {}),
  };
}
