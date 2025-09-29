
"use client";

import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface KpiCardProps {
    title: string;
    value: number | undefined;
    target: number;
    isRate?: boolean;
    higherIsBetter?: boolean;
}

export const KpiCard = ({ title, value, target, isRate = true, higherIsBetter = true }: KpiCardProps) => {
    if (value === undefined) {
        return (
            <div className="flex flex-col items-center justify-center p-2 text-center bg-gray-50 rounded-lg">
                <span className="text-xs font-semibold text-gray-600">{title}</span>
                <span className="text-lg font-bold text-gray-400">N/A</span>
            </div>
        );
    }

    const displayValue = isRate ? `${value.toFixed(2)}%` : value.toFixed(2);
    const isSuccess = higherIsBetter ? value >= target : value <= target;

    return (
        <div className="flex flex-col items-center justify-center p-2 text-center bg-gray-50 rounded-lg">
            <span className="text-xs font-semibold text-gray-600">{title}</span>
            <div className="flex items-center gap-1">
                <span className={`text-lg font-bold ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
                    {displayValue}
                </span>
                {isSuccess ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
            </div>
        </div>
    );
};
