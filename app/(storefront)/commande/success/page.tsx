import { Suspense } from "react";
import SuccessContent from "./success-content";
import { existsSync } from "node:fs";
import { join } from "node:path";

const LOGO_CANDIDATES = [
  "/logo.svg",
  "/logo.png",
  "/images/logo.svg",
  "/images/logo.png",
  "/images/branding/logo.svg",
  "/images/branding/logo.png",
];

const getExistingLogoPath = (): string | null => {
  const publicRoot = join(process.cwd(), "public");

  for (const candidate of LOGO_CANDIDATES) {
    const normalizedCandidate = candidate.replace(/^\/+/, "");
    const absolutePath = join(publicRoot, normalizedCandidate);
    if (existsSync(absolutePath)) {
      return candidate;
    }
  }

  return null;
};

export default function Page() {
  const companyLogoPath = getExistingLogoPath();

  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <SuccessContent companyLogoPath={companyLogoPath} />
    </Suspense>
  );
}
