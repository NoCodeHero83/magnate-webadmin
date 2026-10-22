import { supabase } from "./client";
import {
  AccountVolume,
  Adjustment,
  CommissionEntry,
  CommissionSettings,
  CommissionSummary,
  Distributor,
  DistributorCommissionInput,
  DistributorProfile,
  DistributorStatus,
  FeeOperation,
  NetworkEarning,
  NetworkMember,
  PeriodSummary,
} from "../../core/entities/Distributor";
import { Period } from "../../lib/format";

export interface DistributorInput {
  id?: string;
  name: string;
  cuit?: string;
  contactEmail?: string;
  status: DistributorStatus;
}

export interface DistributorAccessInput {
  distributorId: string;
  email: string;
  firstName: string;
  lastName: string;
}

/** Mensajes legibles para los errores de las funciones de la BD (CODIGO: mensaje) */
function dbErrorMessage(message: string): string {
  const known = message.match(/^[A-Z_]+: (.+)$/);
  if (known) return known[1];
  if (message.includes("FORBIDDEN")) return "No tienes permisos para hacer esto.";
  return message;
}

/** Errores de la edge function: el cuerpo trae { error } */
async function functionErrorMessage(error: any): Promise<string> {
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return body.error;
  } catch {
    // sin cuerpo JSON
  }
  return error?.message || "No se pudo completar la operación";
}

const num = (value: unknown) => Number(value) || 0;

export class SupabaseDistributorRepository {
  // ── Administración ─────────────────────────────────────────────────────────

