
'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

interface DepotFilterProps {
    depots: string[];
    selectedDepots: string[];
    onSelectionChange: (selected: string[]) => void;
}

export const DepotFilter = ({ depots, selectedDepots, onSelectionChange }: DepotFilterProps) => {
    const handleCheckedChange = (depot: string, checked: boolean) => {
        let newSelection: string[];
        if (checked) {
            newSelection = [...selectedDepots, depot];
        } else {
            newSelection = selectedDepots.filter(d => d !== depot);
        }
        onSelectionChange(newSelection);
    };

    const handleSelectAll = () => onSelectionChange(depots);
    const handleDeselectAll = () => onSelectionChange([]);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtrer par dépôt ({selectedDepots.length === depots.length ? 'Tous' : selectedDepots.length})
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2">
                <div className="flex justify-between items-center mb-2 px-2">
                     <h4 className="font-medium text-sm">Dépôts</h4>
                     <div>
                        <Button variant="link" size="sm" onClick={handleSelectAll} className="p-1 h-auto">Tous</Button>
                        <Button variant="link" size="sm" onClick={handleDeselectAll} className="p-1 h-auto">Aucun</Button>
                     </div>
                </div>
                <ScrollArea className="h-64">
                    <div className="space-y-1 p-2">
                        {depots.map(depot => (
                            <div key={depot} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`depot-filter-${depot}`}
                                    checked={selectedDepots.includes(depot)}
                                    onCheckedChange={(checked) => handleCheckedChange(depot, !!checked)}
                                />
                                <label htmlFor={`depot-filter-${depot}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {depot}
                                </label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
};
