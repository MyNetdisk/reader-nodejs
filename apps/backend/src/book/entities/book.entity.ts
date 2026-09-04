import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255, comment: '书名' })
  title: string;

  @Column({ length: 255, comment: '作者' })
  author: string;

  @Column({ type: 'text', nullable: true, comment: '简介' })
  description: string;

  @Column({ name: 'cover_url', length: 500, nullable: true, comment: '封面地址' })
  coverUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}