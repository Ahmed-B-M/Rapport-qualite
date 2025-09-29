
'use client';

interface ReportSectionProps {
    title: string;
    description: string;
    children: React.ReactNode;
}

export const ReportSection = ({ title, description, children }: ReportSectionProps) => {
    return (
        <section className="mb-8 p-4 border rounded-lg page-break-before">
            <h2 className="text-2xl font-semibold mb-1 text-gray-800">{title}</h2>
            <p className="text-sm text-gray-500 mb-4">{description}</p>
            {children}
        </section>
    );
};
