import { type Brand } from "../brand/brand";

export type QuestionCategory = "category" | "comparison" | "brand" | "attribute";

export interface Question {
  category: QuestionCategory;
  text: string;
}

export interface GenerateOptions {
  competitors?: string[];
  attributes?: string[];
  engineIds?: string[];
}

function clean(values: string[] | undefined): string[] {
  return (values ?? []).map((v) => v.trim()).filter((v) => v !== "");
}

export function generateQuestionSet(brand: Brand, opts: GenerateOptions = {}): Question[] {
  const competitors = clean(opts.competitors);
  const attributes = clean(opts.attributes);
  const questions: Question[] = [];

  questions.push({ category: "category", text: `有哪些值得推荐的${brand.definition}？` });

  questions.push({ category: "brand", text: `${brand.name}是什么？它的核心优势是什么？` });
  questions.push({ category: "brand", text: `${brand.name}怎么样？是否值得选择？` });

  for (const attr of attributes) {
    questions.push({ category: "attribute", text: `${brand.name}在${attr}方面表现如何？` });
  }

  for (const comp of competitors) {
    questions.push({ category: "comparison", text: `${brand.name}和${comp}相比，哪个更好？` });
  }

  return questions;
}
