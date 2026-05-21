import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CourseLevelDto } from './create-course.dto';
import { CourseStatusDto } from './list-courses-query.dto';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2500)
  description?: string;

  @IsOptional()
  @IsString()
  objectives?: string;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsEnum(CourseLevelDto)
  level?: CourseLevelDto;

  @IsOptional()
  @IsEnum(CourseStatusDto)
  status?: CourseStatusDto;
}

