import { supabase } from "./client";
import {
  DistributorBalance,
  Movement,
  ResolveWithdrawalInput,
  Withdrawal,
  WithdrawalRequestInput,
  WithdrawalSettings,
  WithdrawalStatus,
} from "../../core/entities/Withdrawal";
import { Period } from "../../lib/format";

/** Mensajes legibles para los errores de las funciones de la BD (CODIGO: mensaje) */
function dbErrorMessage(message: string): string {
  const known = message.match(/^[A-Z_]+: (.+)$/);
  if (known) return known[1];
  if (message.includes("FORBIDDEN")) return "No tienes permisos para hacer esto.";
  return message;
}

const num = (value: unknown) => Number(value) || 0;
const numOrNull = (value: unknown) => (value === null || value === undefined ? null : Number(value));

/** Retiros de comisiones del distribuidor y movimientos de sus CVUs */
export class SupabaseWithdrawalRepository {
  async getSettings(): Promise<WithdrawalSettings> {
    const { data, error } = await supabase.rpc("withdrawal_settings");
    if (error) throw new Error(dbErrorMessage(error.message));
    const d = (data || {}) as any;
    return { minAmount: num(d.min_amount), usdtRate: num(d.usdt_rate) };
  }

  async saveSettings(settings: WithdrawalSettings): Promise<void> {
    const { error } = await supabase.rpc("admin_set_withdrawal_settings", {
      p_min_amount: settings.minAmount,
      p_usdt_rate: settings.usdtRate,
    });
    if (error) throw new Error(dbErrorMessage(error.message));
  }

  /** Para el distribuidor la BD ignora distributorId y usa el suyo */
  async getBalance(distributorId?: string | null): Promise<DistributorBalance> {
    const { data, error } = await supabase.rpc("distributor_balance", { p_distributor_id: distributorId ?? null });
    if (error) throw new Error(dbErrorMessage(error.message));
    const d = (data || {}) as any;
    return {
      balance: num(d.balance),
      reserved: num(d.reserved),
      available: num(d.available),
      paidTotal: num(d.paid_total),
    };
  }

  async list(status?: WithdrawalStatus | null, distributorId?: string | null): Promise<Withdrawal[]> {
    const { data, error } = await supabase.rpc("withdrawal_list", {
      p_status: status ?? null,
      p_distributor_id: distributorId ?? null,
    });
    if (error) throw new Error(dbErrorMessage(error.message));
    return (data || []).map((r: any) => ({
      id: r.id,
      distributorId: r.distributor_id,
      distributorName: r.distributor_name,
      amount: num(r.amount),
      currency: r.currency,
      destination: {
        destination: r.destination?.destination,
        holderName: r.destination?.holder_name || undefined,
        wallet: r.destination?.wallet,
        network: r.destination?.network,
      },
      usdtRateEstimate: numOrNull(r.usdt_rate_estimate),
      status: r.status,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at,
      rejectReason: r.reject_reason,
      paymentReference: r.payment_reference,
      usdtRate: numOrNull(r.usdt_rate),
      usdtAmount: numOrNull(r.usdt_amount),
      accountBalance: num(r.available_balance),
    }));
  }

  async request(input: WithdrawalRequestInput): Promise<string> {
    const destination =
      input.currency === "USDT"
        ? { wallet: input.destination.wallet?.trim(), network: input.destination.network }
        : { destination: input.destination.destination?.trim(), holder_name: input.destination.holderName?.trim() ?? "" };
    const { data, error } = await supabase.rpc("distributor_request_withdrawal", {
      p_amount: input.amount,
      p_currency: input.currency,
      p_destination: destination,
    });
    if (error) throw new Error(dbErrorMessage(error.message));
    return data as string;
  }

  async cancel(id: string): Promise<void> {
    const { error } = await supabase.rpc("distributor_cancel_withdrawal", { p_id: id });
    if (error) throw new Error(dbErrorMessage(error.message));
  }

  async resolve(input: ResolveWithdrawalInput): Promise<void> {
    const { error } = await supabase.rpc("admin_resolve_withdrawal", {
      p_id: input.id,
      p_action: input.action,
      p_reference: input.reference ?? null,
      p_reason: input.reason ?? null,
      p_usdt_rate: input.usdtRate ?? null,
      p_usdt_amount: input.usdtAmount ?? null,
    });
    if (error) throw new Error(dbErrorMessage(error.message));
  }

  async getMovements(period: Period, distributorId?: string | null, accountId?: string | null): Promise<Movement[]> {
    const { data, error } = await supabase.rpc("distributor_movements", {
      p_from: period.from.toISOString(),
      p_to: period.to.toISOString(),
      p_distributor_id: distributorId ?? null,
      p_account_id: accountId ?? null,
      p_limit: 2000,
    });
    if (error) throw new Error(dbErrorMessage(error.message));
    return (data || []).map((r: any) => ({
      id: r.id,
      createdAt: r.created_at,
      accountId: r.account_id,
      holderName: r.holder_name || "—",
      cvu: r.cvu,
      alias: r.alias,
      direction: r.direction,
      typeCode: r.type_code,
      typeName: r.type_name,
      amount: num(r.amount),
      commission: num(r.commission),
      status: r.status,
      referenceNumber: r.reference_number || "",
      distributorName: r.distributor_name,
    }));
  }
}
