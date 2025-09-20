
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  previousValue?: number;
  trendDirection?: 'up' | 'down'; // up means higher is better, down means lower is better
}

const TrendIndicator = ({ value, previousValue, direction }: { value: number, previousValue: number, direction: 'up' | 'down' }) => {
  if (value > previousValue) {
    return direction === 'up'
      ? <span className="flex items-center text-sm text-green-500"><ArrowUp className="h-4 w-4 mr-1" /> {(((value - previousValue) / previousValue) * 100).toFixed(1)}%</span>
      : <span className="flex items-center text-sm text-red-500"><ArrowUp className="h-4 w-4 mr-1" /> {(((value - previousValue) / previousValue) * 100).toFixed(1)}%</span>;
  }
  if (value < previousValue) {
    return direction === 'up'
      ? <span className="flex items-center text-sm text-red-500"><ArrowDown className="h-4 w-4 mr-1" /> {(((previousValue - value) / previousValue) * 100).toFixed(1)}%</span>
      : <span className="flex items-center text-sm text-green-500"><ArrowDown className="h-4 w-4 mr-1" /> {(((previousValue - value) / previousValue) * 100).toFixed(1)}%</span>;
  }
  return <span className="flex items-center text-sm text-gray-500"><ArrowRight className="h-4 w-4 mr-1" /> 0.0%</span>;
};


export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, description, previousValue, trendDirection }) => {
  const isNumericValue = typeof value === 'number';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">{description}</p>
          {isNumericValue && previousValue !== undefined && trendDirection && (
            <TrendIndicator value={value} previousValue={previousValue} direction={trendDirection} />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
