import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import {
  enforceRouteRateLimit,
  getAdminMutationRateLimitIdentifier,
} from "@/lib/api-rate-limit";
import { requireAdminApiSession } from "@/lib/admin-api-auth";
import { commitProductImportFromFile } from "@/lib/admin-product-import";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const rateLimit = await enforceRouteRateLimit({
    scope: "admin:products:import:commit",
    identifier: getAdminMutationRateLimitIdentifier(request),
    limit: 8,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Requete invalide. Envoyez un fichier CSV ou XLSX." },
      { status: 400 },
    );
  }

  const uploadedFile = formData.get("file");
  if (!(uploadedFile instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Fichier manquant. Ajoutez un fichier CSV ou XLSX." },
      { status: 400 },
    );
  }

  const fileBuffer = Buffer.from(await uploadedFile.arrayBuffer());
  const commitResult = await commitProductImportFromFile({
    fileName: uploadedFile.name,
    fileBuffer,
  });

  revalidatePath("/admin/products");
  revalidatePath("/produits");
  revalidatePath("/offres");
  revalidatePath("/");

  return NextResponse.json(commitResult);
}
