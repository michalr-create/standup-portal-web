import Image from "next/image";
import type { PersonPortrait } from "@/lib/person-portrait";

function YoutubeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#FF0000"
        d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8z"
      />
      <path fill="#fff" d="M9.8 15.5v-7l6.3 3.5-6.3 3.5z" />
    </svg>
  );
}

export default function ProfilePortrait({ name, portrait }: { name: string; portrait: PersonPortrait }) {
  const youtube = portrait.kind === "youtube";
  return (
    <div className="flex shrink-0 items-end gap-2">
      <Image
        src={portrait.src}
        alt={name}
        width={portrait.width}
        height={portrait.height}
        priority
        sizes="88px"
        unoptimized={youtube}
        className="h-[88px] w-[88px] rounded-full object-cover"
        style={{ width: 88, height: 88, border: "1px solid var(--line-2)" }}
      />
      {youtube && portrait.channelUrl ? (
        <a
          href={portrait.channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Kanał YouTube: ${name}`}
          className="mb-0.5 inline-flex rounded-sm"
        >
          <YoutubeIcon />
        </a>
      ) : null}
    </div>
  );
}

export function ProfilePortraitCredit({ portrait }: { portrait: PersonPortrait }) {
  if (portrait.kind === "youtube" || (!portrait.credit && !portrait.license)) return null;
  return (
    <p className="mono text-xs mt-3 max-w-2xl" style={{ color: "var(--paper-mute)", lineHeight: 1.45 }}>
      {portrait.credit ? `Fot. ${portrait.credit}` : "Fot."}
      {portrait.license ? (
        <>
          {", "}
          {portrait.licenseUrl ? (
            <a className="underline" href={portrait.licenseUrl} target="_blank" rel="noopener noreferrer license">
              {portrait.license}
            </a>
          ) : portrait.license}
        </>
      ) : null}
      {portrait.cropped ? ", przycięte" : ""}
      {portrait.kind === "commons" && portrait.sourceUrl ? (
        <>
          {", via "}
          <a className="underline" href={portrait.sourceUrl} target="_blank" rel="noopener noreferrer">
            Wikimedia Commons
          </a>
        </>
      ) : null}
    </p>
  );
}
