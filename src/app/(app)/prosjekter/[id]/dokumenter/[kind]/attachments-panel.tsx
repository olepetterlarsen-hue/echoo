"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Trash2, AlertCircle, RotateCw } from "lucide-react";
import { compressImage } from "@/lib/image-compress";
import { uploadAttachment, deleteAttachment } from "./actions";

export interface AttachmentItem {
  id: string;
  filename: string;
  size: number;
  created_at: string;
  url: string | null;
}

interface PendingUpload {
  localId: string;
  file: File;
  previewUrl: string;
  status: "compressing" | "uploading" | "error";
  error?: string;
}

interface Props {
  documentId: string | null;
  disabled?: boolean;
  initialAttachments: AttachmentItem[];
}

/**
 * "Vedlegg"-seksjon på dokumentnivå (B4/F-15/I-25). Dokumentnivå dekker
 * samsvarserklæring/RUH/oppstartssjekkliste — schemaet har question_id for
 * per-sjekkpunkt-vedlegg (sluttkontroll/risikovurdering), men den UI-en er
 * bevisst IKKE bygget i denne runden, se docs/qa/STATUS.md.
 */
export function AttachmentsPanel({ documentId, disabled, initialAttachments }: Props) {
  const fileInputId = useId();
  const [items, setItems] = useState<AttachmentItem[]>(initialAttachments);
  const [pending, setPending] = useState<PendingUpload[]>([]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !documentId) return;

    for (const rawFile of Array.from(files)) {
      const localId = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(rawFile);
      setPending((curr) => [
        ...curr,
        { localId, file: rawFile, previewUrl, status: "compressing" },
      ]);

      let uploadFile: File;
      try {
        uploadFile = await compressImage(rawFile);
      } catch {
        uploadFile = rawFile;
      }

      setPending((curr) =>
        curr.map((p) => (p.localId === localId ? { ...p, status: "uploading" } : p)),
      );

      const res = await uploadAttachment({
        documentId,
        questionId: null,
        file: uploadFile,
      });

      if (res.error || !res.attachment) {
        setPending((curr) =>
          curr.map((p) =>
            p.localId === localId
              ? { ...p, status: "error", error: res.error ?? "Ukjent feil ved opplasting." }
              : p,
          ),
        );
        continue;
      }

      setItems((curr) => [
        ...curr,
        {
          id: res.attachment!.id,
          filename: res.attachment!.filename,
          size: res.attachment!.size,
          created_at: res.attachment!.created_at,
          url: res.url ?? null,
        },
      ]);
      setPending((curr) => curr.filter((p) => p.localId !== localId));
      URL.revokeObjectURL(previewUrl);
    }
  }

  async function retry(p: PendingUpload) {
    setPending((curr) =>
      curr.map((x) => (x.localId === p.localId ? { ...x, status: "uploading", error: undefined } : x)),
    );
    if (!documentId) return;
    const res = await uploadAttachment({ documentId, questionId: null, file: p.file });
    if (res.error || !res.attachment) {
      setPending((curr) =>
        curr.map((x) =>
          x.localId === p.localId
            ? { ...x, status: "error", error: res.error ?? "Ukjent feil ved opplasting." }
            : x,
        ),
      );
      return;
    }
    setItems((curr) => [
      ...curr,
      {
        id: res.attachment!.id,
        filename: res.attachment!.filename,
        size: res.attachment!.size,
        created_at: res.attachment!.created_at,
        url: res.url ?? null,
      },
    ]);
    setPending((curr) => curr.filter((x) => x.localId !== p.localId));
    URL.revokeObjectURL(p.previewUrl);
  }

  function dismissError(localId: string) {
    setPending((curr) => {
      const p = curr.find((x) => x.localId === localId);
      if (p) URL.revokeObjectURL(p.previewUrl);
      return curr.filter((x) => x.localId !== localId);
    });
  }

  async function onDelete(id: string) {
    const prev = items;
    setItems((curr) => curr.filter((it) => it.id !== id));
    const res = await deleteAttachment({ id });
    if (res.error) {
      // Feilet sletting — rull tilbake UI-en og vis feilen.
      setItems(prev);
      window.alert(`Klarte ikke slette vedlegget: ${res.error}`);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vedlegg</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {!documentId && (
          <p className="text-sm text-text-3">
            Lagre dokumentet som utkast først for å kunne legge til bilder.
          </p>
        )}

        {documentId && !disabled && (
          <label
            htmlFor={fileInputId}
            className="inline-flex items-center gap-2 px-3 h-9 rounded-md border border-border bg-card hover:bg-card-hover text-sm cursor-pointer"
          >
            <Camera className="size-4" />
            Legg til bilde
            <input
              id={fileInputId}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}

        {(items.length > 0 || pending.length > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {items.map((it) => (
              <div key={it.id} className="relative group">
                {it.url ? (
                  <div className="relative aspect-square rounded-md overflow-hidden border border-border bg-card">
                    <Image
                      src={it.url}
                      alt={it.filename}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square rounded-md border border-border bg-card grid place-items-center text-xs text-text-3">
                    Ingen forhåndsvisning
                  </div>
                )}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => onDelete(it.id)}
                    className="absolute top-1 right-1 size-6 rounded-full bg-bg/90 border border-border grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Slett ${it.filename}`}
                  >
                    <Trash2 className="size-3.5 text-red" />
                  </button>
                )}
              </div>
            ))}

            {pending.map((p) => (
              <div key={p.localId} className="relative">
                <div className="relative aspect-square rounded-md overflow-hidden border border-border bg-card">
                  <Image
                    src={p.previewUrl}
                    alt={p.file.name}
                    fill
                    unoptimized
                    className="object-cover opacity-60"
                  />
                  {p.status !== "error" && (
                    <div className="absolute inset-0 grid place-items-center bg-bg/40">
                      <RotateCw className="size-5 animate-spin text-text-1" />
                    </div>
                  )}
                </div>
                {p.status === "error" && (
                  <div className="mt-1 space-y-1">
                    <p className="text-[11px] text-red flex items-start gap-1">
                      <AlertCircle className="size-3 shrink-0 mt-0.5" />
                      {p.error}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => retry(p)}>
                        Prøv igjen
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => dismissError(p.localId)}>
                        Fjern
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
