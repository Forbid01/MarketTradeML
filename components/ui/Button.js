// Нэгдсэн товч — variant/size-аар брэндийн бүх товчны хэв маяг нэг эх сурвалжид.
// Hook-гүй тул server/client аль алинд; href өгвөл <Link>, үгүй бол <button>.
import Link from "next/link";

const VARIANTS = {
  primary: "bg-gradient-to-r from-violet to-azure text-white hover:brightness-110",
  ghost: "border border-white/15 text-slate-200 hover:bg-white/[0.03]",
  danger: "border border-red-500/30 bg-red-500/15 text-red-300 hover:bg-red-500/25",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
};

const SIZES = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-sm",
};

export default function Button({
  variant = "primary",
  size = "md",
  href,
  className = "",
  children,
  ...props
}) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:opacity-50 ${
    VARIANTS[variant] ?? VARIANTS.primary
  } ${SIZES[size] ?? SIZES.md} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
