
import { type PerformanceReportData, type Objectives, type SynthesisResult, type SynthesisPoints, type DepotSynthesis } from './definitions';

const KPI_CONFIG = {
    successRate: { name: 'Taux de succès', higherIsBetter: true },
    averageRating: { name: 'Note moyenne', higherIsBetter: true },
    averageSentiment: { name: 'Note des commentaires', higherIsBetter: true },
    punctualityRate: { name: 'Ponctualité', higherIsBetter: true },
    failureRate: { name: 'Taux d\'échec', higherIsBetter: false },
    forcedOnSiteRate: { name: 'Taux de "Sur place" forcé', higherIsBetter: false },
    forcedNoContactRate: { name: 'Taux de "Sans contact" forcé', higherIsBetter: false },
    webCompletionRate: { name: 'Taux de validation web', higherIsBetter: false }
};

type KpiKey = keyof typeof KPI_CONFIG;

function analyzeKpi(
    kpi: KpiKey,
    stats: PerformanceReportData['global']['stats'],
    objectives: Objectives
): 'strength' | 'weakness' | 'neutral' {
    const config = KPI_CONFIG[kpi];
    let value: number | undefined;
    let objective: number;

    if (kpi === 'successRate') {
        value = stats.successRate;
        objective = 100 - objectives.failureRate;
    } else if (kpi === 'failureRate') {
        value = 100 - stats.successRate;
        objective = objectives.failureRate;
    } else if (kpi === 'averageRating') {
        value = stats.averageRating;
        objective = objectives.averageRating;
    } else if (kpi === 'averageSentiment') {
        value = stats.averageSentiment;
        objective = objectives.averageSentiment;
     } else if (kpi === 'punctualityRate') {
        value = stats.punctualityRate;
        objective = objectives.punctualityRate;
    } else {
        value = stats[kpi as keyof typeof stats] as number;
        objective = objectives[kpi as keyof typeof objectives] as number;
    }
    
    if (value === undefined) return 'neutral';

    const meetsObjective = config.higherIsBetter ? value >= objective : value <= objective;
    const difference = Math.abs(value - objective);
    const significanceThreshold = 0.05 * objective; // 5% threshold for significance

    if (meetsObjective && difference > significanceThreshold) return 'strength';
    if (!meetsObjective && difference > significanceThreshold) return 'weakness';
    return 'neutral';
}

function generatePointsForScope(
    data: PerformanceReportData['global'],
    objectives: Objectives,
    scopeName: string = 'global'
): SynthesisPoints & { overallScore: number } {
    const points: SynthesisPoints = { strengths: [], weaknesses: [] };
    let overallScore = 0;

    for (const key in KPI_CONFIG) {
        const kpi = key as KpiKey;
        const result = analyzeKpi(kpi, data.stats, objectives);
        const kpiName = KPI_CONFIG[kpi].name;
        
        let value: number | undefined;
        if (kpi === 'successRate') {
            value = data.stats.successRate;
        } else if (kpi === 'failureRate') {
            value = 100 - data.stats.successRate;
        } else if (kpi === 'punctualityRate') {
            value = data.stats.punctualityRate;
        } else {
            value = data.stats[kpi as keyof typeof data.stats] as number | undefined;
        }

        if (value !== undefined) {
             const formattedValue = `${value.toFixed(1)}${['successRate', 'punctualityRate', 'failureRate', 'forcedOnSiteRate', 'forcedNoContactRate', 'webCompletionRate'].includes(kpi) ? '%' : ''}`;
            if (result === 'strength') {
                points.strengths.push(`Le **${kpiName}** (${formattedValue}) est un point fort, dépassant l'objectif.`);
                overallScore++;
            } else if (result === 'weakness') {
                points.weaknesses.push(`Le **${kpiName}** (${formattedValue}) est un point à améliorer, n'atteignant pas l'objectif.`);
                overallScore--;
            }
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
    if (score > 1) return 'positive';
    if (score < -1) return 'negative';
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
    if (globalAnalysis.strengths.length > 2) conclusionPoints.push("La performance globale est solide avec plusieurs indicateurs clés dépassant les objectifs.");
    if (globalAnalysis.weaknesses.length > 2) conclusionPoints.push("Plusieurs domaines nécessitent une attention particulière pour améliorer la performance globale.");
    
    const weakDepots = depotSyntheses.filter(d => d.overall === 'negative');
    if (weakDepots.length > 0) {
        conclusionPoints.push(`Les dépôts de ${weakDepots.map(d => d.name).join(', ')} semblent être les plus en difficulté.`);
    }

    return {
        global: {
            strengths: globalAnalysis.strengths,
            weaknesses: globalAnalysis.weaknesses,
            overall: getOverallStatus(globalAnalysis.overallScore)
        },
        depots: depotSyntheses,
        conclusion: conclusionPoints.join(' ') || "La performance est mitigée, avec des points forts et des points faibles équilibrés."
    };
}
