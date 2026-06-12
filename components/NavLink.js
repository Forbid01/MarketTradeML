"use client";

// Идэвхтэй навигацийн линкийг aria-current="page"-ээр тэмдэглэнэ (screen reader +
// идэвхтэй төлвийн загвар). Header server component хэвээр — зөвхөн линк нь client.
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({ href, className = "", activeClassName = "text-white", children, ...props }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${className} ${active ? activeClassName : ""}`}
      {...props}
    >
      {children}
    </Link>
  );
}
