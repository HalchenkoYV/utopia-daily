import Link from "next/link";

export default function NotFound() {
  return (
    <div className="simple-page">
      <h1>Page not found</h1>
      <p>This page doesn’t exist — maybe it’s still being written.</p>
      <Link href="/" className="btn-solid">
        Back to stories
      </Link>
    </div>
  );
}
