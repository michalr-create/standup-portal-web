import Link from "next/link";

export default function Nav() {
  return (
    <nav className="border-b border-neutral-800 mb-10">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl hover:text-gray-300">
          parska
        </Link>
        <div className="text-sm text-gray-400">
          <Link href="/" className="hover:text-white">
            Wszystko
          </Link>
        </div>
      </div>
    </nav>
  );
}
