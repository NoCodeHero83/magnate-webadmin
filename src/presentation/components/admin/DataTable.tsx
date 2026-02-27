import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/presentation/components/ui/table";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends object>({ 
  columns, 
  data,
  onRowClick 
}: DataTableProps<T>) {
  return (
    <div className="premium-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            {columns.map((column, index) => (
              <TableHead 
                key={index} 
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                  column.className
                )}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, rowIndex) => (
            <TableRow 
              key={rowIndex} 
              className={cn(
                "border-border/50 transition-colors",
                onRowClick && "cursor-pointer hover:bg-muted/50"
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column, colIndex) => (
                <TableCell key={colIndex} className={column.className}>
                  {column.render 
                    ? column.render(item) 
                    : String(item[column.key as keyof T] ?? "")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
