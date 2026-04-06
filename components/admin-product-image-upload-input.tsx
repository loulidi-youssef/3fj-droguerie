"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type ProductImageUploadInputProps = {
  inputName: string;
  idPrefix: string;
};

type FilePreview = {
  name: string;
  url: string;
};

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const passthroughImageLoader = ({ src }: { src: string }): string => src;

export const AdminProductImageUploadInput = ({
  inputName,
  idPrefix,
}: ProductImageUploadInputProps) => {
  const [previews, setPreviews] = useState<FilePreview[]>([]);
  const [validationMessage, setValidationMessage] = useState<string>("");
  const inputId = useMemo(() => `${idPrefix}-image-files`, [idPrefix]);

  useEffect(() => {
    return () => {
      for (const preview of previews) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [previews]);

  return (
    <div className="md:col-span-2">
      <label className="block" htmlFor={inputId}>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Telecharger une image
        </span>
      </label>

      <input
        id={inputId}
        type="file"
        name={inputName}
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        multiple
        className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-blue file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
        onChange={(event) => {
          const nextFiles = Array.from(event.target.files ?? []);
          const errors: string[] = [];
          const validFiles = nextFiles.filter((file) => {
            const mimeType = file.type.trim().toLowerCase();
            if (!ACCEPTED_MIME_TYPES.has(mimeType)) {
              errors.push(`${file.name}: format non supporte (JPG, PNG, WebP uniquement).`);
              return false;
            }

            if (file.size > MAX_UPLOAD_SIZE_BYTES) {
              errors.push(`${file.name}: depasse 5MB.`);
              return false;
            }

            return true;
          });

          setValidationMessage(errors.join(" "));
          setPreviews((current) => {
            for (const preview of current) {
              URL.revokeObjectURL(preview.url);
            }

            return validFiles.map((file) => ({
              name: file.name,
              url: URL.createObjectURL(file),
            }));
          });
        }}
      />

      <p className="mt-1 text-xs text-slate-500">
        JPG, PNG, WebP. Taille max 5MB. Resolution minimale requise: 800x800.
      </p>
      {validationMessage ? (
        <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
          {validationMessage}
        </p>
      ) : null}

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Apercu</p>
        {previews.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">Aucune image selectionnee.</p>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {previews.map((preview) => (
              <figure
                key={preview.url}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white p-2"
              >
                <div className="relative h-24 w-full rounded-md bg-slate-50">
                  <Image
                    src={preview.url}
                    alt={preview.name}
                    fill
                    loader={passthroughImageLoader}
                    unoptimized
                    sizes="(max-width: 768px) 45vw, 180px"
                    className="rounded-md object-contain"
                  />
                </div>
                <figcaption className="mt-1 truncate text-[11px] text-slate-600">
                  {preview.name}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
