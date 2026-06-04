// Хуудас солигдоход тоглох cinematic зүсэлт: гэрлэн slash + дайчны силуэт зүсэн өнгөрнө.
// Бүх animation нь нэг удаагийн (CSS forwards) — fx-layer 0.9с дотор бүдгэрч алга болно.
// reduced-motion үед globals.css-д бүхэлд нь нуугдана.
import { WarriorStreak } from "@/components/Warrior";

export default function TransitionFX() {
  return (
    <div className="fx-layer" aria-hidden>
      <div className="fx-slash" />
      <div className="fx-hero">
        <WarriorStreak size={150} />
      </div>
    </div>
  );
}
