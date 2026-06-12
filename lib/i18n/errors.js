// Server action / plpgsql-ийн МОНГОЛ алдааны мессежийг dictionary key-рүү буулгана.
// Сервер тал монголоор алдаагаа буцаасан хэвээр (хамгийн энгийн, аюулгүй зам);
// клиент talд useAction нэг цэгээс энэ map-аар locale-ийн дагуу орчуулдаг тул
// EN хэрэглэгч алдааг англиар харна. Шинэ алдааны string нэмбэл энд + dictionaries-ийн
// errors namespace-д (хоёр хэлэнд) нэмнэ.

const EXACT = new Map([
  // lib/actions.js
  ["Нэвтэрнэ үү", "notLoggedIn"],
  ["Хэт олон хүсэлт. Түр хүлээгээд дахин оролдоно уу.", "tooMany"],
  ["Алдаа гарлаа. Түр зуурын саатал байж магадгүй — дахин оролдоно уу.", "generic"],
  ["Захиалга олдсонгүй / эрх алга", "orderNoAccess"],
  ["Захиалга олдсонгүй", "orderNotFound"],
  ["Энэ захиалга төлбөр хүлээхгүй", "notAwaitingPayment"],
  ["Нэхэмжлэл үүсээгүй байна", "noInvoice"],
  ["Промо код хүчингүй байна", "badPromo"],
  ["Буруу үйлчилгээ", "badService"],
  ["Тохиргоо буруу байна", "badConfig"],
  ["Эрх байхгүй", "noPermission"],
  ["Эрх байхгүй эсвэл боломжгүй", "noPermissionOrUnavailable"],
  ["Эрх байхгүй эсвэл боломжгүй (зарагдсан зар засах боломжгүй)", "cannotEditSold"],
  ["Зөвхөн админ", "adminOnly"],
  ["Хэрэглэгч олдсонгүй", "userNotFound"],
  ["Буруу шилжилт", "badTransition"],
  ["Буруу төлөв", "badStatus"],
  ["Энэ төлвөөс шилжих боломжгүй", "badTransition"],
  ["Зөвхөн гүйцэтгэж буй үед", "onlyInProgress"],
  ["Зураг хэт том (8MB-аас бага байх ёстой)", "imageTooBig"],
  ["Зөвхөн зураг файл (JPEG/PNG/WebP/GIF/AVIF)", "imageType"],
  ["Файл алга", "noFile"],
  ["Зураг хадгалах сан холбоогүй байна (Vercel Blob).", "blobNotConfigured"],
  ["1–5 од", "badStars"],
  ["Зөвхөн дууссан захиалгын худалдан авагч үнэлнэ", "reviewBuyerOnly"],
  ["Зөвхөн дууссан захиалгын эзэн үнэлнэ", "reviewOwnerOnly"],
  ["Оруулсан утга буруу байна", "invalidInput"],
  ["Хоосон", "empty"],
  ["Боломжгүй", "notPossible"],
  // lib/auth/otp.js
  ["И-мэйл хаяг буруу байна", "badEmail"],
  ["Код илгээж чадсангүй. Түр зуурын саатал байж магадгүй — дахин оролдоно уу.", "otpSendFailed"],
  ["Түр хүлээгээд дахин код хүснэ үү.", "otpCooldown"],
  ["Хэт олон удаа хүссэн байна. Дараа дахин оролдоно уу.", "otpTooMany"],
  // db/schema.sql (plpgsql raise exception)
  ["зар олдсонгүй", "listingNotFound"],
  ["зар идэвхгүй (бэлэн бус)", "listingInactive"],
  ["өөрийн зарыг худалдаж авах боломжгүй", "ownListing"],
  ["захиалга олдсонгүй", "orderNotFound"],
  ["энэ захиалгад эрх байхгүй", "noPermission"],
  ["нэвтрээгүй байна", "notLoggedIn"],
  ["зөвхөн админ", "adminOnly"],
  ["маргааныг зөвхөн шилжүүлж/шалгаж байх үед нээнэ", "disputeWindow"],
  ["шилжүүлгийн checklist бүрэн биш — дуусгах боломжгүй", "checklistIncomplete"],
  ["аль хэдийн олгосон", "alreadyPaidOut"],
  ["booster хуваарилаагүй байна", "noBooster"],
  ["маргаан олдсонгүй", "disputeNotFound"],
  ["буруу outcome", "badOutcome"],
  ["энэ хэсгийг зөвхөн зарагч тэмдэглэнэ", "sellerSideOnly"],
  ["энэ хэсгийг зөвхөн худалдан авагч тэмдэглэнэ", "buyerSideOnly"],
]);

// Динамик (%-тэй) plpgsql мессежүүдийн prefix дүрэм
const PREFIX = [
  ["захиалга эцсийн төлөвт", "terminalState"],
  ["шилжилт ", "badTransition"],
  ["зөвхөн дууссан boost-д олголт", "boostNotCompleted"],
  ["checklist-ийг зөвхөн", "checklistWindow"],
];

export function errorKey(msg) {
  if (typeof msg !== "string") return null;
  const exact = EXACT.get(msg);
  if (exact) return exact;
  for (const [prefix, key] of PREFIX) {
    if (msg.startsWith(prefix)) return key;
  }
  return null;
}
