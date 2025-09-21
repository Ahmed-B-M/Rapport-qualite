
import { type DonneesRapportPerformance, type Objectifs, type ResultatSynthese, type DonneesSectionRapport, PointsSynthese, type SyntheseDepot } from './definitions';

const KPI_CONFIG = {
    tauxReussite: {
        nom: 'Taux de succès',
        higherIsBetter: true,
        formatter: (val: number) => `${val.toFixed(2)}%`,
        getPhrase: (val: number, obj: number, meets: boolean) => meets
            ? `Le taux de succès de ${val.toFixed(2)}% est excellent, dépassant l'objectif de ${obj}%`
            : `Le taux de succès de ${val.toFixed(2)}% est inférieur à l'objectif de ${obj}%`,
    },
    noteMoyenne: {
        nom: 'Note moyenne',
        higherIsBetter: true,
        formatter: (val: number) => `${val.toFixed(2)}/5`,
        getPhrase: (val: number, obj: number, meets: boolean) => meets
            ? `La note moyenne de ${val.toFixed(2)}/5 est très bonne, au-dessus de l'objectif de ${obj}/5`
            : `La note moyenne de ${val.toFixed(2)}/5 est en-dessous de l'objectif de ${obj}/5`,
    },
    sentimentMoyen: {
        nom: 'Sentiment moyen des commentaires',
        higherIsBetter: true,
        formatter: (val: number) => `${val.toFixed(2)}/10`,
        getPhrase: (val: number, obj: number, meets: boolean) => meets
            ? `Le sentiment des commentaires est positif (${val.toFixed(2)}/10), au-dessus de l'objectif de ${obj}/10`
            : `Le sentiment des commentaires est à améliorer (${val.toFixed(2)}/10), en-dessous de l'objectif de ${obj}/10`,
    },
    tauxPonctualite: {
        nom: 'Taux de ponctualité',
        higherIsBetter: true,
        formatter: (val: number) => `${val.toFixed(2)}%`,
        getPhrase: (val: number, obj: number, meets: boolean) => meets
            ? `Le taux de ponctualité de ${val.toFixed(2)}% est bon, dépassant l'objectif de ${obj}%`
            : `Le taux de ponctualité de ${val.toFixed(2)}% est perfectible, inférieur à l'objectif de ${obj}%`,
    }
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
    data: DonneesSectionRapport,
    objectives: Objectifs,
): PointsSynthese & { global: 'positif' | 'négatif' | 'mitigé' } {
    const points: PointsSynthese = { forces: [], faiblesses: [] };
    let score = 0;

    for (const key in KPI_CONFIG) {
        const kpi = key as KpiKey;
        const config = KPI_CONFIG[kpi];
        
        let value: number | undefined;
        let objective: number;

        switch (kpi) {
            case 'tauxReussite':
                value = data.statistiques.tauxReussite;
                objective = 100 - objectives.tauxEchec;
                break;
            case 'noteMoyenne':
                value = data.statistiques.noteMoyenne;
                objective = objectives.noteMoyenne;
                break;
            case 'sentimentMoyen':
                value = data.statistiques.sentimentMoyen;
                objective = objectives.sentimentMoyen;
                break;
            case 'tauxPonctualite':
                value = data.statistiques.tauxPonctualite;
                objective = objectives.tauxPonctualite;
                break;
        }

        const analysis = analyzeKpi(kpi, value, objective);
        if (value !== undefined) {
             const phrase = config.getPhrase(value, objective, analysis === 'strength');
             if (analysis === 'strength') {
                points.forces.push(phrase);
                score++;
            } else if (analysis === 'weakness') {
                points.faiblesses.push(phrase);
                score--;
            }
        }
    }

    if (data.meilleursCommentaires.length > 0) {
        points.forces.push(`Les commentaires clients sont globalement très positifs, menés par des livreurs comme ${data.meilleursCommentaires[0].chauffeur}.`);
    }
    if (data.piresCommentaires.length > 0) {
        points.faiblesses.push(`Certains clients ont exprimé leur mécontentement, notamment concernant les livraisons effectuées par ${data.piresCommentaires[0].chauffeur}.`);
    }

    let overallStatus: 'positif' | 'négatif' | 'mitigé';
    if (score > 1) overallStatus = 'positif';
    else if (score < 0) overallStatus = 'négatif';
    else overallStatus = 'mitigé';

    return { ...points, global: overallStatus };
}


export function generateSynthesis(
    reportData: DonneesRapportPerformance,
    objectives: Objectifs
): ResultatSynthese {
    const globalSynthesis = generatePointsForScope(reportData.global, objectives);

    const depotSyntheses: SyntheseDepot[] = reportData.depots.map(depotData => {
        const depotPoints = generatePointsForScope(depotData, objectives);
        return {
            nom: depotData.nom,
            entrepot: depotData.entrepot,
            ...depotPoints
        };
    });

    const conclusion = `
Le rapport met en évidence une performance **${globalSynthesis.global === 'positif' ? 'solide' : globalSynthesis.global === 'mitigé' ? 'mitigée' : 'préoccupante'}** sur la période analysée.

**Recommandations:**
- **Capitaliser sur les points forts:** Analyser les pratiques des livreurs et dépôts les plus performants pour les généraliser.
- **Actions correctives ciblées:** Mettre en place des plans d'action pour les dépôts et livreurs identifiés comme moins performants, en se concentrant sur les indicateurs clés en difficulté.
- **Suivi continu:** Maintenir un suivi régulier de ces indicateurs pour mesurer l'efficacité des actions mises en place.
    `;

    return {
        global: globalSynthesis,
        depots: depotSyntheses,
        conclusion: conclusion.trim()
    };
}

    