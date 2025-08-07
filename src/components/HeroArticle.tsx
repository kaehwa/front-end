// src/components/HeroArticle.tsx
"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";

export interface Article {
  id: number;
  imageUrl: string;
  title: string;
  author: string;
}

interface HeroArticleProps {
  article: Article;
}

export default function HeroArticle({ article }: HeroArticleProps) {
  const router = useRouter();

  return (
    <div
      className="
        relative
        w-full max-w-6xl mx-auto      /* 중앙 정렬 + 최대 너비 */
        h-[60vh] md:h-[500px]          /* 반응형 높이 */
        overflow-hidden rounded-lg
        border-b border-dashed border-gray-300 /* 점선 구분선 */
        group cursor-pointer
      "
      onClick={() => router.push(`/article/${article.id}`)}
    >
      <Image
        src={article.imageUrl}
        alt={article.title}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-110"
      />

      <div className="absolute inset-0 bg-black bg-opacity-25 transition-opacity duration-500 group-hover:bg-opacity-10" />

      <div className="absolute bottom-6 left-6 text-white">
        <h2 className="text-4xl font-extrabold tracking-widest">
          {article.title}
        </h2>
        <div className="mt-2 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#fdf6d7]" />
          <p className="text-sm md:text-base">{article.author}</p>
        </div>
      </div>
    </div>
  );
}
