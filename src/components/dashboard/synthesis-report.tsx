
'use client';

import { type SynthesisResult, type DepotSynthesis } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ThumbsUp, ThumbsDown, GraduationCap, ArrowRightCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface SynthesisReportProps {
    synthesis: SynthesisResult;
}

const renderPoints = (points: string[], icon: React.ReactNode) => (
    <ul className="space-y-2">
        {points.map((point, index) => (
            <li key={index} className="flex items-start">
                <div className="flex-shrink-0 mr-2 mt-1">{icon}</div>
                <ReactMarkdown components={{ p: ({ children }) => <p className="mb-0">{children}</p> }}>{point}</ReactMarkdown>
            </li>
        ))}
    </ul>
);

const DepotCard = ({ depot }: { depot: DepotSynthesis }) => {
    let statusColorClass = '';
    switch(depot.overall) {
        case 'positive': statusColorClass = 'border-green-500'; break;
        case 'negative': statusColorClass = 'border-red-500'; break;
        default: statusColorClass = 'border-yellow-500';
    }

    return (
        <Card className={`border-l-4 ${statusColorClass}`}>
            <CardHeader>
                <CardTitle>{depot.name}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {depot.strengths.length > 0 && renderPoints(depot.strengths, <ThumbsUp className="h-4 w-4 text-green-500" />)}
                    {depot.weaknesses.length > 0 && renderPoints(depot.weaknesses, <ThumbsDown className="h-4 w-4 text-red-500" />)}
                </div>
            </CardContent>
        </Card>
    );
};

export function SynthesisReport({ synthesis }: SynthesisReportProps) {
    if (!synthesis) return null;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Synthèse Globale de la Performance</CardTitle>
                    <CardDescription>
                        Analyse automatisée des points forts et des axes d'amélioration basés sur vos objectifs.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Points forts</h3>
                        {renderPoints(synthesis.global.strengths, <ThumbsUp className="h-4 w-4 text-green-500" />)}
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Axes d'amélioration</h3>
                        {renderPoints(synthesis.global.weaknesses, <ThumbsDown className="h-4 w-4 text-red-500" />)}
                    </div>
                </CardContent>
            </Card>

            <div>
                <h2 className="text-2xl font-bold my-4">Analyse par Dépôt</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {synthesis.depots.map(depot => <DepotCard key={depot.name} depot={depot} />)}
                </div>
            </div>

             <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <GraduationCap className="h-5 w-5 mr-2 text-blue-600" />
                        Conclusion & Recommandations
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-lg">{synthesis.conclusion}</p>
                </CardContent>
            </Card>
        </div>
    );
}
