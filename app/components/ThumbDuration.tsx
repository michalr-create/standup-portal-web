import { formatDuration } from "@/lib/format";
import { showThumbDuration } from "@/lib/youtube";

export default function ThumbDuration({
  seconds,
  isPaid,
}: {
  seconds: number | null;
  isPaid: boolean;
}) {
  if (!showThumbDuration(isPaid, seconds)) return null;

  return (
    <div
      className="absolute bottom-2.5 right-2.5 mono px-2 py-1 rounded-md"
      style={{ background: "rgba(11,11,11,.8)", color: "var(--paper)", fontSize: "11px" }}
    >
      {formatDuration(seconds)}
    </div>
  );
}
