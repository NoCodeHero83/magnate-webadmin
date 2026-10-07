import { CalendarRange } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/presentation/components/ui/select";
import { PeriodKey, PERIOD_LABELS } from "@/lib/format";

interface PeriodSelectProps {
  value: PeriodKey;
  onChange: (value: PeriodKey) => void;
  className?: string;
}

export function PeriodSelect({ value, onChange, className }: PeriodSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PeriodKey)}>
      <SelectTrigger className={className ?? "w-full sm:w-48 bg-card border-border/50"}>
        <CalendarRange className="h-4 w-4 mr-2" />
        <SelectValue placeholder="Período" />
      </SelectTrigger>
      <SelectContent className="glass-card">
        {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((key) => (
          <SelectItem key={key} value={key}>
            {PERIOD_LABELS[key]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
