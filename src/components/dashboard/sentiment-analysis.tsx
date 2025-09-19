"use client"

import { useMemo, useState, useEffect } from 'react';
import { type Delivery } from '@/lib/definitions';
import { analyzeCommentSentiment, type AnalyzeCommentSentimentOutput } from '@/ai/flows/delivery-comment-sentiment-analysis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Bot, Loader2, MessageSquareQuote, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type CommentWithSentiment = {
    comment: string;
    rating?: number;
    driver: string;
} & AnalyzeCommentSentimentOutput;

export function SentimentAnalysis({ data }: { data: Delivery[] }) {
    const [analyzedComments, setAnalyzedComments] = useState<CommentWithSentiment[]>([]);
    const [loading, setLoading] = useState(true);

    const comments = useMemo(() => {
        return data.filter(d => d.feedbackComment && d.feedbackComment.trim() !== '');
    }, [data]);

    useEffect(() => {
        const analyzeComments = async () => {
            setLoading(true);
            const sentimentPromises = comments.map(async (delivery) => {
                try {
                    const sentiment = await analyzeCommentSentiment({ comment: delivery.feedbackComment! });
                    return {
                        ...sentiment,
                        comment: delivery.feedbackComment!,
                        rating: delivery.deliveryRating,
                        driver: delivery.driver
                    };
                } catch (error) {
                    console.error("Sentiment analysis failed for a comment:", error);
                    return null;
                }
            });

            const results = (await Promise.all(sentimentPromises)).filter(Boolean) as CommentWithSentiment[];
            setAnalyzedComments(results);
            setLoading(false);
        };

        if (comments.length > 0) {
            analyzeComments();
        } else {
            setLoading(false);
        }
    }, [comments]);

    const overallSentiment = useMemo(() => {
        if (analyzedComments.length === 0) return 50;
        const sum = analyzedComments.reduce((acc, curr) => acc + (curr.sentimentScore + 1) / 2, 0);
        return (sum / analyzedComments.length) * 100;
    }, [analyzedComments]);

    const outliers = useMemo(() => analyzedComments.filter(c => c.isOutlier), [analyzedComments]);

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle>Overall Customer Sentiment</CardTitle>
                    <CardDescription>Based on {analyzedComments.length} comments</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center space-y-4">
                    <div className="relative w-full">
                        <Progress value={overallSentiment} className="h-4" />
                        <span className="absolute left-0 -bottom-6 text-sm text-muted-foreground">Negative</span>
                        <span className="absolute right-0 -bottom-6 text-sm text-muted-foreground">Positive</span>
                    </div>
                    <div className="pt-8 text-4xl font-bold font-headline" style={{ color: `hsl(${overallSentiment * 1.2}, 100%, 35%)`}}>
                        {overallSentiment.toFixed(1)}%
                    </div>
                    <p className="text-muted-foreground">
                        {overallSentiment > 75 ? "Overwhelmingly Positive" : overallSentiment > 60 ? "Positive" : overallSentiment > 40 ? "Neutral" : overallSentiment > 25 ? "Negative" : "Overwhelmingly Negative"}
                    </p>
                </CardContent>
            </Card>

            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Bot /> Extreme Sentiment Comments</CardTitle>
                    <CardDescription>AI has flagged these comments as strongly positive or negative.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="animate-spin h-5 w-5" />
                            <span>Analyzing comments...</span>
                        </div>
                    ) : outliers.length > 0 ? (
                        <ScrollArea className="h-80">
                            <div className="space-y-4 pr-4">
                            {outliers.map((c, i) => (
                                <div key={i} className="p-3 border rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm italic">"{c.comment}"</p>
                                        {c.sentimentScore > 0 ? <ThumbsUp className="h-5 w-5 text-green-500" /> : <ThumbsDown className="h-5 w-5 text-red-500" />}
                                    </div>
                                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                                        <span>Driver: {c.driver}</span>
                                        <Badge variant={c.sentimentScore > 0 ? "default": "destructive"}>
                                            Score: {c.sentimentScore.toFixed(2)}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
                             <MessageSquareQuote className="h-10 w-10 mb-4" />
                            <p className="font-semibold">No outlier comments found.</p>
                            <p className="text-sm">All feedback falls within a normal sentiment range.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
