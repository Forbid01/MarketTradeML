import { tone } from "@/lib/ui/tones";

// Tinted pill — статус/шошго/жижиг мэдээллийн нэгдсэн хэлбэр. Server+client аль алинд.
export default function Pill({ tone: toneName = "zinc", className = "", children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone(toneName)} ${className}`}
    >
      {children}
    </span>
  );
}
