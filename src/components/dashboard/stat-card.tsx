
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
  const numericValue = typeof value === 'string' ? parseFloat(value.replace('%','')) : value;
  
  if (isNaN(numericValue) || isNaN(previousValue) || previousValue === 0) {
      return <span className="flex items-center text-sm text-gray-500"><ArrowRight className="h-4 w-4 mr-1" /> --</span>;
  }

  if (numericValue > previousValue) {
    const percentageChange = (((numericValue - previousValue) / previousValue) * 100).toFixed(1);
    const color = direction === 'up' ? 'text-green-500' : 'text-red-500';
    return <span className={`flex items-center text-sm ${color}`}><ArrowUp className="h-4 w-4 mr-1" /> {percentageChange}%</span>;
  }
  if (numericValue < previousValue) {
    const percentageChange = (((previousValue - numericValue) / previousValue) * 100).toFixed(1);
    const color = direction === 'up' ? 'text-red-500' : 'text-green-500';
    return <span className={`flex items-center text-sm ${color}`}><ArrowDown className="h-4 w-4 mr-1" /> {percentageChange}%</span>;
  }
  return <span className="flex items-center text-sm text-gray-500"><ArrowRight className="h-4 w-4 mr-1" /> 0.0%</span>;
};


export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, description, previousValue, trendDirection }) => {
  
  const numericValueForTrend = typeof value === 'string' ? parseFloat(value.replace('%','')) : value;

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
          {previousValue !== undefined && trendDirection && (
            <TrendIndicator value={numericValueForTrend} previousValue={previousValue} direction={trendDirection} />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
