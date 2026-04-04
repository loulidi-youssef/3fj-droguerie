import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const DEFAULT_PRODUCT_IMAGES_BUCKET = "product-images";

const normalizeFileName = (fileName: string): string => {
  const baseName = fileName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");

  return baseName || "image";
};

const toPublicUrl = (bucketName: string, objectPath: string): string => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    return objectPath;
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${objectPath}`;
};

type ProductImageUploadResult =
  | {
      ok: true;
      paths: string[];
      bucket: string;
    }
  | {
      ok: false;
      error: string;
    };

export const uploadAdminProductImages = async (
  productSlug: string,
  files: File[],
): Promise<ProductImageUploadResult> => {
  const activeFiles = files.filter((file) => file.size > 0);
  if (activeFiles.length === 0) {
    return { ok: true, paths: [], bucket: DEFAULT_PRODUCT_IMAGES_BUCKET };
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return {
      ok: false,
      error: "Supabase admin non configure. Impossible de telecharger les images.",
    };
  }

  const bucketName =
    process.env.SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() || DEFAULT_PRODUCT_IMAGES_BUCKET;

  const uploadedPaths: string[] = [];

  for (let index = 0; index < activeFiles.length; index += 1) {
    const file = activeFiles[index];

    if (!file.type.startsWith("image/")) {
      return {
        ok: false,
        error: "Seuls les fichiers image sont autorises.",
      };
    }

    const safeFileName = normalizeFileName(file.name);
    const objectPath = `products/${productSlug}/${Date.now()}-${index}-${safeFileName}`;

    const { error } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(objectPath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (error) {
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes("bucket not found")) {
        return {
          ok: false,
          error:
            "Bucket introuvable. Creez un bucket public 'product-images' (ou configurez SUPABASE_PRODUCT_IMAGES_BUCKET).",
        };
      }

      return {
        ok: false,
        error: "Echec du telechargement des images vers Supabase Storage.",
      };
    }

    uploadedPaths.push(toPublicUrl(bucketName, objectPath));
  }

  return { ok: true, paths: uploadedPaths, bucket: bucketName };
};
