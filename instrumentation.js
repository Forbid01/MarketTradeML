// Серверийн алдааны төвлөрсөн бүртгэл (Next instrumentation hook).
// Бүх server component/route/action-ы баригдаагүй алдааг НЭГ форматтай JSON-оор
// логлоно (Vercel Logs-д шүүж хайхад хялбар) ба ERROR_WEBHOOK_URL тохируулсан бол
// Slack/Discord webhook руу шууд мэдэгдэнэ. Sentry-гүй, dependency-гүй хөнгөн хувилбар.
export async function onRequestError(err, request, context) {
  const entry = {
    level: "error",
    msg: err?.message ?? String(err),
    digest: err?.digest,
    path: request?.path,
    method: request?.method,
    routePath: context?.routePath,
    routeType: context?.routeType,
    at: new Date().toISOString(),
  };
  console.error("[app-error]", JSON.stringify(entry));

  const hook = process.env.ERROR_WEBHOOK_URL;
  if (!hook) return;
  try {
    // Slack/Discord хоёуланд ойлгогдох хамгийн энгийн формат
    await fetch(hook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: `🔴 MLBB Market алдаа: ${entry.msg}\n${entry.method} ${entry.path} (${entry.routeType} ${entry.routePath ?? ""})`,
        content: `🔴 MLBB Market алдаа: ${entry.msg}\n${entry.method} ${entry.path} (${entry.routeType} ${entry.routePath ?? ""})`,
      }),
    });
  } catch (e) {
    console.error("[app-error] webhook илгээлт амжилтгүй:", e?.message ?? e);
  }
}
