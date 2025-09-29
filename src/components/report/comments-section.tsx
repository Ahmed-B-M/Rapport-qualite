
'use client';

import { ExempleCommentaire } from "@/lib/definitions";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface CommentsSectionProps {
    positiveComments: ExempleCommentaire[];
    negativeComments: ExempleCommentaire[];
}

const CommentCard = ({ title, comments, icon: Icon, iconColorClass }: { title: string, comments: ExempleCommentaire[], icon: React.ElementType, iconColorClass: string }) => {
    return (
        <div>
            <h4 className="font-semibold text-lg flex items-center mb-2">
                <Icon className={`mr-2 ${iconColorClass}`} /> {title}
            </h4>
            <div className="space-y-3">
                {comments.map((c, i) => (
                    <div key={i} className="bg-gray-50 p-3 rounded-md border text-sm">
                        <p className="italic">"{c.commentaire}"</p>
                        <p className="text-right font-medium text-xs mt-1">- {c.chauffeur} (Note: {c.note}/5)</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const CommentsSection = ({ positiveComments, negativeComments }: CommentsSectionProps) => {
    return (
        <div className="grid grid-cols-2 gap-8">
            <CommentCard title="Meilleurs Commentaires" comments={positiveComments} icon={ThumbsUp} iconColorClass="text-green-500" />
            <CommentCard title="Pires Commentaires" comments={negativeComments} icon={ThumbsDown} iconColorClass="text-red-500" />
        </div>
    );
};
