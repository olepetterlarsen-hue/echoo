"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { deleteCustomer } from "../actions";

export function CustomerActions({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (
      !confirm(
        tr("cust_delete_confirm", locale).replace("{name}", customerName),
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteCustomer({ id: customerId });
      if (!res.error) router.push("/kunder");
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={onDelete} disabled={pending}>
      <Trash2 className="size-4" />
      {tr("delete", locale)}
    </Button>
  );
}
