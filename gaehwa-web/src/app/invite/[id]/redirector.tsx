"use client";
import { useEffect } from "react";

export default function Redirector({ id }: { id: string }) {
  useEffect(() => {
    const deep = `gaehwa://card?id=${id}`;
    // 앱 설치 시엔 이 스킴을 처리해서 곧바로 앱이 열림
    const t = setTimeout(() => { window.location.href = deep; }, 120);
    return () => clearTimeout(t);
  }, [id]);

  return null;
}
