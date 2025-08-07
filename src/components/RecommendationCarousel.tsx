// src/components/RecommendationCarousel.tsx
"use client";
import { useRef } from "react";

export interface Florist {
  id: number;
  name: string;
  profileUrl: string;
}

interface RecommendationCarouselProps {
  florists: Florist[];
}

export default function RecommendationCarousel({
  florists,
}: RecommendationCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  return (
    <section
      className="
        mt-12
        w-full max-w-6xl mx-auto     /* 중앙 정렬 + 최대 너비 */
        border-t border-dashed border-gray-300 pt-8  /* 점선 구분선 */
        relative
      "
    >
      <h3 className="text-2xl font-semibold">이런 플로리스트를 찾고 있나요?</h3>
      <p className="text-gray-600 mt-1">취향을 닮은 플로리스트를 찾아드려요</p>

      {/* 좌/우 화살표 */}
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-md z-10"
      >
        ◀
      </button>
      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-md z-10"
      >
        ▶
      </button>

      {/* 스크롤 스냅 + 4개 보이기 */}
      <div
        ref={scrollRef}
        className="
          mt-6
          flex gap-6 overflow-x-auto
          snap-x snap-mandatory scrollbar-hide
          px-4
        "
      >
        {florists.map((f) => (
          <div
            key={f.id}
            className="
              snap-start flex-shrink-0
              w-[80vw] sm:w-[calc((100%_-_3*theme(space.6))/_4)]
              max-w-[250px]
              bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300
              transform hover:scale-105
              p-4 flex flex-col items-center
            "
          >
            <img
              src={f.profileUrl}
              alt={f.name}
              className="w-full h-32 object-cover rounded-md"
            />
            <h4 className="mt-3 font-medium">{f.name}</h4>
            <button className="mt-2 px-3 py-1 text-sm border border-primary text-primary rounded">
              저장
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
