
'use client';

export const renderCell = (taux: number, nombre: number) => (
    <div className="text-right">
        <div>{taux.toFixed(2)}%</div>
        <div className="text-xs text-muted-foreground">({nombre})</div>
    </div>
);

export const renderNoteCell = (note: number | undefined, nombre: number) => (
    <div className="text-right">
        <div>{note ? note.toFixed(2) : 'N/A'}</div>
        <div className="text-xs text-muted-foreground">({nombre})</div>
    </div>
);
