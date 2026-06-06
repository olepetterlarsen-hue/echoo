"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { HANDBOOK_NO, HANDBOOK_EN, type HandbookContent } from "./content";

export function Handbook() {
  const [lang, setLang] = useState<"no" | "en">("no");
  const content: HandbookContent = lang === "no" ? HANDBOOK_NO : HANDBOOK_EN;

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{content.title}</h1>
          <p className="text-text-2 text-sm">{content.subtitle}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setLang((l) => (l === "no" ? "en" : "no"))}
        >
          <Languages className="size-4" />
          {lang === "no" ? "English" : "Norsk"}
        </Button>
      </header>

      <nav className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-xs uppercase tracking-wider text-text-3 mb-2">
          {content.tocTitle}
        </h2>
        <ol className="text-sm space-y-1 list-decimal list-inside text-text-2">
          {content.chapters.map((c, i) => (
            <li key={i}>
              <a href={`#kap-${i + 1}`} className="hover:text-orange">
                {c.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {content.chapters.map((chapter, i) => (
        <Card key={i} id={`kap-${i + 1}`}>
          <CardHeader>
            <CardTitle>
              {i + 1}. {chapter.title}
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4 text-sm leading-relaxed text-text-2">
            {chapter.blocks.map((block, j) => {
              if (block.type === "p") {
                return <p key={j}>{block.text}</p>;
              }
              if (block.type === "h") {
                return (
                  <h3 key={j} className="text-text-1 font-semibold pt-2">
                    {block.text}
                  </h3>
                );
              }
              if (block.type === "list") {
                return (
                  <ul key={j} className="list-disc list-inside space-y-1 pl-2">
                    {block.items.map((item, k) => (
                      <li key={k}>{item}</li>
                    ))}
                  </ul>
                );
              }
              if (block.type === "ol") {
                return (
                  <ol key={j} className="list-decimal list-inside space-y-1 pl-2">
                    {block.items.map((item, k) => (
                      <li key={k}>{item}</li>
                    ))}
                  </ol>
                );
              }
              if (block.type === "note") {
                return (
                  <div
                    key={j}
                    className="border-l-2 border-orange/60 bg-orange/5 pl-3 py-2 text-text-1"
                  >
                    {block.text}
                  </div>
                );
              }
              return null;
            })}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
