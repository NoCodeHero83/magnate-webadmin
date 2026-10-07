export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface QueryOptions {
    search?: string;
    page?: number;
    pageSize?: number;
    status?: string;
    accountType?: string;
    /** id del distribuidor, "none" (sin asignar) o "all" */
    distributorId?: string;
    filterDoubleEntry?: boolean;
}
