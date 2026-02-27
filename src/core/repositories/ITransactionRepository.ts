import { Transaction } from "../entities/Transaction";
import { QueryOptions, PaginatedResult } from "../types/pagination";

export interface ITransactionRepository {
    getAll(options?: QueryOptions): Promise<PaginatedResult<Transaction> | Transaction[]>;
    getStats(): Promise<{
        totalUsers: number;
        activeUsers: number;
        totalVolume: string;
        pendingTransactions: number;
    }>;
}

