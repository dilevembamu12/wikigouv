import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum CourseLevelDto {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED'
}

export class CreateCourseDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(2500)
  description!: string;

  @IsOptional()
  @IsString()
  objectives?: string;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsEnum(CourseLevelDto)
  level?: CourseLevelDto;
}
