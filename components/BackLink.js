"use client";

// Буцах линк: дотоод хуудаснаас (browse-ийн шүүлт/хуудаслалт г.м) ирсэн бол түүхээр
// буцна — query string хадгалагдана; шууд/гадны зочлолтод fallback руу. Өмнө нь
// хатуу "/" линк байсан нь хэрэглэгчийн шүүлтийг алдагдуулдаг байв. No-JS үед
// энгийн <a href={fallback}> хэвээр ажиллана.
import { useRouter } from "next/navigation";

export default function BackLink({ children, fallback = "/browse", className }) {
  const router = useRouter();

  function back(e) {
    e.preventDefault();
    let internal = false;
    try {
      internal = Boolean(document.referrer) && new URL(document.referrer).origin === location.origin;
    } catch {}
    if (internal) router.back();
    else router.push(fallback);
  }

  return (
    <a href={fallback} onClick={back} className={className}>
      {children}
    </a>
  );
}