  async list(): Promise<Distributor[]> {
    const { data, error } = await supabase.rpc("admin_distributor_list");
    if (error) throw new Error(dbErrorMessage(error.message));
    return (data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      cuit: d.cuit || undefined,
      contactEmail: d.contact_email || undefined,
      status: d.status,
      createdAt: d.created_at,
      userId: d.user_id || undefined,
      loginEmail: d.login_email || undefined,
      accountsCount: num(d.accounts_count),
      commissionBalance: num(d.commission_balance),
      availableBalance: num(d.available_balance),
      parentId: d.parent_id ?? null,
      parentName: d.parent_name || undefined,
      sharePercent: d.share_percent === null || d.share_percent === undefined ? null : Number(d.share_percent),
      networkEnabled: d.network_enabled ?? null,
      settlementPeriod: d.settlement_period ?? null,
      networkCount: num(d.network_count),
    }));
  }

  /** Quién lo trajo, % propio, si cobra de su red y su liquidación (null = la general) */
  async saveCommission(input: DistributorCommissionInput): Promise<void> {
    const { error } = await supabase.rpc("admin_set_distributor_commission", {
      p_id: input.id,
      p_parent_id: input.parentId,
      p_share_percent: input.sharePercent,
      p_network_enabled: input.networkEnabled,
      p_settlement_period: input.settlementPeriod,
    });
    if (error) throw new Error(dbErrorMessage(error.message));
  }

  /** Ajuste manual del saldo: positivo a favor, negativo en contra */
  async adjust(distributorId: string, amount: number, reason: string): Promise<void> {
    const { error } = await supabase.rpc("admin_adjust_distributor", {
      p_distributor_id: distributorId,
      p_amount: amount,
      p_reason: reason,
    });
    if (error) throw new Error(dbErrorMessage(error.message));
  }

  async getSettings(): Promise<CommissionSettings> {
    const { data, error } = await supabase.rpc("commission_settings");
    if (error) throw new Error(dbErrorMessage(error.message));
    const d = (data || {}) as any;
    return {
      networkEnabled: !!d.network_enabled,
      networkLevelPercents: Array.isArray(d.network_level_percents) ? d.network_level_percents.map(num) : [],
      settlementPeriod: d.settlement_period ?? "instant",
      inactiveDistributorShare: d.inactive_distributor_share ?? "magnate",
      volumeAmountBasis: d.volume_amount_basis === "sent" ? "sent" : "received",
    };
  }

  async saveSettings(settings: CommissionSettings): Promise<void> {
    const { error } = await supabase.rpc("admin_set_commission_settings", {
      p_network_enabled: settings.networkEnabled,
      p_network_level_percents: settings.networkLevelPercents,
      p_settlement_period: settings.settlementPeriod,
      p_inactive_distributor_share: settings.inactiveDistributorShare,
      p_volume_amount_basis: settings.volumeAmountBasis,
    });
    if (error) throw new Error(dbErrorMessage(error.message));
  }

  async save(input: DistributorInput): Promise<string> {
    const { data, error } = await supabase.rpc("admin_upsert_distributor", {
      p_id: input.id ?? null,
      p_name: input.name,
      p_cuit: input.cuit ?? "",
      p_contact_email: input.contactEmail ?? "",
      p_status: input.status,
    });
    if (error) throw new Error(dbErrorMessage(error.message));
    return data as string;
  }

  /** Asigna los CVUs al distribuidor (o los libera con distributorId = null) */
  async assignAccounts(accountIds: string[], distributorId: string | null): Promise<number> {
    const { data, error } = await supabase.rpc("admin_assign_accounts", {
      p_account_ids: accountIds,
      p_distributor_id: distributorId,
    });
    if (error) throw new Error(dbErrorMessage(error.message));
    return num(data);
  }

  /** Crea el usuario con el que el distribuidor entra al panel. Devuelve la contraseña temporal. */
  async createAccess(input: DistributorAccessInput): Promise<string> {
    const { data, error } = await supabase.functions.invoke("admin-create-distributor", {
      body: {
        action: "create",
        distributor_id: input.distributorId,
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
      },
    });
    if (error) throw new Error(await functionErrorMessage(error));
    return data.password as string;
  }

  async resetPassword(distributorId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke("admin-create-distributor", {
      body: { action: "reset_password", distributor_id: distributorId },
    });
    if (error) throw new Error(await functionErrorMessage(error));
    return data.password as string;
  }

  async getCommissionSummary(period: Period): Promise<CommissionSummary> {
    const { data, error } = await supabase.rpc("admin_commission_summary", {
      p_from: period.from.toISOString(),
      p_to: period.to.toISOString(),
    });
    if (error) throw new Error(dbErrorMessage(error.message));
    const d = (data || {}) as any;
    return {
      feeTotal: num(d.fee_total),
      magnateTotal: num(d.magnate_total),
      distributorTotal: num(d.distributor_total),
      networkTotal: num(d.network_total),
      count: num(d.count),
      magnateBalance: num(d.magnate_balance),
    };
  }

  // ── Reportes (admin y distribuidor) ────────────────────────────────────────
  // Para el distribuidor la BD ignora distributorId y usa el suyo.

  async getAccountVolume(period: Period, distributorId?: string | null): Promise<AccountVolume[]> {
    const { data, error } = await supabase.rpc("distributor_account_volume", {
      p_from: period.from.toISOString(),
      p_to: period.to.toISOString(),
      p_distributor_id: distributorId ?? null,
    });
    if (error) throw new Error(dbErrorMessage(error.message));
    return (data || []).map((r: any) => ({
      accountId: r.account_id,
      distributorId: r.distributor_id,
      distributorName: r.distributor_name,
      holderName: r.holder_name || "—",
      cvu: r.cvu,
      alias: r.alias,
      accountStatus: r.account_status,
      accountType: r.account_type || "personal",
      volumeIn: num(r.volume_in),
      volumeOut: num(r.volume_out),
      operations: num(r.operations),
      feeTotal: num(r.fee_total),
      distributorAmount: num(r.distributor_amount),
    }));
  }

  async getCommissionDetail(period: Period, distributorId?: string | null, limit = 1000): Promise<CommissionEntry[]> {
    const { data, error } = await supabase.rpc("distributor_commission_detail", {
      p_from: period.from.toISOString(),
      p_to: period.to.toISOString(),
      p_distributor_id: distributorId ?? null,
      p_limit: limit,
    });
    if (error) throw new Error(dbErrorMessage(error.message));
    return (data || []).map((r: any) => ({
      id: r.id,
      createdAt: r.created_at,
      operation: r.operation as FeeOperation,
      holderName: r.holder_name || "—",
      cvu: r.cvu,
      alias: r.alias,
      baseAmount: num(r.base_amount),
      ratePercent: num(r.rate_percent),
      feeTotal: num(r.fee_total),
      magnateAmount: num(r.magnate_amount),
      distributorAmount: num(r.distributor_amount),
      distributorName: r.distributor_name || undefined,
    }));
  }

  /** Distribuidores que trajo (todos los niveles) */
  async getNetwork(distributorId?: string | null): Promise<NetworkMember[]> {
    const { data, error } = await supabase.rpc("distributor_network", { p_distributor_id: distributorId ?? null });
    if (error) throw new Error(dbErrorMessage(error.message));
    return (data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      level: num(r.level),
      parentName: r.parent_name || undefined,
      accountsCount: num(r.accounts_count),
    }));
  }

  async getNetworkDetail(period: Period, distributorId?: string | null): Promise<NetworkEarning[]> {
    const { data, error } = await supabase.rpc("distributor_network_detail", {
      p_from: period.from.toISOString(),
      p_to: period.to.toISOString(),
      p_distributor_id: distributorId ?? null,
      p_limit: 2000,
    });
    if (error) throw new Error(dbErrorMessage(error.message));
    return (data || []).map((r: any) => ({
      id: r.id,
      createdAt: r.created_at,
      distributorName: r.distributor_name || "—",
      sourceName: r.source_name || "—",
      level: num(r.level),
      operation: r.operation as FeeOperation,
      feeTotal: num(r.fee_total),
      ratePercent: num(r.rate_percent),
      amount: num(r.amount),
    }));
  }

  async getPeriodSummary(distributorId?: string | null, count = 6): Promise<PeriodSummary[]> {
    const { data, error } = await supabase.rpc("distributor_period_summary", {
      p_distributor_id: distributorId ?? null,
      p_count: count,
    });
    if (error) throw new Error(dbErrorMessage(error.message));
    return (data || []).map((r: any) => ({
      periodStart: r.period_start,
      periodEnd: r.period_end,
      isOpen: !!r.is_open,
      commissions: num(r.commissions),
      network: num(r.network),
      adjustments: num(r.adjustments),
      withdrawals: num(r.withdrawals),
    }));
  }

  async getAdjustments(distributorId?: string | null): Promise<Adjustment[]> {
    const { data, error } = await supabase.rpc("distributor_adjustment_list", { p_distributor_id: distributorId ?? null });
    if (error) throw new Error(dbErrorMessage(error.message));
    return (data || []).map((r: any) => ({
      id: r.id,
      createdAt: r.created_at,
      distributorId: r.distributor_id,
      distributorName: r.distributor_name,
      amount: num(r.amount),
      reason: r.reason,
    }));
  }

  /** Datos del distribuidor que inició sesión */
  async getMe(): Promise<DistributorProfile | null> {
    const { data, error } = await supabase.rpc("distributor_me");
    if (error) throw new Error(dbErrorMessage(error.message));
    if (!data) return null;
    const d = data as any;
    return {
      id: d.id,
      name: d.name,
      cuit: d.cuit || undefined,
      status: d.status,
      accountsCount: num(d.accounts_count),
      commissionBalance: num(d.commission_balance),
      parentName: d.parent_name || undefined,
      networkCount: num(d.network_count),
      settlementPeriod: d.settlement_period ?? "instant",
    };
  }
}
