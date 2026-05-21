import { IsIn, IsString, MaxLength } from 'class-validator';

export class SetCoursePersonalNoteDto {
  @IsString()
  @IsIn(['file', 'session', 'text_lesson', 'quiz', 'assignment', 'interactive_file', 'prerequisite', 'related_course'])
  itemType!: string;

  @IsString()
  @MaxLength(64)
  itemId!: string;

  @IsString()
  @MaxLength(10000)
  note!: string;
}
