

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

    // Process all available KPIs from the data
    for (const key in KPI_CONFIG) {
        const kpi = key as KpiKey;
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
        } else {
            value = data.stats[kpi as keyof typeof data.stats] as number | undefined;
            objective = objectives[kpi as keyof typeof objectives] as number;
        }

        if (value === undefined) {
            continue; // Skip KPIs with no data
        }
        
        const result = analyzeKpi(kpi, value, objective);
        const formattedValue = `${value.toFixed(2)}${config.unit}`;
        const pointText = `**${config.name}**: ${formattedValue}`;
        
        if (result === 'strength') {
            points.strengths.push(pointText);
            overallScore++;
        } else if (result === 'weakness') {
            points.weaknesses.push(pointText);
            overallScore--;
        }
    }
    
    // Add rankings to strengths if they exist
    if (data.kpiRankings.drivers.averageRating.top.length > 0) {
        const topDriver = data.kpiRankings.drivers.averageRating.top[0];
        points.strengths.push(`Meilleur livreur: **${topDriver.name}** (${topDriver.value.toFixed(2)}/5)`);
    }
    if (data.kpiRankings.carriers.averageRating.top.length > 0) {
        const topCarrier = data.kpiRankings.carriers.averageRating.top[0];
        points.strengths.push(`Meilleur transporteur: **${topCarrier.name}** (${topCarrier.value.toFixed(2)}/5)`);
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

    // Conclusion remains descriptive
    const conclusionPoints = [];
    if (globalAnalysis.strengths.length > 2 && globalAnalysis.overallScore > 0) conclusionPoints.push("La performance globale est solide avec plusieurs indicateurs clés dépassant les objectifs.");
    if (globalAnalysis.weaknesses.length > 2 && globalAnalysis.overallScore < 0) conclusionPoints.push("Plusieurs domaines nécessitent une attention particulière pour améliorer la performance globale.");
    
    const weakDepots = depotSyntheses.filter(d => d.overall === 'negative');
    if (weakDepots.length > 0) {
        conclusionPoints.push(`Les dépôts de ${weakDepots.map(d => d.name).join(', ')} semblent être les plus en difficulté.`);
    }
    const strongDepots = depotSyntheses.filter(d => d.overall === 'positive');
     if (strongDepots.length > 0) {
        conclusionPoints.push(`Les dépôts de ${strongDepots.map(d => d.name).join(', ')} affichent de bonnes performances.`);
    }

    return {
        global: {
            strengths: globalAnalysis.strengths,
            weaknesses: globalAnalysis.weaknesses,
            overall: getOverallStatus(globalAnalysis.overallScore)
        },
        depots: depotSyntheses,
        conclusion: conclusionPoints.length > 0 ? conclusionPoints.join(' ') : "La performance est mitigée, avec des points forts et des points faibles relativement équilibrés."
    };
}
