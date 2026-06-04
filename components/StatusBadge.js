const TONES = {
  zinc: "bg-white/10 text-slate-300 ring-white/15",
  blue: "bg-[#38BDF8]/15 text-[#7dd3fc] ring-[#38BDF8]/30",
  amber: "bg-[#F5C451]/15 text-[#f5c451] ring-[#F5C451]/30",
  green: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  red: "bg-red-500/15 text-red-300 ring-red-500/30",
  violet: "bg-[#6D5DF6]/20 text-[#b3a9ff] ring-[#6D5DF6]/40",
};

export default function StatusBadge({ label, tone = "zinc" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        TONES[tone] ?? TONES.zinc
      }`}
    >
      {label}
    </span>
  );
}
