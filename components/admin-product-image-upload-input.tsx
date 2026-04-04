"use client";

import { useEffect, useMemo, useState } from "react";

type ProductImageUploadInputProps = {
  inputName: string;
  idPrefix: string;
};

type FilePreview = {
  name: string;
  url: string;
};

export const AdminProductImageUploadInput = ({
  inputName,
  idPrefix,
}: ProductImageUploadInputProps) => {
  const [previews, setPreviews] = useState<FilePreview[]>([]);
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
          Télécharger une image
        </span>
      </label>

      <input
        id={inputId}
        type="file"
        name={inputName}
        accept="image/*"
        multiple
        className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-blue file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
        onChange={(event) => {
          const nextFiles = Array.from(event.target.files ?? []);
          setPreviews((current) => {
            for (const preview of current) {
              URL.revokeObjectURL(preview.url);
            }

            return nextFiles
              .filter((file) => file.type.startsWith("image/"))
              .map((file) => ({
                name: file.name,
                url: URL.createObjectURL(file),
              }));
          });
        }}
      />

      <p className="mt-1 text-xs text-slate-500">
        Sélectionnez une ou plusieurs images depuis votre ordinateur.
      </p>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Aperçu</p>
        {previews.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">Aucune image sélectionnée.</p>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {previews.map((preview) => (
              <figure
                key={preview.url}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white p-2"
              >
                <img
                  src={preview.url}
                  alt={preview.name}
                  className="h-24 w-full rounded-md object-cover"
                />
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
