"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Sözlük" },
  { href: "/exercises", label: "Alıştırmalar" },
  { href: "/analyze", label: "Metin Analizi" },
  { href: "/stats", label: "İstatistikler" },
  { href: "/admin", label: "Admin", subtle: true },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-stone-200 bg-white sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 flex items-center gap-8 h-14">
        <Link href="/" className="font-semibold text-stone-800 text-lg tracking-tight">
          🏛️ Latince
        </Link>
        <div className="flex gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === l.href
                  ? "bg-stone-100 text-stone-900"
                  : l.subtle
                  ? "text-stone-300 hover:text-stone-500 hover:bg-stone-50"
                  : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
