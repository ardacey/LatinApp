"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpen, GraduationCap, Search, BarChart2, Menu, X, Scroll } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/",          label: "Sözlük",       icon: BookOpen },
  { href: "/exercises", label: "Alıştırmalar",  icon: GraduationCap },
  { href: "/reader",    label: "Metinler",      icon: Scroll },
  { href: "/analyze",   label: "Metin Analizi", icon: Search },
  { href: "/stats",     label: "İstatistikler", icon: BarChart2 },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="border-b border-stone-200 bg-white/90 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-stone-800 text-lg tracking-tight hover:text-stone-600 transition-colors"
        >
          <BookOpen className="w-5 h-5 text-stone-600" strokeWidth={2} />
          Latince
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "text-stone-900 bg-stone-100 font-semibold"
                    : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"
                )}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="sm:hidden p-2 rounded-md text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
          aria-label="Menüyü aç"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden border-t border-stone-100 bg-white px-4 py-3 space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "text-stone-900 bg-stone-100 font-semibold"
                    : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"
                )}
              >
                <Icon className="w-4 h-4" strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
