"use client";

import { useEffect, useState } from "react";

// 与后端 books 表对应（apps/backend/src/book/entities/book.entity.ts）
type Book = {
  id: number;
  title: string;
  author: string;
  description?: string | null;
  coverUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    fetch(`${apiBase}/api/v1/books`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Book[]>;
      })
      .then((data) => {
        setBooks(data);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          书籍列表
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          前端调用后端 <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/[.08]">GET /api/v1/books</code>，后端连接 MySQL 返回数据。
        </p>
      </header>

      {loading && <p className="text-zinc-500">加载中…</p>}

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          请求后端失败：{error}
        </div>
      )}

      {!loading && !error && books.length === 0 && (
        <p className="text-zinc-500">数据库里还没有书籍，先调 <code className="font-mono">POST /api/v1/books</code> 创建几条。</p>
      )}

      {!loading && !error && books.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {books.map((book) => (
            <li
              key={book.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start gap-4">
                {book.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="h-20 w-14 flex-shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-14 flex-shrink-0 items-center justify-center rounded bg-zinc-100 text-xs text-zinc-400 dark:bg-zinc-800">
                    无封面
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {book.title}
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{book.author}</p>
                  {book.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {book.description}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
