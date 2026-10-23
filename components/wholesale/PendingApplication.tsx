"use client";

import { useRouter } from "next/navigation";
import WholesaleApplication from "@/components/wholesale/WholesaleApplication";
import type { Application } from "@/lib/wholesale-application-display";

/* The portal's view for a pending partner whose online application is not
   finished (23 Oct 2026): the application itself, and once it is sent the
   page re-renders on the server into "under review". */
export default function PendingApplication({
  locale,
  initial,
  suggestedName,
}: {
  locale: string;
  initial: Application;
  suggestedName: string | null;
}) {
  const router = useRouter();
  return (
    <WholesaleApplication
      locale={locale}
      initial={initial}
      suggestedName={suggestedName}
      onSent={() => {
        window.scrollTo({ top: 0 });
        router.refresh();
      }}
    />
  );
}
