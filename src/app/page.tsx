// src/app/page.tsx
import Navbar from "@/components/Navbar";
import HeroArticle, { Article } from "@/components/HeroArticle";
import RecommendationCarousel, { Florist } from "@/components/RecommendationCarousel";

const sampleArticle: Article = {
  id: 1,
  imageUrl: "/images/sample-hero.jpg",
  title: "꽃이 건네는 마음, 당신을 위한 문장",
  author: "sun87",
};

const sampleFlorists: Florist[] = [
  { id: 101, name: "플로리스트A", profileUrl: "/profiles/a.jpg" },
  { id: 102, name: "플로리스트B", profileUrl: "/profiles/b.jpg" },
  { id: 103, name: "플로리스트C", profileUrl: "/profiles/c.jpg" },
  { id: 104, name: "플로리스트D", profileUrl: "/profiles/d.jpg" },
];

export default function HomePage() {
  return (
    <>
      <main className="space-y-12">
        <HeroArticle article={sampleArticle} />
        <RecommendationCarousel florists={sampleFlorists} />
      </main>
    </>
  );
}
