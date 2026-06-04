"use client";

// Next App Router template — навигаци бүрт REMOUNT хийдэг. usePathname-аар key өгснөөр
// .page-enter (контентын орох motion) ба TransitionFX (дайчны зүсэлт) хуудас солигдох бүрт
// дахин тоглоно. reduced-motion үед globals.css-д унтраалттай.
import { usePathname } from "next/navigation";
import TransitionFX from "@/components/TransitionFX";

export default function Template({ children }) {
  const pathname = usePathname();
  return (
    <div key={pathname}>
      <TransitionFX />
      <div className="page-enter">{children}</div>
    </div>
  );
}
