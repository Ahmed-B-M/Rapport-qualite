
import Sentiment from 'sentiment';
import { type Delivery } from './definitions';

const sentiment = new Sentiment();

// A french translation layer for sentiment analysis
const sentimentOptions = {
    extras: {
        'génial': 5, 'parfait': 5, 'excellent': 4, 'super': 4, 'rapide': 3,
        'efficace': 3, 'satisfait': 3, 'bon': 3, 'gentil': 2, 'sympa': 2,
        'courtois': 2, 'aimable': 3, 'serviable': 3, 'poli': 3, 'merci': 4,
        'problème': -3, 'mauvais': -3, 'endommagé': -4, 'cassé': -4,
        'livré en retard': -3, 'retard': -2, 'en retard': -2, 'pas à l\'heure': -2,
        'ne recommande pas': -4, 'déçu': -3, 'colis jeté': -5, 'contrariant': -3,
    }
};

export type SentimentResult = {
    score: number;
    comparative: number;
    positive: string[];
    negative: string[];
};

export function analyzeSentiment(text: string, rating?: number): SentimentResult {
    const lowerCaseText = text.toLowerCase();

    // Rule-based overrides for common neutral-but-positive French phrases
    if (/\b(ras)\b/.test(lowerCaseText) || lowerCaseText.includes("rien à signaler")) {
        return { score: 8.5, comparative: 1, positive: ['ras'], negative: [] };
    }
    if (lowerCaseText.includes("pas de problème") || lowerCaseText.includes("aucun problème")) {
        return { score: 8.0, comparative: 1, positive: ['pas de problème'], negative: [] };
    }
    if (lowerCaseText.includes("rien à dire")) {
        return { score: 9.0, comparative: 1, positive: ['rien à dire'], negative: [] };
    }

    // New rule for explicitly positive comments, overriding low star ratings
    const strongPositives = ["très bien", "tres bien", "parfait", "excellent", "super", "génial"];
    if (strongPositives.some(phrase => lowerCaseText.includes(phrase))) {
        return { score: 8.5, comparative: 1, positive: ['strong_positive'], negative: [] };
    }

    const result = sentiment.analyze(text, sentimentOptions);

    // Prioritize the customer's rating for the main score
    if (rating !== undefined && rating !== null) {
        let score;
        switch (rating) {
            case 5: score = 9.5; break;
            case 4: score = 7.5; break;
            case 3: score = 5.0; break;
            case 2: score = 2.5; break;
            case 1: score = 0.5; break;
            default: score = 5.0;
        }
        // Use the text sentiment for a minor adjustment (+/- 0.5 points)
        const adjustment = result.score / 10;
        score += adjustment;
        
        return {
            score: Math.max(0, Math.min(10, score)), // Clamp score between 0 and 10
            comparative: result.comparative,
            positive: result.positive,
            negative: result.negative,
        };
    }
    
    // Fallback for texts without a rating
    const clampedScore = Math.max(-10, Math.min(10, result.score));
    const normalizedScore = (clampedScore + 10) / 2;
    
    return {
        score: normalizedScore,
        comparative: result.comparative,
        positive: result.positive,
        negative: result.negative,
    };
}


export function getTopComments(
    deliveries: (Pick<Delivery, 'feedbackComment' | 'deliveryRating' | 'driver'>)[],
    sentimentType: 'positive' | 'negative',
    count: number = 3
  ): { comment: string; score: number; driver: string }[] {
    const allComments = deliveries
      .filter(d => d.feedbackComment && d.feedbackComment.trim().length > 1)
      .map(d => ({
        comment: d.feedbackComment!,
        score: analyzeSentiment(d.feedbackComment!, d.deliveryRating).score,
        driver: d.driver,
      }));
  
    if (sentimentType === 'positive') {
      const positiveComments = allComments.filter(c => c.score > 7);
      positiveComments.sort((a, b) => b.score - a.score);
      return positiveComments.slice(0, count);
    } else {
      const negativeComments = allComments.filter(c => c.score < 4);
      negativeComments.sort((a, b) => a.score - b.score);
      return negativeComments.slice(0, count);
    }
}
