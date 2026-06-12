// Tinted pill/badge/panel-ийн өнгөний нэгдсэн эх сурвалж — StatusBadge, Pill болон
// гар хийсэн tinted хэсгүүд бүгд эндээс. Client+server аль алинд (hook-гүй).
export const TONES = {
  zinc: "bg-white/10 text-slate-300 ring-white/15",
  blue: "bg-azure/15 text-[#7dd3fc] ring-azure/30",
  amber: "bg-gold/15 text-gold ring-gold/30",
  green: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  red: "bg-red-500/15 text-red-300 ring-red-500/30",
  violet: "bg-violet/20 text-[#b3a9ff] ring-violet/40",
};

export const tone = (name) => TONES[name] ?? TONES.zinc;
