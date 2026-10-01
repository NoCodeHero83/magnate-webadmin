import { Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountType } from "@/core/entities/User";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  personal: "Persona Física",
  business: "Persona Jurídica",
};

export const AccountTypeBadge = ({ type }: { type: AccountType }) => {
  const isBusiness = type === "business";
  const Icon = isBusiness ? Building2 : User;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border whitespace-nowrap",
        isBusiness
          ? "bg-info/10 text-info border-info/20"
          : "bg-muted/30 text-muted-foreground border-border/50"
      )}
    >
      <Icon className="h-3 w-3" />
      {ACCOUNT_TYPE_LABELS[type]}
    </span>
  );
};
