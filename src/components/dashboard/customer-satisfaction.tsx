
'use client';

import { useMemo } from 'react';
import { type Livraison } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { analyzeSentiment } from '@/lib/sentiment';

interface SatisfactionClientProps {
  data?: Livraison[];
}

export function CustomerSatisfaction({ data }: SatisfactionClientProps) {
  const analyseSentiment = useMemo(() => {
    if (!data) {
      return {
        repartitionNotes: [],
        repartitionSentiments: [],
        noteMoyenne: 0,
        sentimentMoyen: 0,
      };
    }
    
    const livraisonsNotees = data.filter(d => d.noteLivraison !== undefined);
    const livraisonsCommentees = data.filter(d => d.commentaireRetour && d.commentaireRetour.trim().length > 5);

    const repartitionNotes = [
      { name: '1 étoile', count: livraisonsNotees.filter(d => d.noteLivraison === 1).length },
      { name: '2 étoiles', count: livraisonsNotees.filter(d => d.noteLivraison === 2).length },
      { name: '3 étoiles', count: livraisonsNotees.filter(d => d.noteLivraison === 3).length },
      { name: '4 étoiles', count: livraisonsNotees.filter(d => d.noteLivraison === 4).length },
      { name: '5 étoiles', count: livraisonsNotees.filter(d => d.noteLivraison === 5).length },
    ];

    const sentiments = livraisonsCommentees.map(d => analyzeSentiment(d.commentaireRetour!, d.noteLivraison).score);
    const repartitionSentiments = [
        { name: 'Très négatif (0-2)', count: sentiments.filter(s => s <= 2).length },
        { name: 'Négatif (2-4)', count: sentiments.filter(s => s > 2 && s <= 4).length },
        { name: 'Neutre (4-6)', count: sentiments.filter(s => s > 4 && s <= 6).length },
        { name: 'Positif (6-8)', count: sentiments.filter(s => s > 6 && s <= 8).length },
        { name: 'Très positif (8-10)', count: sentiments.filter(s => s > 8).length },
    ];
    
    const noteMoyenne = livraisonsNotees.length > 0
      ? livraisonsNotees.reduce((acc, d) => acc + (d.noteLivraison || 0), 0) / livraisonsNotees.length
      : 0;

    const sentimentMoyen = sentiments.length > 0
        ? sentiments.reduce((acc, s) => acc + s, 0) / sentiments.length
        : 0;

    return { repartitionNotes, repartitionSentiments, noteMoyenne, sentimentMoyen };
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-background border rounded-md shadow-md">
          <p className="font-bold">{label}</p>
          <p className="text-sm">{`Nombre: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Satisfaction Client</CardTitle>
        <CardDescription>Répartition des notes et analyse de sentiment des commentaires.</CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-center font-semibold mb-2">
            Répartition des notes ({analyseSentiment.noteMoyenne.toFixed(2)}/5 en moyenne)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyseSentiment.repartitionNotes} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="count" position="top" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
            <h3 className="text-center font-semibold mb-2">
                Analyse de sentiment ({analyseSentiment.sentimentMoyen.toFixed(2)}/10 en moyenne)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyseSentiment.repartitionSentiments} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="count" position="top" />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
