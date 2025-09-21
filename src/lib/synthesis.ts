

import { type PerformanceReportData, type Objectives, type SynthesisResult, type SynthesisPoints, type DepotSynthesis } from './definitions';

const KPI_CONFIG = {
    successRate: { name: 'Taux de succès', higherIsBetter: true, unit: '%' },
    averageRating: { name: 'Note moyenne', higherIsBetter: true, unit: '/5' },
    averageSentiment: { name: 'Note des commentaires', higherIsBetter: true, unit: '/10' },
    punctualityRate: { name: 'Ponctualité', higherIsBetter: true, unit: '%' },
    failureRate: { name: 'Taux d\'échec', higherIsBetter: false, unit: '%' },
    forcedOnSiteRate: { name: 'Taux de "Sur place" forcé', higherIsBetter: false, unit: '%' },
    forcedNoContactRate: { name: 'Taux de "Sans contact" forcé', higherIsBetter: false, unit: '%' },
    webCompletionRate: { name: 'Taux de validation web', higherIsBetter: false, unit: '%' }
};

type KpiKey = keyof typeof KPI_CONFIG;

function analyzeKpi(
    kpi: KpiKey,
    value: number | undefined,
    objective: number
): 'strength' | 'weakness' | 'neutral' {
    if (value === undefined) return 'neutral';

    const config = KPI_CONFIG[kpi];
    const meetsObjective = config.higherIsBetter ? value >= objective : value <= objective;
    
    if (meetsObjective) return 'strength';
    return 'weakness';
}


function generatePointsForScope(
    data: PerformanceReportData['global'],
    objectives: Objectives,
    scopeName: string = 'global'
): SynthesisPoints & { overallScore: number } {
    const points: SynthesisPoints = { strengths: [], weaknesses: [] };
    let overallScore = 0;

    const kpisToAlwaysComment: KpiKey[] = ['punctualityRate', 'averageRating'];

    const processKpi = (kpi: KpiKey, forceComment: boolean = false) => {
        const config = KPI_CONFIG[kpi];
        let value: number | undefined;
        let objective: number;

        // Map KPI to stats and objectives
        if (kpi === 'successRate') {
            value = data.stats.successRate;
            objective = 100 - objectives.failureRate;
        } else if (kpi === 'failureRate') {
            value = 100 - data.stats.successRate;
            objective = objectives.failureRate;
        } else if (kpi === 'averageRating') {
            value = data.stats.averageRating;
            objective = objectives.averageRating;
        } else if (kpi === 'punctualityRate') {
            value = data.stats.punctualityRate;
            objective = objectives.punctualityRate;
        } else if (kpi === 'averageSentiment') {
            value = data.stats.averageSentiment;
            objective = objectives.averageSentiment;
        } else {
            value = data.stats[kpi as keyof typeof data.stats] as number | undefined;
            objective = objectives[kpi as keyof typeof objectives] as number;
        }

        if (value === undefined) {
             if(forceComment) {
                points.weaknesses.push(`Le **${config.name}** n'a pas pu être calculé (données insuffisantes).`);
                overallScore--;
            }
            return;
        }
        
        const result = analyzeKpi(kpi, value, objective);
        const formattedValue = `${value.toFixed(2)}${config.unit}`;
        
        if (result === 'strength') {
            points.strengths.push(`Le **${config.name}** (${formattedValue}) est un point fort, atteignant ou dépassant l'objectif.`);
            overallScore++;
        } else if (result === 'weakness') {
            points.weaknesses.push(`Le **${config.name}** (${formattedValue}) est un point à améliorer, n'atteignant pas l'objectif.`);
            overallScore--;
        } else { // Neutral - currently unreachable but kept for future logic
             if(forceComment) {
                 points.strengths.push(`Le **${config.name}** est de ${formattedValue}.`);
            }
        }
    };
    
    // Process all KPIs, forcing comments for the most important ones
    for (const key in KPI_CONFIG) {
        const kpi = key as KpiKey;
        const mustComment = kpisToAlwaysComment.includes(kpi);
        if (mustComment) {
            processKpi(kpi, true);
        }
    }
     for (const key in KPI_CONFIG) {
        const kpi = key as KpiKey;
        const mustComment = kpisToAlwaysComment.includes(kpi);
        if (!mustComment) {
            processKpi(kpi, false);
        }
    }
    
    // Analyze rankings
    if(data.kpiRankings.drivers.averageRating.top.length > 0) {
        points.strengths.push(`**${data.kpiRankings.drivers.averageRating.top[0].name}** est le livreur le mieux noté.`);
    }
    if(data.kpiRankings.carriers.averageRating.top.length > 0) {
        points.strengths.push(`**${data.kpiRankings.carriers.averageRating.top[0].name}** est le transporteur avec la meilleure note moyenne.`);
    }

    return { ...points, overallScore };
}

function getOverallStatus(score: number): 'positive' | 'negative' | 'mitigée' {
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'mitigée';
}

export function generateSynthesis(
    reportData: PerformanceReportData,
    objectives: Objectives
): SynthesisResult {
    const globalAnalysis = generatePointsForScope(reportData.global, objectives, 'global');

    const depotSyntheses: DepotSynthesis[] = reportData.depots.map(depot => {
        const depotAnalysis = generatePointsForScope(depot, objectives, depot.name);
        return {
            name: depot.name,
            strengths: depotAnalysis.strengths,
            weaknesses: depotAnalysis.weaknesses,
            overall: getOverallStatus(depotAnalysis.overallScore)
        };
    });

    const conclusionPoints = [];
    if (globalAnalysis.strengths.length > 2 && globalAnalysis.overallScore > 0) conclusionPoints.push("La performance globale est solide avec plusieurs indicateurs clés dépassant les objectifs.");
    if (globalAnalysis.weaknesses.length > 2 && globalAnalysis.overallScore < 0) conclusionPoints.push("Plusieurs domaines nécessitent une attention particulière pour améliorer la performance globale.");
    
    const weakDepots = depotSyntheses.filter(d => d.overall === 'negative');
    if (weakDepots.length > 0) {
        conclusionPoints.push(`Les dépôts de ${weakDepots.map(d => d.name).join(', ')} semblent être les plus en difficulté et méritent une analyse approfondie.`);
    }
    const strongDepots = depotSyntheses.filter(d => d.overall === 'positive');
     if (strongDepots.length > 0) {
        conclusionPoints.push(`Les dépôts de ${strongDepots.map(d => d.name).join(', ')} affichent de bonnes performances, servant de modèle potentiel.`);
    }


    return {
        global: {
            strengths: globalAnalysis.strengths,
            weaknesses: globalAnalysis.weaknesses,
            overall: getOverallStatus(globalAnalysis.overallScore)
        },
        depots: depotSyntheses,
        conclusion: conclusionPoints.length > 0 ? conclusionPoints.join(' ') : "La performance est mitigée, avec des points forts et des points faibles relativement équilibrés sur la période."
    };
}
