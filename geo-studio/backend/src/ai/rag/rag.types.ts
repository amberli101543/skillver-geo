export type RagSourceType = "assertion" | "brand";

export interface RagChunkRecord {
  id: string;
  brandId: string;
  sourceType: RagSourceType;
  text: string;
  embedding: number[] | null;
}

export interface RagChunkInput {
  sourceType: RagSourceType;
  text: string;
  embedding?: number[] | null;
}

export interface RagRetrieveOptions {
  topK?: number;
  sourceTypes?: RagSourceType[];
}

export interface RagSimilarHit {
  text: string;
  score: number;
}

export interface BrandProfileKnowledge {
  definition: string;
  positioning?: string;
}
