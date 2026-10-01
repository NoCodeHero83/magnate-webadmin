import { User, VerificationStatus, AccountReview } from "../entities/User";
import { QueryOptions, PaginatedResult } from "../types/pagination";

export interface UserStats {
    total: number;
    active: number;
    suspended: number;
    pending: number;
    business: number;
}

export interface IUserRepository {
    getAll(options?: QueryOptions): Promise<PaginatedResult<User> | User[]>;
    getById(id: string): Promise<User | null>;
    create(user: User): Promise<User>;
    update(user: User): Promise<User>;
    delete(id: string): Promise<void>;
    updateStatus(id: string, status: VerificationStatus): Promise<void>;
    reviewUser(id: string, decision: "approve" | "reject", reason?: string): Promise<void>;
    getReviews(userId: string): Promise<AccountReview[]>;
    getStats(): Promise<UserStats>;
}
