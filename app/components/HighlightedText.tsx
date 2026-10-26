import { splitSearchHighlight } from "@/lib/search";

export default function HighlightedText({ text, query }: { text: string; query: string }) {
  const parts = splitSearchHighlight(text, query);
  if (parts.length === 1 && !parts[0].match) return text;

  return parts.map((part, index) =>
    part.match ? (
      <mark key={index} className="search-mark">
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  );
}
