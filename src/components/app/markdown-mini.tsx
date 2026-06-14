/**
 * Tiny markdown-rendrer for AI-assistent-svar. Støtter:
 * - **bold**, *italic*
 * - [tekst](/lenke) — Next-Link for interne, vanlig anchor for eksterne
 * - Linjeskift → <br>
 * - - liste-elementer
 * - ## og ### headers
 *
 * Ikke produksjons-grade — vi vet at AI-svaret er kontrollert via vårt
 * system prompt, så vi trenger ikke håndtere alle edge-cases.
 */

import Link from "next/link";
import { Fragment } from "react";

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  // Først finn lenker [text](url) — splitt på dem
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = linkRe.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(...renderFormatting(text.slice(last, m.index), `${keyPrefix}-t${i++}`));
    }
    const linkText = m[1];
    const url = m[2];
    if (url.startsWith("/")) {
      nodes.push(
        <Link
          key={`${keyPrefix}-l${i++}`}
          href={url}
          className="text-orange hover:underline"
        >
          {linkText}
        </Link>,
      );
    } else {
      nodes.push(
        <a
          key={`${keyPrefix}-a${i++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange hover:underline"
        >
          {linkText}
        </a>,
      );
    }
    last = linkRe.lastIndex;
  }
  if (last < text.length) {
    nodes.push(...renderFormatting(text.slice(last), `${keyPrefix}-end`));
  }
  return nodes;
}

function renderFormatting(text: string, keyPrefix: string): React.ReactNode[] {
  // **bold** og *italic* — kjør gjennom i én pass
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(re);
  return parts
    .filter((p) => p.length > 0)
    .map((p, idx) => {
      const key = `${keyPrefix}-f${idx}`;
      if (p.startsWith("**") && p.endsWith("**")) {
        return (
          <strong key={key} className="font-semibold">
            {p.slice(2, -2)}
          </strong>
        );
      }
      if (p.startsWith("*") && p.endsWith("*")) {
        return (
          <em key={key} className="italic">
            {p.slice(1, -1)}
          </em>
        );
      }
      if (p.startsWith("`") && p.endsWith("`")) {
        return (
          <code
            key={key}
            className="font-mono text-xs bg-card-hover rounded px-1 py-0.5"
          >
            {p.slice(1, -1)}
          </code>
        );
      }
      return <Fragment key={key}>{p}</Fragment>;
    });
}

export function MarkdownMini({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let listBuf: string[] = [];

  function flushList(key: string) {
    if (listBuf.length === 0) return;
    blocks.push(
      <ul key={key} className="list-disc list-inside space-y-1 my-2">
        {listBuf.map((item, i) => (
          <li key={`${key}-i${i}`}>{renderInline(item, `${key}-i${i}`)}</li>
        ))}
      </ul>,
    );
    listBuf = [];
  }

  lines.forEach((line, lineIdx) => {
    const key = `b${lineIdx}`;
    if (/^\s*[-*]\s+/.test(line)) {
      listBuf.push(line.replace(/^\s*[-*]\s+/, ""));
      return;
    }
    flushList(key);
    if (line.trim() === "") {
      blocks.push(<div key={key} className="h-2" />);
      return;
    }
    if (line.startsWith("### ")) {
      blocks.push(
        <h4 key={key} className="font-semibold text-sm mt-3 mb-1">
          {renderInline(line.slice(4), key)}
        </h4>,
      );
      return;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h3 key={key} className="font-semibold text-base mt-3 mb-1">
          {renderInline(line.slice(3), key)}
        </h3>,
      );
      return;
    }
    blocks.push(
      <p key={key} className="leading-relaxed">
        {renderInline(line, key)}
      </p>,
    );
  });
  flushList("end");

  return <div className="text-sm space-y-1">{blocks}</div>;
}
