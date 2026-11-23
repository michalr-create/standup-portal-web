function Bone({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md ${className}`} style={{ background: "var(--ink-3)" }} />;
}

function Card() {
  return (
    <div>
      <div className="animate-pulse" style={{ aspectRatio: "16/10", borderRadius: "14px", background: "var(--ink-3)" }} />
      <Bone className="mt-3 h-4 w-4/5" />
      <Bone className="mt-2 h-3 w-2/5" />
    </div>
  );
}

export default function StanduperLoading() {
  return (
    <div className="band" aria-busy="true">
      <span className="sr-only">{"\u0141adowanie profilu"}</span>
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <Bone className="mb-3 h-3 w-24" />
          <Bone className="h-11 w-72 max-w-full" />
          <Bone className="mt-4 h-4 w-full max-w-2xl" />
          <Bone className="mt-2 h-4 w-2/3 max-w-xl" />
        </header>
        <Bone className="mt-6 h-12 w-full max-w-xs rounded-full" />
        <Bone className="mt-10 mb-6 h-8 w-40" />
        <div className="flex gap-5 overflow-hidden">
          <div className="w-72 shrink-0">
            <Card />
          </div>
          <div className="w-72 shrink-0">
            <Card />
          </div>
        </div>
      </div>
    </div>
  );
}
