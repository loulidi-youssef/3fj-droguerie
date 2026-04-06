import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAdminAd,
  deleteAdminAd,
  setAdminAdActiveState,
  updateAdminAd,
} from "@/lib/admin-ads";
import {
  createAdminAdPlan,
  deleteAdminAdPlan,
  getAdminAdPlans,
  setAdminAdPlanActiveState,
  updateAdminAdPlan,
} from "@/lib/admin-ad-plans";
import { parseAdminAdPlanInputFromFormData } from "@/lib/admin-ad-plans-validation";
import { parseAdminAdInputFromFormData } from "@/lib/admin-ads-validation";
import { clearAdminSession } from "@/lib/admin-auth";
import { requireAdminPublicitesSession } from "@/app/admin/publicites/lib/auth";

const redirectWithSuccess = (message: string): never => {
  redirect(`/admin/publicites?success=${encodeURIComponent(message)}`);
};

const redirectWithError = (message: string): never => {
  redirect(`/admin/publicites?error=${encodeURIComponent(message)}`);
};

const revalidateAdsPages = (): void => {
  revalidatePath("/");
  revalidatePath("/admin/publicites");
};

const ensureAdPlanMatchesPosition = async (
  planId: string | null,
  adPosition: "top" | "middle",
): Promise<string | null> => {
  if (!planId) {
    return null;
  }

  const plans = await getAdminAdPlans();
  const linkedPlan = plans.find((plan) => plan.id === planId);
  if (!linkedPlan) {
    return "Le plan publicitaire selectionne est introuvable.";
  }

  if (linkedPlan.position !== adPosition) {
    return "Le plan publicitaire doit avoir la meme position que la banniere.";
  }

  return null;
};

export const logoutAdminAction = async (): Promise<void> => {
  "use server";
  await clearAdminSession();
  redirect("/admin/login");
};

export const createAdAction = async (formData: FormData): Promise<void> => {
  "use server";

  await requireAdminPublicitesSession();

  const parsed = parseAdminAdInputFromFormData(formData);
  if (!parsed.ok) {
    return redirectWithError(parsed.error);
  }

  const planError = await ensureAdPlanMatchesPosition(parsed.value.planId, parsed.value.position);
  if (planError) {
    return redirectWithError(planError);
  }

  const created = await createAdminAd(parsed.value);
  if (!created.ok) {
    return redirectWithError(created.error ?? "Impossible d'ajouter la publicite.");
  }

  revalidateAdsPages();
  redirectWithSuccess("Publicite ajoutee avec succes.");
};

export const updateAdAction = async (formData: FormData): Promise<void> => {
  "use server";

  await requireAdminPublicitesSession();

  const adIdRaw = formData.get("adId");
  const adId = typeof adIdRaw === "string" ? adIdRaw.trim() : "";
  if (!adId) {
    return redirectWithError("Publicite introuvable.");
  }

  const parsed = parseAdminAdInputFromFormData(formData);
  if (!parsed.ok) {
    return redirectWithError(parsed.error);
  }

  const planError = await ensureAdPlanMatchesPosition(parsed.value.planId, parsed.value.position);
  if (planError) {
    return redirectWithError(planError);
  }

  const updated = await updateAdminAd(adId, parsed.value);
  if (!updated.ok) {
    return redirectWithError(updated.error ?? "Impossible de modifier la publicite.");
  }

  revalidateAdsPages();
  redirectWithSuccess("Publicite mise a jour.");
};

export const toggleAdActiveAction = async (formData: FormData): Promise<void> => {
  "use server";

  await requireAdminPublicitesSession();

  const adIdRaw = formData.get("adId");
  const nextActiveRaw = formData.get("nextActive");
  const adId = typeof adIdRaw === "string" ? adIdRaw.trim() : "";
  const nextActive = nextActiveRaw === "true";

  if (!adId) {
    return redirectWithError("Publicite introuvable.");
  }

  const updated = await setAdminAdActiveState(adId, nextActive);
  if (!updated.ok) {
    return redirectWithError(updated.error ?? "Impossible de changer le statut de la publicite.");
  }

  revalidateAdsPages();
  redirectWithSuccess(nextActive ? "Publicite activee." : "Publicite desactivee.");
};

export const deleteAdAction = async (formData: FormData): Promise<void> => {
  "use server";

  await requireAdminPublicitesSession();

  const adIdRaw = formData.get("adId");
  const adId = typeof adIdRaw === "string" ? adIdRaw.trim() : "";
  if (!adId) {
    return redirectWithError("Publicite introuvable.");
  }

  const deleted = await deleteAdminAd(adId);
  if (!deleted.ok) {
    return redirectWithError(deleted.error ?? "Suppression impossible.");
  }

  revalidateAdsPages();
  redirectWithSuccess("Publicite supprimee.");
};

export const createPlanAction = async (formData: FormData): Promise<void> => {
  "use server";

  await requireAdminPublicitesSession();

  const parsed = parseAdminAdPlanInputFromFormData(formData);
  if (!parsed.ok) {
    return redirectWithError(parsed.error);
  }

  const created = await createAdminAdPlan(parsed.value);
  if (!created.ok) {
    return redirectWithError(created.error ?? "Impossible d'ajouter le plan publicitaire.");
  }

  revalidatePath("/admin/publicites");
  redirectWithSuccess("Plan publicitaire ajoute.");
};

export const updatePlanAction = async (formData: FormData): Promise<void> => {
  "use server";

  await requireAdminPublicitesSession();

  const planIdRaw = formData.get("planId");
  const planId = typeof planIdRaw === "string" ? planIdRaw.trim() : "";
  if (!planId) {
    return redirectWithError("Plan introuvable.");
  }

  const parsed = parseAdminAdPlanInputFromFormData(formData);
  if (!parsed.ok) {
    return redirectWithError(parsed.error);
  }

  const updated = await updateAdminAdPlan(planId, parsed.value);
  if (!updated.ok) {
    return redirectWithError(updated.error ?? "Impossible de modifier le plan publicitaire.");
  }

  revalidatePath("/admin/publicites");
  redirectWithSuccess("Plan publicitaire mis a jour.");
};

export const togglePlanActiveAction = async (formData: FormData): Promise<void> => {
  "use server";

  await requireAdminPublicitesSession();

  const planIdRaw = formData.get("planId");
  const nextActiveRaw = formData.get("nextActive");
  const planId = typeof planIdRaw === "string" ? planIdRaw.trim() : "";
  const nextActive = nextActiveRaw === "true";

  if (!planId) {
    return redirectWithError("Plan introuvable.");
  }

  const updated = await setAdminAdPlanActiveState(planId, nextActive);
  if (!updated.ok) {
    return redirectWithError(updated.error ?? "Impossible de changer le statut du plan.");
  }

  revalidatePath("/admin/publicites");
  redirectWithSuccess(nextActive ? "Plan active." : "Plan desactive.");
};

export const deletePlanAction = async (formData: FormData): Promise<void> => {
  "use server";

  await requireAdminPublicitesSession();

  const planIdRaw = formData.get("planId");
  const planId = typeof planIdRaw === "string" ? planIdRaw.trim() : "";
  if (!planId) {
    return redirectWithError("Plan introuvable.");
  }

  const deleted = await deleteAdminAdPlan(planId);
  if (!deleted.ok) {
    return redirectWithError(deleted.error ?? "Suppression du plan impossible.");
  }

  revalidatePath("/admin/publicites");
  redirectWithSuccess("Plan publicitaire supprime.");
};

