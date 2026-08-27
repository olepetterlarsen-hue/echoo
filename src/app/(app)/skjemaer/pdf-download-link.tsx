"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

interface Props {
  href: string;
}

// Egen klientkomponent: onClick/stopPropagation kan ikke sendes som prop
// fra en Server Component (page.tsx) til next/link — bare fra klientkode.
// stopPropagation hindrer at den ytre rad-lenken (til skjema-detalj) trigges
// når brukeren klikker last-ned-knappen.
export function PdfDownloadLink({ href }: Props) {
  return (
    <Link href={href} target="_blank" onClick={(e) => e.stopPropagation()}>
      <Button size="sm" variant="secondary">
        <FileDown className="size-4" />
      </Button>
    </Link>
  );
}
