// Zod схем — зар үүсгэх/засах өгөгдлийн нэгдсэн баталгаажуулалт. Клиент дээр submit-ийн өмнө,
// мөн ирээдүйд server action/RPC дотор ашиглаж болно. DB-ийн CHECK constraint-ууд эцсийн
// (сервер талын) баталгаа хэвээр; энэ нь UX + давхар хамгаалалт.
import { z } from "zod";
import { RANKS, SERVERS } from "@/lib/constants";

export const listingSchema = z.object({
  title: z.string().trim().min(3).max(140),
  price: z.number().int().positive(), // ₮ > 0 (үнэгүй зар утгагүй)
  server: z.string().refine((s) => SERVERS.includes(s), "буруу сервер"),
  rank: z.string().refine((r) => RANKS.includes(r), "буруу ранк"),
  description: z.string().max(4000).nullable().optional(),
  level: z.number().int().min(0).max(1000).nullable().optional(),
  heroes_count: z.number().int().min(0).max(500).nullable().optional(),
  skins_count: z.number().int().min(0).max(5000).nullable().optional(),
  win_rate: z.number().min(0).max(100).nullable().optional(),
});
