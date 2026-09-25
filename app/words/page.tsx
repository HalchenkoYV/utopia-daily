import type { Metadata } from "next";
import MyWords from "@/components/MyWords";

export const metadata: Metadata = { title: "My Words — Utopia Daily" };

export default function WordsPage() {
  return (
    <div className="words-page">
      <MyWords variant="page" />
    </div>
  );
}
