import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SetCourseLastViewDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  itemType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  itemId!: string;
}
