// Хуудас солигдоход тоглох cinematic гэрлэн зураас (light slash sweep).
// Нэг удаагийн CSS animation — fx-layer 0.9с дотор бүдгэрч алга болно.
// reduced-motion үед globals.css-д бүхэлд нь нуугдана.
export default function TransitionFX() {
  return (
    <div className="fx-layer" aria-hidden>
      <div className="fx-slash" />
    </div>
  );
}
