export type SourceTier = "consensus" | "professional" | "community" | "owned";
export type ChannelType = "api" | "manual" | "export";

export interface Source {
  id: string;
  name: string;
  tier: SourceTier;
  weight: number;
  channelType: ChannelType;
}

export type SourceInput = Omit<Source, "id">;
export type SourceUpdate = Partial<SourceInput>;

export interface ValidationError {
  field: string;
  message: string;
}

export const SOURCE_TIERS: SourceTier[] = ["consensus", "professional", "community", "owned"];
export const CHANNEL_TYPES: ChannelType[] = ["api", "manual", "export"];

export function validateSourceInput(input: Partial<SourceInput>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (typeof input.name !== "string" || input.name.trim() === "") {
    errors.push({ field: "name", message: "name is required" });
  }
  if (input.tier !== undefined && !SOURCE_TIERS.includes(input.tier)) {
    errors.push({ field: "tier", message: "invalid tier" });
  }
  if (input.channelType !== undefined && !CHANNEL_TYPES.includes(input.channelType)) {
    errors.push({ field: "channelType", message: "invalid channelType" });
  }
  if (input.weight !== undefined && (input.weight < 0 || input.weight > 100)) {
    errors.push({ field: "weight", message: "weight must be between 0 and 100" });
  }
  return errors;
}

export function normalizeSourceInput(input: SourceInput): SourceInput {
  return {
    name: input.name.trim(),
    tier: input.tier,
    weight: input.weight,
    channelType: input.channelType,
  };
}
