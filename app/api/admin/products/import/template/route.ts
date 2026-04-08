import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-api-auth";
import {
  getProductImportCsvTemplate,
  getProductImportExcelTemplateBuffer,
} from "@/lib/admin-product-import";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const getRequestedFormat = (value: string | null): "csv" | "xlsx" => {
  if ((value ?? "").trim().toLowerCase() === "xlsx") {
    return "xlsx";
  }

  return "csv";
};

export async function GET(request: NextRequest) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const format = getRequestedFormat(request.nextUrl.searchParams.get("format"));

  if (format === "xlsx") {
    const workbookBuffer = await getProductImportExcelTemplateBuffer();
    return new NextResponse(workbookBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          "attachment; filename=\"produits-import-template.xlsx\"",
        "Cache-Control": "no-store",
      },
    });
  }

  return new NextResponse(getProductImportCsvTemplate(), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"produits-import-template.csv\"",
      "Cache-Control": "no-store",
    },
  });
}

