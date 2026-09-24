import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Log in — Utopia Daily" };

export default function LoginPage() {
  return (
    <div className="simple-page">
      <h1>Log in</h1>
      <p>Accounts are coming soon. You can already read every story without an account.</p>
      <Link href="/" className="btn-solid">
        Back to stories
      </Link>
    </div>
  );
}
