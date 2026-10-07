import { supabase } from "./client";
import { FeeOperation, FeeRule, FeeRuleInput } from "../../core/entities/Distributor";
import { getUserDisplayName } from "../../core/entities/User";

const OPERATION_ORDER: FeeOperation[] = ["payin", "payout", "internal_out", "internal_in"];

function ruleErrorMessage(message: string): string {
  if (message.includes("fee_rules_account_uq")) return "Ese CVU ya tiene una regla para esa operación. Edítala en lugar de crear otra.";
  if (message.includes("fee_rules_incoming_deduct")) return "En las operaciones que entran, la comisión siempre se descuenta de lo recibido.";
  if (message.includes("max_amount")) return "El máximo no puede ser menor que el mínimo.";
  const known = message.match(/^[A-Z_]+: (.+)$/);
  return known ? known[1] : message;
}

/** Reglas de comisión (tabla fee_rules; solo admins pueden leerla y escribirla) */
export class SupabaseFeeRuleRepository {
  async list(): Promise<FeeRule[]> {
    const { data, error } = await supabase
      .from("fee_rules")
      .select("*, accounts(alias, cvu)")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(ruleErrorMessage(error.message));

    const rows = (data || []) as any[];

    // Titular de cada CVU con regla propia
    const accountIds = [...new Set(rows.filter((r) => r.account_id).map((r) => r.account_id))];
    const holders = new Map<string, string>();
    if (accountIds.length > 0) {
      const { data: users } = await supabase
        .from("admin_user_list")
        .select("account_id, first_name, last_name, account_type, company_legal_name, company_trade_name, company_cuit")
        .in("account_id", accountIds);
      for (const u of (users || []) as any[]) {
        holders.set(u.account_id, getUserDisplayName({
          accountType: u.account_type,
          firstName: u.first_name,
          lastName: u.last_name,
          businessProfile: u.company_cuit
            ? { cuit: u.company_cuit, legalName: u.company_legal_name || "", tradeName: u.company_trade_name || undefined, entityType: "", incorporationDate: "" }
            : undefined,
        }));
      }
    }

    return rows
      .map((r) => ({
        id: r.id,
        accountId: r.account_id,
        accountAlias: r.accounts?.alias,
        accountCvu: r.accounts?.cvu,
        holderName: r.account_id ? holders.get(r.account_id) : undefined,
        operation: r.operation as FeeOperation,
        ratePercent: Number(r.rate_percent) || 0,
        fixedAmount: Number(r.fixed_amount) || 0,
        minAmount: Number(r.min_amount) || 0,
        maxAmount: r.max_amount === null ? null : Number(r.max_amount),
        chargeMode: r.charge_mode,
        magnateSharePercent: Number(r.magnate_share_percent),
        isActive: r.is_active,
        updatedAt: r.updated_at,
      }))
      .sort((a, b) =>
        a.accountId === b.accountId
          ? OPERATION_ORDER.indexOf(a.operation) - OPERATION_ORDER.indexOf(b.operation)
          : 0
      );
  }

  private toRow(input: FeeRuleInput) {
    return {
      account_id: input.accountId,
      operation: input.operation,
      rate_percent: input.ratePercent,
      fixed_amount: input.fixedAmount,
      min_amount: input.minAmount,
      max_amount: input.maxAmount,
      charge_mode: input.chargeMode,
      magnate_share_percent: input.magnateSharePercent,
      is_active: input.isActive,
    };
  }

  async create(input: FeeRuleInput): Promise<void> {
    const { error } = await supabase.from("fee_rules").insert(this.toRow(input));
    if (error) throw new Error(ruleErrorMessage(error.message));
  }

  async update(id: string, input: FeeRuleInput): Promise<void> {
    const { account_id: _accountId, operation: _operation, ...changes } = this.toRow(input);
    const { error } = await supabase.from("fee_rules").update(changes).eq("id", id);
    if (error) throw new Error(ruleErrorMessage(error.message));
  }

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("fee_rules").delete().eq("id", id);
    if (error) throw new Error(ruleErrorMessage(error.message));
  }
}
