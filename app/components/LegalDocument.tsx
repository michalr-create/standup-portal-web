import Link from "next/link";
import { Fragment, type ReactNode } from "react";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

function inlineNodes(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(re)) {
    const at = match.index ?? 0;
    if (at > last) nodes.push(text.slice(last, at));
    const key = `${keyPrefix}-${index}`;
    if (match[1] && match[2]) {
      const href = match[2];
      const className = `font-bold underline-offset-4 hover:underline ${focusRing}`;
      nodes.push(
        href.startsWith("/") ? (
          <Link key={key} href={href} className={className} style={{ color: "var(--coral)" }}>
            {match[1]}
          </Link>
        ) : (
          <a key={key} href={href} className={className} style={{ color: "var(--coral)" }}>
            {match[1]}
          </a>
        ),
      );
    } else if (match[3]) {
      nodes.push(<strong key={key}>{match[3]}</strong>);
    } else if (match[4]) {
      nodes.push(
        <code key={key} className="mono text-[0.92em]">
          {match[4]}
        </code>,
      );
    }
    last = at + match[0].length;
    index += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function isTableRow(line: string): boolean {
  return line.trim().startsWith("|");
}

function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isDivider(line: string): boolean {
  return /^\|?\s*:?-{3,}/.test(line.trim());
}

export default function LegalDocument({ title, source }: { title: string; source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  const pushParagraph = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    blocks.push(
      <p key={key} className="m-0 text-base leading-relaxed" style={{ color: "var(--paper-dim)" }}>
        {inlineNodes(trimmed, `p${key}`)}
      </p>,
    );
    key += 1;
  };

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    if (!trimmed) {
      i += 1;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      i += 1;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push(
        <h2 key={key} className="m-0 mt-8 text-2xl font-black" style={{ letterSpacing: "-.02em" }}>
          {inlineNodes(trimmed.slice(3), `h${key}`)}
        </h2>,
      );
      key += 1;
      i += 1;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      blocks.push(
        <h3 key={key} className="m-0 mt-6 text-lg font-extrabold">
          {inlineNodes(trimmed.slice(4), `h${key}`)}
        </h3>,
      );
      key += 1;
      i += 1;
      continue;
    }
    if (isTableRow(trimmed)) {
      const rows: string[][] = [];
      while (i < lines.length && isTableRow((lines[i] ?? "").trim())) {
        const current = (lines[i] ?? "").trim();
        if (!isDivider(current)) rows.push(tableCells(current));
        i += 1;
      }
      const [head, ...body] = rows;
      if (head) {
        blocks.push(
          <div key={key} className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm" style={{ color: "var(--paper-dim)" }}>
              <thead>
                <tr>
                  {head.map((cell, cellIndex) => (
                    <th
                      key={cellIndex}
                      className="px-3 py-2 font-black"
                      style={{ borderBottom: "1px solid var(--line)", color: "var(--paper)" }}
                    >
                      {inlineNodes(cell, `th${key}-${cellIndex}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-3 py-2 align-top" style={{ borderBottom: "1px solid var(--line)" }}>
                        {inlineNodes(cell, `td${key}-${rowIndex}-${cellIndex}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        key += 1;
      }
      continue;
    }
    if (trimmed.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i] ?? "").trim().startsWith("- ")) {
        items.push((lines[i] ?? "").trim().slice(2));
        i += 1;
      }
      blocks.push(
        <ul key={key} className="m-0 flex list-disc flex-col gap-2 pl-5 text-base leading-relaxed" style={{ color: "var(--paper-dim)" }}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{inlineNodes(item, `li${key}-${itemIndex}`)}</li>
          ))}
        </ul>,
      );
      key += 1;
      continue;
    }
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test((lines[i] ?? "").trim())) {
        items.push((lines[i] ?? "").trim().replace(/^\d+\.\s/, ""));
        i += 1;
      }
      blocks.push(
        <ol key={key} className="m-0 flex list-decimal flex-col gap-2 pl-5 text-base leading-relaxed" style={{ color: "var(--paper-dim)" }}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{inlineNodes(item, `ol${key}-${itemIndex}`)}</li>
          ))}
        </ol>,
      );
      key += 1;
      continue;
    }
    const paragraph: string[] = [trimmed];
    i += 1;
    while (i < lines.length) {
      const next = (lines[i] ?? "").trim();
      if (!next || next.startsWith("#") || next.startsWith("- ") || /^\d+\.\s/.test(next) || isTableRow(next)) break;
      paragraph.push(next);
      i += 1;
    }
    pushParagraph(paragraph.join(" "));
  }

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-16">
      <h1 className="m-0 font-black leading-none" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-.03em" }}>
        {title}
        <span className="dot-accent">.</span>
      </h1>
      {blocks.map((block, index) => (
        <Fragment key={index}>{block}</Fragment>
      ))}
    </article>
  );
}
