export const DEFAULT_EMBEDDING_DIMENSIONS = 1536;

export function embeddingDimensions(): number {
  const v = Number(process.env.OPENAI_EMBEDDING_DIMENSIONS ?? DEFAULT_EMBEDDING_DIMENSIONS);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : DEFAULT_EMBEDDING_DIMENSIONS;
}

export function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
