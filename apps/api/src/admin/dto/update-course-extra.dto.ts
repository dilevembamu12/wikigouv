import { IsInt, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateCourseExtraDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
