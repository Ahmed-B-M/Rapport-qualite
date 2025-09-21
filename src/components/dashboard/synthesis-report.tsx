
'use client';

import { type SynthesisResult, type DepotSynthesis } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ThumbsUp, ThumbsDown, GraduationCap, ArrowRightCircle, Target } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface SynthesisReportProps {
    synthesis: SynthesisResult;
}

const renderPoints = (points: string[], icon: React.ReactNode) => (
    <ul className="space-y-3">
        {points.map((point, index) => (
            <li key={index} className="flex items-start">
                <div className="flex-shrink-0 mr-3 mt-1">{icon}</div>
                <ReactMarkdown components={{ p: ({ children }) => <p className="mb-0 text-sm">{children}</p> }}>{point}</ReactMarkdown>
            </li>
        ))}
    </ul>
);

const DepotCard = ({ depot }: { depot: DepotSynthesis }) => {
    let statusColorClass = '';
    let statusTextColor = '';
    switch(depot.overall) {
        case 'positive': 
            statusColorClass = 'border-green-500 bg-green-50/50';
            statusTextColor = 'text-green-700';
            break;
        case 'negative': 
            statusColorClass = 'border-red-500 bg-red-50/50';
            statusTextColor = 'text-red-700';
            break;
        default: 
            statusColorClass = 'border-yellow-500 bg-yellow-50/50';
            statusTextColor = 'text-yellow-700';
    }

    return (
        <Card className={`shadow-md transition-all hover:shadow-lg ${statusColorClass}`}>
            <CardHeader className="pb-3">
                <CardTitle className={`text-lg font-bold ${statusTextColor}`}>{depot.name}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {depot.strengths.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-green-600 mb-2 flex items-center"><ThumbsUp className="h-4 w-4 mr-2" /> Points Forts</h4>
                            {renderPoints(depot.strengths, <ArrowRightCircle className="h-4 w-4 text-green-500" />)}
                        </div>
                    )}
                    {depot.weaknesses.length > 0 && (
                         <div>
                            <h4 className="font-semibold text-red-600 mb-2 flex items-center"><ThumbsDown className="h-4 w-4 mr-2" /> Axes d'Amélioration</h4>
                            {renderPoints(depot.weaknesses, <ArrowRightCircle className="h-4 w-4 text-red-500" />)}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export function SynthesisReport({ synthesis }: SynthesisReportProps) {
    if (!synthesis) return null;

    return (
        <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
            <div className="space-y-8">
                
                {/* Conclusion et Recommandations en premier */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center text-2xl font-bold text-blue-800">
                            <GraduationCap className="h-6 w-6 mr-3 text-blue-600" />
                            Conclusion & Recommandations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ReactMarkdown components={{ p: ({ children }) => <p className="text-base text-gray-700 leading-relaxed">{children}</p> }}>
                            {synthesis.conclusion}
                        </ReactMarkdown>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Colonne de gauche: Synthèse globale */}
                    <div className="space-y-6">
                        <Card className="shadow-md">
                            <CardHeader>
                                <CardTitle className="flex items-center text-xl">
                                    <Target className="h-5 w-5 mr-2 text-gray-700" />
                                    Synthèse Globale de la Performance
                                </CardTitle>
                                <CardDescription>
                                    Analyse des points forts et des axes d'amélioration sur l'ensemble des dépôts.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <h3 className="font-bold text-lg mb-3 text-green-700 flex items-center">
                                        <ThumbsUp className="h-5 w-5 mr-2" />
                                        Points forts
                                    </h3>
                                    {renderPoints(synthesis.global.strengths, <ArrowRightCircle className="h-4 w-4 text-green-500" />)}
                                </div>
                                <hr/>
                                <div>
                                    <h3 className="font-bold text-lg mb-3 text-red-700 flex items-center">
                                        <ThumbsDown className="h-5 w-5 mr-2" />
                                        Axes d'amélioration
                                    </h3>
                                    {renderPoints(synthesis.global.weaknesses, <ArrowRightCircle className="h-4 w-4 text-red-500" />)}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Colonne de droite: Analyse par dépôt */}
                    <div className="space-y-6">
                         <h2 className="text-2xl font-bold text-gray-800">Analyse par Dépôt</h2>
                         <div className="space-y-4">
                            {synthesis.depots.map(depot => <DepotCard key={depot.name} depot={depot} />)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
