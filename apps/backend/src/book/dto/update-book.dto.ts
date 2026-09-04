import { PartialType } from '@nestjs/mapped-types';
import { CreateBookDto } from './create-book.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

// PartialType 会让所有字段变成可选
export class UpdateBookDto extends PartialType(CreateBookDto) {
  @ApiPropertyOptional({ description: '书名' })
  title?: string;

  @ApiPropertyOptional({ description: '作者' })
  author?: string;

  @ApiPropertyOptional({ description: '简介' })
  description?: string;

  @ApiPropertyOptional({ description: '封面地址' })
  coverUrl?: string;
}