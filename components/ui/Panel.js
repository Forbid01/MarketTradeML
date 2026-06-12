// Канон панел/карт — 26+ газар давтагдаж байсан surface хэв маяг.
// variant: surface (default) | raised. Hook-гүй тул server/client аль алинд.
const VARIANTS = {
  surface: "rounded-xl border border-white/10 bg-white/[0.03]",
  raised: "rounded-2xl border border-white/10 bg-white/[0.06]",
};

export default function Panel({ variant = "surface", className = "", children, ...props }) {
  return (
    <div className={`${VARIANTS[variant] ?? VARIANTS.surface} ${className}`} {...props}>
      {children}
    </div>
  );
}
