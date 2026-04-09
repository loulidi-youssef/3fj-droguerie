import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";
import {
  PRODUCT_IMAGE_VARIANT_SUFFIX,
  PRODUCT_IMAGES_DEFAULT_BUCKET,
  buildProductStorageImagePath,
} from "@/lib/product-image-variants";

const MAX_UPLOAD_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MIN_IMAGE_WIDTH = 800;
const MIN_IMAGE_HEIGHT = 800;
const MAX_IMAGE_DIMENSION = 1600;
const MAX_INPUT_PIXELS = 50_000_000;
const SHARPEN_SIGMA = 0.25;

const ACCEPTED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

type UploadedProductImageVariant = "thumbnail" | "medium" | "large";

type UploadedVariantConfig = {
  width: number;
  height: number;
  fit: "contain" | "inside";
  quality: number;
};

const uploadedVariantConfigs: Record<UploadedProductImageVariant, UploadedVariantConfig> = {
  thumbnail: {
    width: 300,
    height: 300,
    fit: "contain",
    quality: 76,
  },
  medium: {
    width: 800,
    height: 800,
    fit: "inside",
    quality: 80,
  },
  large: {
    width: 1400,
    height: 1400,
    fit: "inside",
    quality: 82,
  },
};

const normalizeFileName = (fileName: string): string => {
  const withoutExtension = fileName.replace(/\.[a-z0-9]{2,6}$/i, "");
  const baseName = withoutExtension
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");

  return baseName || "image";
};

const getErrorForInvalidImageType = (): string => {
  return "Format image non supporte. Utilisez uniquement JPG, PNG ou WebP.";
};

const isAcceptedMimeType = (mimeType: string): boolean => {
  return ACCEPTED_IMAGE_MIME_TYPES.has(mimeType.trim().toLowerCase());
};

const toFileBuffer = async (file: File): Promise<Buffer> => {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const normalizeSourceBuffer = async (buffer: Buffer): Promise<Buffer> => {
  return sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize({
      width: MAX_IMAGE_DIMENSION,
      height: MAX_IMAGE_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer();
};

const buildVariantBuffer = async (
  sourceBuffer: Buffer,
  variant: UploadedProductImageVariant,
): Promise<Buffer> => {
  const config = uploadedVariantConfigs[variant];

  return sharp(sourceBuffer)
    .resize({
      width: config.width,
      height: config.height,
      fit: config.fit,
      withoutEnlargement: true,
      background: config.fit === "contain" ? "#ffffff" : undefined,
    })
    .sharpen(SHARPEN_SIGMA)
    .webp({
      quality: config.quality,
      effort: 4,
      smartSubsample: true,
    })
    .toBuffer();
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
  options?: { categorySlug?: string },
): Promise<ProductImageUploadResult> => {
  const activeFiles = files.filter((file) => file.size > 0);
  if (activeFiles.length === 0) {
    return { ok: true, paths: [], bucket: PRODUCT_IMAGES_DEFAULT_BUCKET };
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return {
      ok: false,
      error: "Supabase admin non configure. Impossible de telecharger les images.",
    };
  }

  const bucketName =
    process.env.SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() ||
    PRODUCT_IMAGES_DEFAULT_BUCKET;

  const uploadedPaths: string[] = [];

  for (let index = 0; index < activeFiles.length; index += 1) {
    const file = activeFiles[index];

    const contentType = file.type.trim().toLowerCase();
    if (!isAcceptedMimeType(contentType)) {
      return {
        ok: false,
        error: getErrorForInvalidImageType(),
      };
    }

    if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
      return {
        ok: false,
        error: "Image trop lourde. Taille maximale: 5MB.",
      };
    }

    let sourceBuffer: Buffer;
    try {
      sourceBuffer = await toFileBuffer(file);
    } catch {
      return {
        ok: false,
        error: "Impossible de lire le fichier image. Merci de reessayer.",
      };
    }

    let metadata: sharp.Metadata;
    try {
      metadata = await sharp(sourceBuffer, { limitInputPixels: MAX_INPUT_PIXELS })
        .rotate()
        .metadata();
    } catch {
      return {
        ok: false,
        error: "Fichier image invalide ou corrompu. Utilisez JPG, PNG ou WebP.",
      };
    }

    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (width < MIN_IMAGE_WIDTH || height < MIN_IMAGE_HEIGHT) {
      return {
        ok: false,
        error: `Image trop petite (${width}x${height}). Minimum requis: ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT}px.`,
      };
    }

    if (width * height > MAX_INPUT_PIXELS) {
      return {
        ok: false,
        error: "Image trop grande en resolution. Utilisez un fichier moins volumineux.",
      };
    }

    let normalizedSourceBuffer: Buffer;
    try {
      normalizedSourceBuffer = await normalizeSourceBuffer(sourceBuffer);
    } catch {
      return {
        ok: false,
        error: "Impossible de preparer l'image pour le telechargement.",
      };
    }

    const variants: Record<UploadedProductImageVariant, Buffer> = {
      thumbnail: Buffer.alloc(0),
      medium: Buffer.alloc(0),
      large: Buffer.alloc(0),
    };

    try {
      variants.thumbnail = await buildVariantBuffer(normalizedSourceBuffer, "thumbnail");
      variants.medium = await buildVariantBuffer(normalizedSourceBuffer, "medium");
      variants.large = await buildVariantBuffer(normalizedSourceBuffer, "large");
    } catch {
      return {
        ok: false,
        error: "Echec de l'optimisation de l'image. Merci d'utiliser une image valide.",
      };
    }

    const safeFileName = normalizeFileName(file.name);
    const objectBasePath = buildProductStorageImagePath({
      categorySlug: options?.categorySlug ?? "catalogue",
      productSlug,
      fileName: `${productSlug}-${Date.now()}-${index}-${safeFileName}`,
    }).replace(/\.[a-z0-9]{2,6}$/i, "");

    const variantPaths: Record<UploadedProductImageVariant, string> = {
      thumbnail: `${objectBasePath}-${PRODUCT_IMAGE_VARIANT_SUFFIX.thumbnail}.webp`,
      medium: `${objectBasePath}-${PRODUCT_IMAGE_VARIANT_SUFFIX.medium}.webp`,
      large: `${objectBasePath}-${PRODUCT_IMAGE_VARIANT_SUFFIX.large}.webp`,
    };

    for (const variant of Object.keys(variantPaths) as UploadedProductImageVariant[]) {
      const { error } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(variantPaths[variant], variants[variant], {
          contentType: "image/webp",
          cacheControl: "31536000",
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
          error: "Echec du telechargement des images optimisee vers Supabase Storage.",
        };
      }
    }

    uploadedPaths.push(variantPaths.large);
  }

  return { ok: true, paths: uploadedPaths, bucket: bucketName };
};
