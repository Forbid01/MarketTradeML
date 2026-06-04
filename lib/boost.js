// Boosting үйлчилгээний үнийн тохиргоо + тооцоолол (₮, бүхэл тоо). Client+server аль алинд.

// MLBB ранкийн шат (доороос дээш)
export const RANK_LADDER = [
  "Warrior", "Elite", "Master", "Grandmaster", "Epic",
  "Legend", "Mythic", "Mythical Honor", "Mythical Glory", "Mythical Immortal",
];

// Тухайн ранк руу ӨМНӨХӨӨС нь гарахад ойролцоогоор хэдэн match (дээшлэх тусам нэмэгдэнэ)
const STEP_MATCHES = [0, 2, 3, 4, 6, 8, 12, 16, 22, 30];
export const RANK_CUM = STEP_MATCHES.reduce((acc, s, i) => {
  acc.push((i ? acc[i - 1] : 0) + s);
  return acc;
}, []);

// Нэг match-ийн (эсвэл сешн/тоглолтын) суурь үнэ (₮)
export const BOOST = {
  winrate: { perMatch: 6000, min: 1, max: 60, def: 10 },
  rank: { perMatch: 8000 },
  squad: { perMatch: 12000, min: 1, max: 30, def: 5 },
  // Placement/Calibration: шинэ улирлын байр тогтоох тоглолтууд
  placement: { perMatch: 10000, min: 1, max: 10, def: 10 },
  // Coaching: perMatch нь нэг сешний үнэ (1 сешн ≈ 1 цаг)
  coaching: { perMatch: 25000, min: 1, max: 10, def: 2 },
};

// Нэмэлт сонголтын коэффициент
export const MODIFIERS = {
  express: 0.25, // Шуурхай гүйцэтгэл +25%
  duo: 0.3, // Хамт тоглох +30%
};

// fromIdx → toIdx хооронд ойролцоогоор хэдэн match
export function rankMatches(fromIdx, toIdx) {
  if (toIdx == null || fromIdx == null || toIdx <= fromIdx) return 0;
  return RANK_CUM[toIdx] - RANK_CUM[fromIdx];
}

// Нийт үнэ: matches × perMatch × (1 + сонгосон коэффициентүүд)
export function boostTotal(matches, perMatch, opts = {}) {
  const m = Math.max(0, Math.round(matches));
  let mult = 1;
  if (opts.express) mult += MODIFIERS.express;
  if (opts.duo) mult += MODIFIERS.duo;
  return Math.round(m * perMatch * mult);
}
