# Hero showcase зургууд

Landing хуудасны cinematic hero showcase-д ашиглах **лицензтэй** баатрын зургуудаа
энэ фолдерт хийнэ үү.

## Хэрхэн нэмэх вэ
1. Зургаа энд хийнэ: `public/heroes/hero1.webp`, `hero2.webp` ... (PNG бас болно)
   - Хамгийн гоё үр дүн: **дэвсгэргүй (transparent PNG/WebP)** эсвэл бараан фонтой,
     босоо (portrait) splash-art. ~800×1100px орчим.
2. `lib/heroes.js` доторх `HEROES` массивт мөр нэмнэ:
   ```js
   export const HEROES = [
     { src: "/heroes/hero1.webp", name: "Mythic Glory", rank: "Mythical Glory" },
     { src: "/heroes/hero2.webp", name: "Legend Slayer", rank: "Legend" },
   ];
   ```
3. Хадгалаад дахин ачаална — showcase автоматаар cross-fade + Ken Burns + parallax-аар
   зургуудыг ээлжлүүлэн харуулна. (Жагсаалт хоосон бол өөрийн warrior SVG руу шилжинэ.)

## Эрх
Энд тавих зургийн ашиглах эрх/лиценз нь таны хариуцлага. Moonton-ийн зохиогчийн эрхтэй
art-ыг зохих зөвшөөрөлгүйгээр ил тавихгүй байхыг анхаарна уу.
