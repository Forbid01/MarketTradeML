import Pill from "@/components/ui/Pill";

// Захиалга/boost-ийн статус badge — Pill-ийн нимгэн wrapper (tones нэгдсэн эх сурвалжтай).
export default function StatusBadge({ label, tone = "zinc" }) {
  return <Pill tone={tone}>{label}</Pill>;
}
