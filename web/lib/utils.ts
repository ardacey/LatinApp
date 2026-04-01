import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const POS_LABELS: Record<string, string> = {
  noun: "İsim",
  verb: "Fiil",
  adjective: "Sıfat",
  adverb: "Zarf",
  preposition: "Edat",
  conjunction: "Bağlaç",
  pronoun: "Zamir",
  numeral: "Sayı",
  interjection: "Ünlem",
  particle: "Parçacık",
};

/** Single-string Tailwind class for POS badge (bg + text + border) */
export const POS_COLORS: Record<string, string> = {
  noun:         "bg-amber-50 text-amber-900 border-amber-200",
  verb:         "bg-red-50 text-red-900 border-red-200",
  adjective:    "bg-sky-50 text-sky-900 border-sky-200",
  adverb:       "bg-purple-50 text-purple-900 border-purple-200",
  preposition:  "bg-orange-50 text-orange-900 border-orange-200",
  conjunction:  "bg-pink-50 text-pink-900 border-pink-200",
  pronoun:      "bg-teal-50 text-teal-900 border-teal-200",
  numeral:      "bg-green-50 text-green-900 border-green-200",
  interjection: "bg-yellow-50 text-yellow-900 border-yellow-200",
  particle:     "bg-slate-50 text-slate-700 border-slate-200",
};

/** Split-object POS colors used by the analyze page for richer styling */
export const POS_COLOR_PARTS: Record<string, { bg: string; text: string; border: string }> = {
  noun:         { bg: "bg-amber-100",  text: "text-amber-900",  border: "border-amber-300" },
  verb:         { bg: "bg-red-100",    text: "text-red-900",    border: "border-red-300" },
  adjective:    { bg: "bg-sky-100",    text: "text-sky-900",    border: "border-sky-300" },
  adverb:       { bg: "bg-purple-100", text: "text-purple-900", border: "border-purple-300" },
  preposition:  { bg: "bg-orange-100", text: "text-orange-900", border: "border-orange-300" },
  conjunction:  { bg: "bg-pink-100",   text: "text-pink-900",   border: "border-pink-300" },
  pronoun:      { bg: "bg-teal-100",   text: "text-teal-900",   border: "border-teal-300" },
  numeral:      { bg: "bg-green-100",  text: "text-green-900",  border: "border-green-300" },
  interjection: { bg: "bg-yellow-100", text: "text-yellow-900", border: "border-yellow-300" },
  particle:     { bg: "bg-slate-100",  text: "text-slate-700",  border: "border-slate-300" },
};

export function posBadgeClass(pos: string): string {
  return cn(
    "text-xs px-2 py-0.5 rounded-full font-medium border",
    POS_COLORS[pos] ?? "bg-stone-100 text-stone-700 border-stone-200"
  );
}
