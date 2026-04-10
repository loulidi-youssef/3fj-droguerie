import { redirect } from "next/navigation";

type SuccesAliasPageProps = {
  searchParams?: {
    orderId?: string | string[];
  };
};

const toSingleParam = (value: string | string[] | undefined): string | null => {
  if (Array.isArray(value)) {
    const first = value[0]?.trim();
    return first ? first : null;
  }

  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export default function SuccesAliasPage({ searchParams }: SuccesAliasPageProps) {
  const orderId = toSingleParam(searchParams?.orderId);
  if (orderId) {
    redirect(`/commande/success?orderId=${encodeURIComponent(orderId)}`);
  }

  redirect("/commande/success");
}
