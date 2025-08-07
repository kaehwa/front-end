// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const menu = [
    { label: "HOME", href: "/" },
    { label: "어울리는 플로리스트", href: "/florists" },
    { label: "Try-On", href: "/try-on" },
    { label: "3D Bouquet", href: "/3d-bouquet" },
  ];

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white shadow-sm border-b border-gray-200">
      {/* 왼쪽: 사이트 소개 */}
      <div className="text-base sm:text-base font-junggo italic text-[#003300]">
        개화 : 꽃이 아닌 당신의 이야기 <span className="text-green-700 not-italic"></span>
      </div>

      {/* 중앙: 메뉴 항목 */}
      <nav className="flex items-center gap-[210px]">
        {menu.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className={`text-sm sm:text-base font-medium transition-colors duration-200 hover:text-green-700 ${
  pathname === href ? "text-green-900 font-bold" : "text-black"
}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* 오른쪽: 로그인 */}
      <Link
      href="/login"
      className="flex items-center gap-2 text-black hover:text-green-700"
    >
      <svg
        className="h-6 w-6 fill-current text-black"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <path d="M12 2l-4 8h8l-4-8zm0 11a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      <span className="text-sm font-medium">LOGIN</span>
    </Link>

    </header>
  );
}
