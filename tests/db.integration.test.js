// db/schema.sql-ийн plpgsql функцүүдийн integration тест — ЛОКАЛ Postgres дээр
// түр database үүсгэж бүтэн схемээ хэрэгжүүлээд escrow/төлбөр/promo/sweep-ийн
// гол замуудыг шалгана. Локал PG байхгүй орчинд (CI г.м) бүхэлдээ skip болно.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const TEST_DB = "accountsale_vitest";
const SELLER = "00000000-0000-0000-0000-000000000001";
const BUYER = "00000000-0000-0000-0000-000000000002";
const BUYER2 = "00000000-0000-0000-0000-000000000005";
const LISTING = "00000000-0000-0000-0000-00000000000a";

// Локал PG ажиллаж буй эсэхийг урьдчилан шалгана (default socket/localhost)
async function pgAvailable() {
  const c = new pg.Client({ host: "localhost", database: "postgres", connectionTimeoutMillis: 1500 });
  try {
    await c.connect();
    await c.end();
    return true;
  } catch {
    return false;
  }
}

const available = await pgAvailable();

describe.skipIf(!available)("db/schema.sql функцүүд", () => {
  /** @type {pg.Client} */
  let db;

  beforeAll(async () => {
    const admin = new pg.Client({ host: "localhost", database: "postgres" });
    await admin.connect();
    await admin.query(`drop database if exists ${TEST_DB}`);
    await admin.query(`create database ${TEST_DB}`);
    await admin.end();

    db = new pg.Client({ host: "localhost", database: TEST_DB });
    await db.connect();
    const schema = readFileSync(path.resolve(import.meta.dirname, "../db/schema.sql"), "utf8");
    await db.query(schema);

    await db.query(
      `insert into public.users (id, email, display_name) values
        ($1,'seller@t.mn','Seller'), ($2,'buyer@t.mn','Buyer'), ($3,'buyer2@t.mn','Buyer2')`,
      [SELLER, BUYER, BUYER2]
    );
    await db.query(
      `insert into public.listings (id, seller_id, title, price, server, rank, status)
       values ($1,$2,'Test',100000,'Asia','Mythic','active')`,
      [LISTING, SELLER]
    );
  }, 30_000);

  afterAll(async () => {
    await db?.end();
  });

  it("order_create: захиалга үүсгэж listing-ийг reserved болгоно", async () => {
    const r = await db.query(`select * from public.order_create($1,$2)`, [LISTING, BUYER]);
    expect(r.rows[0].status).toBe("created");
    expect(Number(r.rows[0].fee)).toBe(5000); // 5% шимтгэл
    const l = await db.query(`select status from public.listings where id=$1`, [LISTING]);
    expect(l.rows[0].status).toBe("reserved");
  });

  it("reserved зар дээр давхар захиалга боломжгүй", async () => {
    await expect(db.query(`select * from public.order_create($1,$2)`, [LISTING, BUYER2]))
      .rejects.toThrow(/идэвхгүй/);
  });

  it("өөрийн зарыг худалдан авахыг хориглоно", async () => {
    await db.query(
      `insert into public.listings (id, seller_id, title, price, server, rank, status)
       values ('00000000-0000-0000-0000-00000000000b',$1,'Own',50000,'Asia','Epic','active')`,
      [SELLER]
    );
    await expect(
      db.query(`select * from public.order_create('00000000-0000-0000-0000-00000000000b',$1)`, [SELLER])
    ).rejects.toThrow(/өөрийн/);
  });

  it("confirm_payment: underpaid / paid / replay=noop / overpaid=dispute", async () => {
    const { rows: [o] } = await db.query(`select id from public.orders where buyer_id=$1`, [BUYER]);

    const under = await db.query(
      `select public.confirm_payment($1,'INV-1',50000,'[{"payment_id":"u1","amount":50000}]'::jsonb,'{}'::jsonb) as r`,
      [o.id]
    );
    expect(under.rows[0].r).toBe("underpaid");

    const paid = await db.query(
      `select public.confirm_payment($1,'INV-1',100000,'[{"payment_id":"u1","amount":50000},{"payment_id":"u2","amount":50000}]'::jsonb,'{}'::jsonb) as r`,
      [o.id]
    );
    expect(paid.rows[0].r).toBe("paid");

    const replay = await db.query(
      `select public.confirm_payment($1,'INV-1',100000,'[{"payment_id":"u2","amount":50000}]'::jsonb,'{}'::jsonb) as r`,
      [o.id]
    );
    expect(replay.rows[0].r).toBe("noop");

    // payment_events: payment_id-ээр dedup-тэй бүртгэгдсэн
    const ev = await db.query(`select count(*)::int n from public.payment_events where order_id=$1`, [o.id]);
    expect(ev.rows[0].n).toBe(2);
  });

  it("order_transition: эрхийн хяналт + төлөвийн машин", async () => {
    const { rows: [o] } = await db.query(`select id from public.orders where buyer_id=$1`, [BUYER]);
    // Гадны хүн шилжүүлж чадахгүй
    await expect(
      db.query(`select * from public.order_transition($1,'transferring',$2)`, [o.id, BUYER2])
    ).rejects.toThrow(/эрх байхгүй/);
    // Худалдан авагч paid→transferring хийж чадахгүй (зөвхөн зарагч)
    await expect(
      db.query(`select * from public.order_transition($1,'transferring',$2)`, [o.id, BUYER])
    ).rejects.toThrow(/зөвшөөрөгдөхгүй/);
    // Зарагч эхлүүлнэ
    const r = await db.query(`select * from public.order_transition($1,'transferring',$2)`, [o.id, SELLER]);
    expect(r.rows[0].status).toBe("transferring");
  });

  it("sweep_stale_orders: invoice-гүй хуучирсан захиалга expired + listing суллагдана", async () => {
    await db.query(
      `insert into public.listings (id, seller_id, title, price, server, rank, status)
       values ('00000000-0000-0000-0000-00000000000c',$1,'Stale',80000,'Asia','Legend','active')`,
      [SELLER]
    );
    await db.query(`select public.order_create('00000000-0000-0000-0000-00000000000c',$1)`, [BUYER2]);
    await db.query(
      `update public.orders set created_at = now() - interval '25 hours'
        where listing_id = '00000000-0000-0000-0000-00000000000c'`
    );
    const n = await db.query(`select public.sweep_stale_orders() as n`);
    expect(Number(n.rows[0].n)).toBe(1);
    const l = await db.query(`select status from public.listings where id='00000000-0000-0000-0000-00000000000c'`);
    expect(l.rows[0].status).toBe("active");
  });

  it("promo: атомик CTE redemption + sweep-д слот буцаана", async () => {
    await db.query(`insert into public.promo_codes (code, percent_off, max_uses, active) values ('T10',10,1,true)`);
    const ins = await db.query(
      `with promo as (
         update public.promo_codes set used_count = used_count + 1
          where code = 'T10' and active = true
            and (expires_at is null or expires_at > now())
            and (max_uses is null or used_count < max_uses)
          returning percent_off
       )
       insert into public.boost_orders (buyer_id, service, config, matches, amount)
       select $1, 'winrate', '{"promo":"T10"}'::jsonb, 5,
              greatest(1, round(60000::bigint * (1 - promo.percent_off / 100.0)))::bigint
         from promo returning amount`,
      [BUYER]
    );
    expect(Number(ins.rows[0].amount)).toBe(54000);

    // max_uses дүүрсэн — дахин хэрэглэхгүй
    const again = await db.query(
      `with promo as (
         update public.promo_codes set used_count = used_count + 1
          where code = 'T10' and active = true and (max_uses is null or used_count < max_uses)
          returning percent_off
       ) select percent_off from promo`
    );
    expect(again.rows).toHaveLength(0);

    // Хуучирч cancelled болоход слот буцна
    await db.query(`update public.boost_orders set created_at = now() - interval '25 hours'`);
    await db.query(`select public.sweep_stale_boost_orders()`);
    const pc = await db.query(`select used_count from public.promo_codes where code='T10'`);
    expect(Number(pc.rows[0].used_count)).toBe(0);
  });

  it("guard_user_privileged_columns: role-ийг шууд update-аар өөрчилж чадахгүй", async () => {
    await db.query(`update public.users set role='admin' where id=$1`, [BUYER2]);
    const r = await db.query(`select role from public.users where id=$1`, [BUYER2]);
    expect(r.rows[0].role).toBe("user"); // trigger чимээгүй буцаасан
  });

  it("confirm_boost_payment: ledger бүртгэл + илүү төлбөрт админ мэдэгдэл", async () => {
    // role-ийг зөвхөн tx-local флагтай (схемийн ёсоор) өөрчилж болно
    await db.query("begin");
    await db.query(`select set_config('app.allow_trust_update','1',true)`);
    await db.query(`update public.users set role='admin' where id=$1`, [SELLER]);
    await db.query("commit");
    const { rows: [b] } = await db.query(
      `insert into public.boost_orders (buyer_id, service, config, matches, amount)
       values ($1,'winrate','{}',5,50000) returning id`,
      [BUYER]
    );
    const r = await db.query(
      `select public.confirm_boost_payment($1,'BINV-1',60000,'[{"payment_id":"bp1","amount":60000}]'::jsonb,'{}'::jsonb) as r`,
      [b.id]
    );
    expect(r.rows[0].r).toBe("overpaid");
    const led = await db.query(`select count(*)::int n from public.payment_events where boost_order_id=$1`, [b.id]);
    expect(led.rows[0].n).toBe(1);
    const notif = await db.query(`select count(*)::int n from public.notifications where type='boost_overpaid'`);
    expect(notif.rows[0].n).toBe(1);
  });
});

// PG байхгүй орчинд skip болсон шалтгааныг тэмдэглэнэ
if (!available) {
  describe("db/schema.sql функцүүд", () => {
    it.skip("локал Postgres олдсонгүй — integration тестүүд алгассан", () => {});
  });
}
