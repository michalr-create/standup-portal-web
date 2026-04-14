import Link from "next/link";
import InstallButton from "./InstallButton";

export default function Nav() {
  return (
    <nav className="border-b border-neutral-800 mb-10">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="font-bold text-xl hover:text-gray-300">
          parska
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-gray-400 hover:text-white">
            Wszystko
          </Link>
          <InstallButton />
        </div>
      </div>
    </nav>
  );
}
