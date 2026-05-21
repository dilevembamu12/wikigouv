import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested
} from 'class-validator';

enum QuestionTypeDto {
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER'
}

class QuizOptionDto {
  @IsString()
  @MaxLength(500)
  text!: string;

  @IsBoolean()
  isCorrect!: boolean;
}

class QuizQuestionDto {
  @IsEnum(QuestionTypeDto)
  type!: QuestionTypeDto;

  @IsString()
  prompt!: string;

  @IsInt()
  @Min(1)
  points!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizOptionDto)
  options!: QuizOptionDto[];
}

export class CreateQuizDto {
  @IsString()
  courseId!: string;

  @IsOptional()
  @IsString()
  moduleId?: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  passingScore?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions!: QuizQuestionDto[];
}

