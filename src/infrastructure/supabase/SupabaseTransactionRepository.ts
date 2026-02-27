import { Transaction } from "../../core/entities/Transaction";
import { ITransactionRepository } from "../../core/repositories/ITransactionRepository";
import { supabase } from "./client";
import { QueryOptions, PaginatedResult } from "../../core/types/pagination";

interface DbTransaction {
    id: string;
    transaction_type_id: string;
    from_account_id: string | null;
    to_account_id: string | null;
    amount: string;
    currency: string;
    concept: string | null;
    payment_method: string | null;
    payment_reference: string | null;
    status: string;
    commission_amount: string;
    net_amount: string | null;
    reference_number: string | null;
    metadata: any;
    external_cvu: string | null;
    external_cbu: string | null;
    external_alias: string | null;
    external_holder_name: string | null;
    created_at: string;
    completed_at: string | null;
}

export class SupabaseTransactionRepository implements ITransactionRepository {
    private mapToEntity(dbTx: DbTransaction, fromUserName?: string, toUserName?: string): Transaction {
        const isIncoming = dbTx.metadata?.is_incoming === true;

        return {
            id: dbTx.id,
            transactionTypeId: dbTx.transaction_type_id,
            fromAccountId: dbTx.from_account_id,
            toAccountId: dbTx.to_account_id,
            amount: dbTx.amount,
            currency: dbTx.currency,
            concept: dbTx.concept,
            paymentMethod: dbTx.payment_method,
            paymentReference: dbTx.payment_reference,
            status: dbTx.status as any,
            commissionAmount: dbTx.commission_amount,
            netAmount: dbTx.net_amount,
            referenceNumber: dbTx.reference_number,
            metadata: dbTx.metadata,
            createdAt: dbTx.created_at,
            completedAt: dbTx.completed_at,
            fromUserName,
            toUserName: toUserName || dbTx.payment_reference || dbTx.external_holder_name || dbTx.external_alias || undefined,
            isIncoming,
        };
    }

    async getAll(options?: QueryOptions): Promise<PaginatedResult<Transaction> | Transaction[]> {
        // Consultamos a la vista admin_transaction_list que ya tiene los joins hechos
        let query = supabase
            .from("admin_transaction_list")
            .select("*", { count: "exact" });

        if (options?.search) {
            const searchPattern = `%${options.search.replace(/[,()]/g, "")}%`;

            // Búsqueda en múltiples campos a la vez gracias a la vista
            const orFilters = [
                `reference_number.ilike.${searchPattern}`,
                `concept.ilike.${searchPattern}`,
                `payment_reference.ilike.${searchPattern}`,
                `from_user_first_name.ilike.${searchPattern}`,
                `from_user_last_name.ilike.${searchPattern}`,
                `from_user_email.ilike.${searchPattern}`,
                `from_user_phone.ilike.${searchPattern}`,
                `from_user_dni.ilike.${searchPattern}`,
                `to_user_first_name.ilike.${searchPattern}`,
                `to_user_last_name.ilike.${searchPattern}`,
                `to_user_email.ilike.${searchPattern}`,
                `to_user_phone.ilike.${searchPattern}`,
                `to_user_dni.ilike.${searchPattern}`
            ];

            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(options.search);
            if (isUuid) {
                orFilters.push(`id.eq.${options.search}`);
            }

            query = query.or(orFilters.join(','));
        }

        if (options?.status && options.status !== "all") {
            query = query.eq("status", options.status);
        }

        if (options?.filterDoubleEntry) {
            query = query.or("metadata->is_incoming.is.null,metadata->is_incoming.eq.false");
        }

        query = query.order("created_at", { ascending: false });

        if (options?.page !== undefined && options?.pageSize !== undefined) {
            const from = options.page * options.pageSize;
            const to = from + options.pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;
            if (error) throw new Error(`Error fetching transactions: ${error.message}`);

            const mappedData = (data || []).map((tx: any) => {
                const fromUserName = tx.from_user_first_name ? `${tx.from_user_first_name} ${tx.from_user_last_name}` : undefined;
                const toUserName = tx.to_user_first_name ? `${tx.to_user_first_name} ${tx.to_user_last_name}` : undefined;

                return this.mapToEntity(tx, fromUserName, toUserName);
            });

            return {
                data: mappedData,
                total: count || 0,
                page: options.page,
                pageSize: options.pageSize,
                totalPages: Math.ceil((count || 0) / options.pageSize),
            };
        }

        const { data, error } = await query;
        if (error) throw new Error(`Error fetching transactions: ${error.message}`);

        return (data || []).map((tx: any) => {
            const fromUserName = tx.from_user_first_name ? `${tx.from_user_first_name} ${tx.from_user_last_name}` : undefined;
            const toUserName = tx.to_user_first_name ? `${tx.to_user_first_name} ${tx.to_user_last_name}` : undefined;

            return this.mapToEntity(tx, fromUserName, toUserName);
        });
    }

    async getStats(): Promise<{
        totalUsers: number;
        activeUsers: number;
        totalVolume: string;
        pendingTransactions: number;
    }> {
        const { count: totalUsers, error: usersError } = await supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("role", "user");

        if (usersError) throw new Error(`Error counting users: ${usersError.message}`);

        const { count: activeUsers, error: activeError } = await supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("role", "user")
            .neq("verification_status", "suspended");

        if (activeError) throw new Error(`Error counting active users: ${activeError.message}`);

        const { data: volumeData, error: volumeError } = await supabase
            .from("transactions")
            .select("amount")
            .eq("status", "completed")
            .or("metadata->is_incoming.is.null,metadata->is_incoming.eq.false");

        if (volumeError) throw new Error(`Error calculating volume: ${volumeError.message}`);

        const totalVolume = (volumeData || [])
            .reduce((sum, tx) => sum + parseFloat(tx.amount || "0"), 0)
            .toFixed(2);

        const { count: pendingTransactions, error: pendingError } = await supabase
            .from("transactions")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending");

        if (pendingError) throw new Error(`Error counting pending transactions: ${pendingError.message}`);

        return {
            totalUsers: totalUsers || 0,
            activeUsers: activeUsers || 0,
            totalVolume,
            pendingTransactions: pendingTransactions || 0,
        };
    }
}
