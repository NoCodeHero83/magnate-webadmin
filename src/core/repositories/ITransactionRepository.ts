import { Transaction } from "../entities/Transaction";
import { QueryOptions, PaginatedResult } from "../types/pagination";

export interface ITransactionRepository {
    getAll(options?: QueryOptions): Promise<PaginatedResult<Transaction> | Transaction[]>;
    getStats(): Promise<{
        totalUsers: number;
        activeUsers: number;
        totalVolume: string;
        pendingTransactions: number;
        /** Saldo total en cuentas de clientes (lo que debe haber en la cuenta recaudadora) */
        custodyBalance: number;
        /** Operaciones completadas hoy (hora argentina), sin contar comisiones ni la pata de entrada */
        todayVolume: number;
        todayCount: number;
    }>;
}

