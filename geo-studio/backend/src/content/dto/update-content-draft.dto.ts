import { IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { CONTENT_DRAFT_STATUSES } from "../content-draft";

export class UpdateContentDraftDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string;

  @IsOptional()
  @IsIn(CONTENT_DRAFT_STATUSES)
  status?: (typeof CONTENT_DRAFT_STATUSES)[number];
}
