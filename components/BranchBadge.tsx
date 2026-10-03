import Link from "next/link";

/** Tiny drawing: the main timeline with a branch leaving it. */
export function BranchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 20" aria-hidden="true" focusable="false">
      <path className="bi-main" d="M1 15 H31" />
      <path className="bi-branch" d="M11 15 C17 15 20 5 31 3" />
      <circle className="bi-node" cx="11" cy="15" r="2.6" />
    </svg>
  );
}

/** Header link next to the logo: where the Utopia Timeline splits from ours. */
export default function BranchBadge() {
  return (
    <Link href="/about" className="branch-badge" title="About the Utopia Timeline">
      <BranchIcon className="branch-icon" />
      <span className="branch-text">
        <span className="bt-main">Alternative world branch</span>
        <span className="bt-date">since 28 September 2026</span>
      </span>
    </Link>
  );
}
