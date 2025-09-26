"use client";
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CategorieProbleme, CommentaireCategorise, ResultatsAnalyse, CATEGORIES_PROBLEMES } from '@/lib/definitions';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerSatisfactionProps {
    analysisResults: ResultatsAnalyse | null;
}

const STORAGE_KEY = 'commentCategories';

export function CustomerSatisfaction({ analysisResults }: CustomerSatisfactionProps) {
    const [comments, setComments] = useState<CommentaireCategorise[]>([]);
    const [openPopover, setOpenPopover] = useState<string | null>(null);

    useEffect(() => {
        if (analysisResults) {
            const storedCategories = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            const initialComments = Object.values(analysisResults.commentairesParCategorie).flat();
            
            const commentsWithStoredCategories = initialComments.map(comment => {
                const commentId = btoa(encodeURIComponent(`${comment.commentaire}-${comment.chauffeur}`));
                if (storedCategories[commentId]) {
                    return { ...comment, categorie: storedCategories[commentId] };
                }
                return comment;
            });

            setComments(commentsWithStoredCategories);
        }
    }, [analysisResults]);

    const handleCategoryChange = (commentaire: CommentaireCategorise, newCategory: CategorieProbleme) => {
        const commentId = btoa(encodeURIComponent(`${commentaire.commentaire}-${commentaire.chauffeur}`));
        const storedCategories = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        storedCategories[commentId] = newCategory;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storedCategories));

        setComments(prevCommentaires =>
            prevCommentaires.map(c =>
                c.commentaire === commentaire.commentaire && c.chauffeur === commentaire.chauffeur
                    ? { ...c, categorie: newCategory }
                    : c
            )
        );
        setOpenPopover(null);
    };
    
    const commentsByCategory = useMemo(() => {
        return comments.reduce((acc, comm) => {
            if (!acc[comm.categorie]) {
                acc[comm.categorie] = [];
            }
            acc[comm.categorie].push(comm);
            return acc;
        }, {} as Record<CategorieProbleme, CommentaireCategorise[]>);
    }, [comments]);

    const categoriesWithComments = CATEGORIES_PROBLEMES.filter(cat => commentsByCategory[cat] && commentsByCategory[cat].length > 0);

    if (!analysisResults) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Analyse des Commentaires Négatifs</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Aucune donnée à analyser.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Analyse des Commentaires Négatifs</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                    Retours clients négatifs classés par type de problème. Vous pouvez re-catégoriser un commentaire en cliquant sur le bouton.
                </p>
                <Accordion type="multiple" collapsible className="w-full" defaultValue={categoriesWithComments}>
                    {categoriesWithComments.map((categorie) => (
                        <AccordionItem key={categorie} value={categorie}>
                            <AccordionTrigger className="text-lg font-semibold">
                                <div className="flex items-center">
                                    {categorie}
                                    <span className="ml-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full">
                                        {commentsByCategory[categorie]?.length || 0}
                                    </span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Commentaire
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Livreur
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Dépôt
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {commentsByCategory[categorie]?.map((commentaire, index) => {
                                                const popoverId = `${categorie}-${index}`;
                                                return (
                                                    <tr key={index}>
                                                        <td className="px-6 py-4 whitespace-pre-wrap max-w-md">
                                                            "{commentaire.commentaire}"
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            {commentaire.chauffeur}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            {commentaire.depot}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <Popover open={openPopover === popoverId} onOpenChange={(isOpen) => setOpenPopover(isOpen ? popoverId : null)}>
                                                                <PopoverTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        role="combobox"
                                                                        aria-expanded={openPopover === popoverId}
                                                                        className="w-[200px] justify-between"
                                                                    >
                                                                        Déplacer vers...
                                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-[200px] p-0">
                                                                    <Command>
                                                                        <CommandInput placeholder="Changer catégorie..." />
                                                                        <CommandList>
                                                                            <CommandEmpty>Aucune catégorie trouvée.</CommandEmpty>
                                                                            <CommandGroup>
                                                                                {CATEGORIES_PROBLEMES.map((cat) => (
                                                                                    <CommandItem
                                                                                        key={cat}
                                                                                        value={cat}
                                                                                        onSelect={(currentValue) => {
                                                                                            handleCategoryChange(commentaire, currentValue as CategorieProbleme);
                                                                                        }}
                                                                                    >
                                                                                        <Check
                                                                                            className={cn(
                                                                                                "mr-2 h-4 w-4",
                                                                                                commentaire.categorie === cat ? "opacity-100" : "opacity-0"
                                                                                            )}
                                                                                        />
                                                                                        {cat}
                                                                                    </CommandItem>
                                                                                ))}
                                                                            </CommandGroup>
                                                                        </CommandList>
                                                                    </Command>
                                                                </PopoverContent>
                                                            </Popover>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    );
}
