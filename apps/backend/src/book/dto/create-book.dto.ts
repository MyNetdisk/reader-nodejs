import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookDto {
  @ApiProperty({ description: '书名', example: '三体' })
  title: string;

  @ApiProperty({ description: '作者', example: '刘慈欣' })
  author: string;

  @ApiPropertyOptional({ description: '简介', example: '地球往事三部曲' })
  description?: string;

  @ApiPropertyOptional({ description: '封面地址', example: 'https://xxx.com/cover.jpg' })
  coverUrl?: string;
}