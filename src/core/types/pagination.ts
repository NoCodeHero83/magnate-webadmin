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
    filterDoubleEntry?: boolean;
}
