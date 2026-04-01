import { notFound } from "next/navigation";
import { TEXTS } from "@/lib/texts";
import { ReaderView } from "./ReaderView";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const text = TEXTS.find((t) => t.slug === slug);
  if (!text) return {};
  return {
    title: text.title,
    description: text.description,
  };
}

export function generateStaticParams() {
  return TEXTS.map((t) => ({ slug: t.slug }));
}

export default async function ReaderPage({ params }: Props) {
  const { slug } = await params;
  const text = TEXTS.find((t) => t.slug === slug);
  if (!text) notFound();

  return <ReaderView text={text} />;
}
