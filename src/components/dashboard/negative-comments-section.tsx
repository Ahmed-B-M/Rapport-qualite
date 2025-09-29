
'use client';

import React, { useMemo, useState } from 'react';
import { type CommentaireCategorise, CATEGORIES_PROBLEMES, CategorieProbleme } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ThumbsDown, MessageSquare, Download, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import * as XLSX from 'xlsx';

interface NegativeCommentsSectionProps {
    comments: CommentaireCategorise[];
    setComments: React.Dispatch<React.SetStateAction<CommentaireCategorise[]>>;
}

export const NegativeCommentsSection = ({ comments, setComments }: NegativeCommentsSectionProps) => {
    const [openPopover, setOpenPopover] = useState<string | null>(null);

    const handleCategoryChange = (commentaire: CommentaireCategorise, newCategory: CategorieProbleme) => {
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

    const handleExport = () => {
        const dataToExport: { Catégorie: string, Commentaire: string, Livreur: string, Dépôt: string }[] = [];
        
        categoriesWithComments.forEach(categorie => {
            commentsByCategory[categorie].forEach(item => {
                const depot = item.depot || 'Inconnu';
                const livreur = item.chauffeur.replace(/\s*\([^)]*\)$/, '').trim();

                dataToExport.push({
                    Catégorie: categorie,
                    Commentaire: item.commentaire,
                    Livreur: livreur,
                    Dépôt: depot,
                });
            });
        });

        if (dataToExport.length > 0) {
            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Commentaires Négatifs');
            XLSX.writeFile(workbook, 'commentaires_negatifs.xlsx');
        }
    };

    if (categoriesWithComments.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-8">
                <MessageSquare className="mx-auto h-12 w-12" />
                <p className="mt-4">Aucun commentaire négatif à analyser pour cette sélection.</p>
            </div>
        );
    }
    
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center"><ThumbsDown className="mr-2"/> Analyse des Commentaires Négatifs</CardTitle>
                    <CardDescription>Retours clients négatifs classés par type de problème. Vous pouvez re-catégoriser un commentaire en cliquant sur le bouton.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Exporter en Excel
                </Button>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full" defaultValue={categoriesWithComments.length > 0 ? categoriesWithComments[0] : undefined}>
                    {categoriesWithComments.map(categorie => (
                        <AccordionItem value={categorie} key={categorie}>
                            <AccordionTrigger>
                                <div className="flex items-center justify-between w-full pr-4">
                                    <span className="capitalize font-semibold">{categorie}</span>
                                    <span className="text-sm font-bold text-destructive bg-destructive/10 rounded-full px-2 py-0.5">{commentsByCategory[categorie].length}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Commentaire</TableHead>
                                            <TableHead>Livreur</TableHead>
                                            <TableHead>Dépôt</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {commentsByCategory[categorie].map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="max-w-sm italic">"{item.commentaire}"</TableCell>
                                                <TableCell>{item.chauffeur}</TableCell>
                                                <TableCell>{item.depot}</TableCell>
                                                <TableCell className="text-right">
                                                  <Popover open={openPopover === `${categorie}-${index}`} onOpenChange={(isOpen) => setOpenPopover(isOpen ? `${categorie}-${index}` : null)}>
                                                      <PopoverTrigger asChild>
                                                          <Button variant="outline" role="combobox" aria-expanded={openPopover === `${categorie}-${index}`} className="w-[150px] justify-between text-xs h-8">
                                                              Déplacer vers...
                                                              <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                                          </Button>
                                                      </PopoverTrigger>
                                                      <PopoverContent className="w-[200px] p-0">
                                                          <Command>
                                                              <CommandInput placeholder="Changer catégorie..." />
                                                              <CommandEmpty>Aucune catégorie.</CommandEmpty>
                                                              <CommandGroup>
                                                                  {CATEGORIES_PROBLEMES.filter(c => c !== categorie).map(newCat => (
                                                                      <CommandItem
                                                                          key={newCat}
                                                                          onSelect={() => handleCategoryChange(item, newCat)}
                                                                      >
                                                                          {newCat}
                                                                      </CommandItem>
                                                                  ))}
                                                              </CommandGroup>
                                                          </Command>
                                                      </PopoverContent>
                                                  </Popover>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    );
};
