export default function PaidBadge() {
  return (
    <span
      className="absolute bottom-2.5 left-2.5 z-[2] mono rounded-md px-2 py-1 font-extrabold"
      style={{ background: "var(--coral)", color: "var(--ink)", fontSize: "13px", lineHeight: 1 }}
      title={"P\u0142atne"}
      aria-label={"P\u0142atne"}
    >
      $
    </span>
  );
}
