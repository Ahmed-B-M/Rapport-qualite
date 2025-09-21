
"use client"

import * as React from "react"
import { format } from "date-fns"
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  availableDates: Date[];
  className?: string;
}

export function DateRangePicker({
  date,
  onDateChange,
  availableDates,
  className,
}: DateRangePickerProps) {
  
  const isDateDisabled = (day: Date) => {
    return !availableDates.some(
      availableDate => new Date(availableDate).setHours(0,0,0,0) === new Date(day).setHours(0,0,0,0)
    );
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[260px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "d LLL, y", { locale: fr })} -{" "}
                  {format(date.to, "d LLL, y", { locale: fr })}
                </>
              ) : (
                format(date.from, "d LLL, y", { locale: fr })
              )
            ) : (
              <span>Choisissez une période</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
            locale={fr}
            disabled={isDateDisabled}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

    