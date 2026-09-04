import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { BookService } from './book.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'; // 引入装饰器

@ApiTags('books') // 将接口分组到 books 标签下
@Controller('books')
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Post()
  @ApiOperation({ summary: '创建新书籍' })
  @ApiResponse({ status: 201, description: '书籍创建成功' })
  create(@Body() createBookDto: CreateBookDto) {
    return this.bookService.create(createBookDto);
  }

  @Get()
  @ApiOperation({ summary: '获取所有书籍' })
  findAll() {
    return this.bookService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '根据ID获取书籍' })
  @ApiParam({ name: 'id', description: '书籍ID', type: Number })
  findOne(@Param('id') id: string) {
    return this.bookService.findOne(+id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新书籍信息' })
  @ApiParam({ name: 'id', description: '书籍ID', type: Number })
  update(@Param('id') id: string, @Body() updateBookDto: UpdateBookDto) {
    return this.bookService.update(+id, updateBookDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除书籍' })
  @ApiParam({ name: 'id', description: '书籍ID', type: Number })
  remove(@Param('id') id: string) {
    return this.bookService.remove(+id);
  }
}
