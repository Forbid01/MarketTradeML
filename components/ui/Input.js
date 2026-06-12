// Нэгдсэн форм талбарууд — 12+ файлд давтагдаж байсан focus-ring base нэг эх сурвалжид.
// Hook-гүй тул server/client аль алинд ажиллана.
const BASE =
  "w-full rounded-lg border border-white/10 bg-white/5 text-slate-50 outline-none placeholder:text-slate-500 focus:border-violet focus:ring-1 focus:ring-violet";

const SIZES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-3 py-2 text-sm",
};

export function Input({ size = "md", className = "", ...props }) {
  return <input className={`${BASE} ${SIZES[size] ?? SIZES.md} ${className}`} {...props} />;
}

export function Textarea({ size = "md", className = "", ...props }) {
  return <textarea className={`${BASE} ${SIZES[size] ?? SIZES.md} ${className}`} {...props} />;
}

export function Select({ size = "md", className = "", children, ...props }) {
  return (
    <select className={`${BASE} ${SIZES[size] ?? SIZES.md} ${className}`} {...props}>
      {children}
    </select>
  );
}
