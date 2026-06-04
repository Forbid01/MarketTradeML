// Neon (serverless Postgres) client — зөвхөн СЕРВЕР тал (server component / action / route).
// DATABASE_URL тохируулаагүй ч import унахгүй (lazy); жинхэнэ query дуудахад л алдана.
import { neon } from "@neondatabase/serverless";

export const isDbConfigured = Boolean(process.env.DATABASE_URL);

let _sql;
function getSql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL тохируулаагүй байна");
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// Параметртэй query — мөрүүдийн массив буцаана. ($1,$2,... placeholder)
export async function query(text, params = []) {
  return getSql().query(text, params);
}

// Эхний мөр (эсвэл null)
export async function queryOne(text, params = []) {
  const rows = await getSql().query(text, params);
  return rows?.[0] ?? null;
}

// Нэг утга буцаадаг функц дуудах: select fn($1,...) — скаляр буцаана
export async function callScalar(text, params = []) {
  const rows = await getSql().query(text, params);
  const row = rows?.[0];
  if (!row) return null;
  return Object.values(row)[0];
}

// Тэмдэглэл: escrow-ийн атомик байдал (FOR UPDATE) бүхэлдээ db/schema.sql дахь Postgres функц
// дотор хийгддэг (нэг statement = нэг tx) тул апп талд олон-statement транзакц шаардлагагүй.
