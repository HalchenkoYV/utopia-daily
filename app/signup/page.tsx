import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign up — Utopia Daily" };

export default function SignupPage() {
  return (
    <div className="simple-page">
      <h1>Sign up</h1>
      <p>
        Accounts are coming soon. With an account you will be able to save words and get feedback on your
        retellings. Reading is always free and open.
      </p>
      <Link href="/" className="btn-solid">
        Back to stories
      </Link>
    </div>
  );
}
