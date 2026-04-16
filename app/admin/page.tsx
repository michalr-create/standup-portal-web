import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">Moderacja</h1>
      <p className="text-gray-400 mb-8">
        Tu pojawi sie kolejka pending wpisow do zatwierdzenia.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/standuperzy"
          className="block bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:bg-neutral-800 transition-colors"
        >
          <div className="text-2xl mb-2">🎤</div>
          <h2 className="font-semibold mb-1">Standuperzy</h2>
          <p className="text-sm text-gray-400">
            Lista, dodawanie, edycja
          </p>
        </Link>

        <Link
          href="/admin/formaty"
          className="block bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:bg-neutral-800 transition-colors"
        >
          <div className="text-2xl mb-2">📺</div>
          <h2 className="font-semibold mb-1">Formaty</h2>
          <p className="text-sm text-gray-400">
            Zarzadzanie programami
          </p>
        </Link>

        <Link
          href="/admin/zrodla"
          className="block bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:bg-neutral-800 transition-colors"
        >
          <div className="text-2xl mb-2">📡</div>
          <h2 className="font-semibold mb-1">Zrodla</h2>
          <p className="text-sm text-gray-400">
            Kanaly YT, podcasty, watch sources
          </p>
        </Link>
      </div>

      <div className="mt-10 p-6 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-gray-400">
        <p className="mb-2 text-white font-medium">Status panelu</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Krok 4a: Autoryzacja i szkielet — gotowe</li>
          <li>Krok 4b: Moderacja kolejki pending — nastepny</li>
          <li>Krok 4c: CRUD standuperow — w planach</li>
          <li>Krok 4d: CRUD shows — w planach</li>
          <li>Krok 4e: CRUD zrodel — w planach</li>
        </ul>
      </div>
    </div>
  );
}
