import type { Metadata } from "next";
import WordsList from "@/components/WordsList";

export const metadata: Metadata = { title: "My Words — Utopia Daily" };

export default function WordsPage() {
  return <WordsList />;
}
