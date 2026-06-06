"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePadLib from "signature_pad";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";

interface Props {
  initialDataUrl?: string | null;
  onChange?: (dataUrl: string | null) => void;
  height?: number;
}

export function SignaturePad({ initialDataUrl, onChange, height = 200 }: Props) {
  const { locale } = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const [empty, setEmpty] = useState(!initialDataUrl);

  function resizeCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    ctx?.scale(ratio, ratio);
    padRef.current?.clear();
    if (initialDataUrl) {
      padRef.current?.fromDataURL(initialDataUrl, { ratio });
      setEmpty(false);
    }
  }

  useEffect(() => {
    if (!canvasRef.current) return;
    padRef.current = new SignaturePadLib(canvasRef.current, {
      backgroundColor: "rgba(255,255,255,0)",
      penColor: "#0D0D0D",
      minWidth: 1,
      maxWidth: 2.5,
    });
    padRef.current.addEventListener("endStroke", () => {
      setEmpty(false);
      onChange?.(padRef.current?.toDataURL("image/png") ?? null);
    });
    resizeCanvas();
    const onResize = () => resizeCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clear() {
    padRef.current?.clear();
    setEmpty(true);
    onChange?.(null);
  }

  return (
    <div className="space-y-2">
      <div
        className="bg-white rounded-md border border-border overflow-hidden relative"
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none block"
          style={{ background: "#FAFAFA" }}
        />
        {empty && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none text-text-3 text-sm">
            {tr("signature_draw_here", locale)}
          </div>
        )}
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-text-3">
          {tr("signature_help_inline", locale)}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={clear}>
          {tr("profile_clear", locale)}
        </Button>
      </div>
    </div>
  );
}
