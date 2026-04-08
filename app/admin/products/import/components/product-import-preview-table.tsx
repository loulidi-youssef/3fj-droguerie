import {
  ImportPreviewRow,
  ProductImportColumn,
  productImportColumns,
} from "@/app/admin/products/import/components/product-import-config";

type ProductImportPreviewTableProps = {
  rows: ImportPreviewRow[];
};

const getPreviewCellText = (
  row: ImportPreviewRow,
  column: ProductImportColumn,
): string => {
  if (column === "name") {
    return row.normalized?.name ?? row.raw.name ?? "";
  }

  if (column === "slug") {
    return row.normalized?.slug ?? row.raw.slug ?? "";
  }

  if (column === "description") {
    return row.normalized?.description ?? row.raw.description ?? "";
  }

  if (column === "price") {
    if (typeof row.normalized?.price === "number") {
      return row.normalized.price.toFixed(2);
    }
    return row.raw.price ?? "";
  }

  if (column === "old_price") {
    if (typeof row.normalized?.oldPrice === "number") {
      return row.normalized.oldPrice.toFixed(2);
    }
    return row.raw.old_price ?? "";
  }

  if (column === "stock") {
    if (typeof row.normalized?.stock === "number") {
      return String(row.normalized.stock);
    }
    return row.raw.stock ?? "";
  }

  if (column === "category") {
    return row.normalized?.categorySlug ?? row.raw.category ?? "";
  }

  if (column === "image_url") {
    return row.raw.image_url ?? "";
  }

  if (row.normalized) {
    return row.normalized.isActive ? "true" : "false";
  }
  return row.raw.is_active ?? "";
};

export const ProductImportPreviewTable = ({ rows }: ProductImportPreviewTableProps) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-[1450px] text-left text-xs text-slate-700">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-2 py-2">Ligne</th>
            <th className="px-2 py-2">Statut</th>
            {productImportColumns.map((column) => (
              <th key={column} className="px-2 py-2">
                {column}
              </th>
            ))}
            <th className="px-2 py-2">Erreurs / Avertissements</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const invalidColumns = new Set(row.invalidColumns);

            return (
              <tr
                key={row.rowNumber}
                className={`border-t border-slate-100 align-top ${
                  row.isValid ? "bg-white" : "bg-rose-50/30"
                }`}
              >
                <td className="px-2 py-2 font-semibold text-slate-700">{row.rowNumber}</td>
                <td className="px-2 py-2">
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      row.isValid
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {row.isValid ? "Valide" : "Invalide"}
                  </span>
                </td>

                {productImportColumns.map((column) => (
                  <td
                    key={`${row.rowNumber}-${column}`}
                    className={`px-2 py-2 ${
                      invalidColumns.has(column)
                        ? "bg-rose-50 font-semibold text-rose-700"
                        : "text-slate-700"
                    }`}
                  >
                    {getPreviewCellText(row, column) || "-"}
                  </td>
                ))}

                <td className="px-2 py-2">
                  {row.errors.length > 0 ? (
                    <div className="space-y-1 text-rose-700">
                      {row.errors.map((error) => (
                        <p key={`${row.rowNumber}-error-${error}`}>{error}</p>
                      ))}
                    </div>
                  ) : null}
                  {row.warnings.length > 0 ? (
                    <div className="mt-1 space-y-1 text-amber-700">
                      {row.warnings.map((warning) => (
                        <p key={`${row.rowNumber}-warning-${warning}`}>{warning}</p>
                      ))}
                    </div>
                  ) : null}
                  {row.errors.length === 0 && row.warnings.length === 0 ? (
                    <span className="text-emerald-700">Aucune erreur.</span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
