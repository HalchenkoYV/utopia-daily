import Link from "next/link";
import { BranchIcon } from "./BranchBadge";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="brand">Utopia Daily</div>
      <div className="for-learners">for English learners</div>
      <div className="tagline">real; fake news</div>
      <Link href="/about" className="footer-branch">
        <BranchIcon className="branch-icon" />
        Alternative world branch since 28 September 2026 · About us
      </Link>
      <div className="powered">powered by AI</div>
    </footer>
  );
}
