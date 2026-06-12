import { describe, it, expect } from "vitest";
import { summarizePaidRows } from "@/lib/qpay";

describe("summarizePaidRows", () => {
  it("PAID мөрүүдийг нэгтгэж нийлбэр гаргана", () => {
    const { payments, paidTotal } = summarizePaidRows({
      rows: [
        { payment_id: "p1", payment_status: "PAID", payment_amount: 100000 },
        { payment_id: "p2", payment_status: "PAID", payment_amount: 50000 },
      ],
    });
    expect(payments).toHaveLength(2);
    expect(paidTotal).toBe(150000);
  });
  it("payment_id-ээр dedup (давхар мөр → хуурамч overpayment-аас сэргийлнэ)", () => {
    const { payments, paidTotal } = summarizePaidRows({
      rows: [
        { payment_id: "p1", payment_status: "PAID", payment_amount: 100000 },
        { payment_id: "p1", payment_status: "PAID", payment_amount: 100000 },
      ],
    });
    expect(payments).toHaveLength(1);
    expect(paidTotal).toBe(100000);
  });
  it("PAID биш статусыг тооцохгүй", () => {
    const { payments, paidTotal } = summarizePaidRows({
      rows: [
        { payment_id: "p1", payment_status: "REFUNDED", payment_amount: 100000 },
        { payment_id: "p2", payment_status: "paid", payment_amount: 70000 }, // case-insensitive
      ],
    });
    expect(payments).toHaveLength(1);
    expect(paidTotal).toBe(70000);
  });
  it("хоосон/дутуу хариунд уналгүй", () => {
    expect(summarizePaidRows({})).toEqual({ payments: [], paidTotal: 0 });
    expect(summarizePaidRows(null)).toEqual({ payments: [], paidTotal: 0 });
  });
});
