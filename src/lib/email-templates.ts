
import { CATEGORIES_PROBLEMES } from "./definitions";

interface PivotData {
    [driver: string]: {
      total: number;
      depot: string;
      sumOfRatings: number;
      numberOfRatings: number;
    } & {
      [transporter: string]: number | string;
    };
  }
  
  interface CategoryPivotData {
      [driver: string]: {
          total: number;
          depot: string;
      } & {
          [category in typeof CATEGORIES_PROBLEMES[number]]?: number
      };
  }

export const generateSatisfactionEmailBody = (
    lowRatingPivotData: PivotData, 
    categoryPivotData: CategoryPivotData, 
    uniqueTransporters: string[]
): string => {
    const depots = [...new Set(Object.values(lowRatingPivotData).map(d => d.depot))];
    const magasinDepots = depots.filter(d => d.toLowerCase().includes('magasin'));
    const otherDepots = depots.filter(d => !d.toLowerCase().includes('magasin'));
    const sortedDepots = [...otherDepots.sort(), ...magasinDepots.sort()];

    let body = `
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; color: #333; line-height: 1.5; }
            .container { max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #f9f9f9; }
            h1 { color: #2c3e50; font-size: 24px; text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-bottom: 20px; }
            h2 { color: #3498db; font-size: 20px; margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            h3 { color: #2980b9; font-size: 16px; margin-top: 20px; }
            p { margin-bottom: 15px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; font-size: 14px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #ecf0f1; font-weight: bold; }
            tr:nth-child(even) { background-color: #fdfdfd; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Synthèse de la Satisfaction Client</h1>
            <p>Bonjour,</p>
            <p>Je vous envoie ci-dessous un résumé de la satisfaction client pour la période sélectionnée.</p>
    `;

    sortedDepots.forEach(depot => {
        body += `<h2>${depot}</h2>`;

        const depotLowRatingDrivers = Object.entries(lowRatingPivotData).filter(([_, data]) => data.depot === depot && data.total > 0);
        if (depotLowRatingDrivers.length > 0) {
            body += `<h3>Récurrence des notes inférieures ou égales à 3</h3>`;
            body += '<table><thead><tr><th>Livreur/Transporteur</th>';
            uniqueTransporters.forEach(t => body += `<th>${t}</th>`);
            body += '<th>Total</th></tr></thead><tbody>';
            
            depotLowRatingDrivers.sort(([, a], [, b]) => b.total - a.total).forEach(([driver, data]) => {
                const avgRating = (data.sumOfRatings / data.numberOfRatings).toFixed(2);
                const totalRatings = data.numberOfRatings;
                body += `<tr><td>${driver} (note moyenne: ${avgRating} / ${totalRatings} notes)</td>`;
                uniqueTransporters.forEach(t => body += `<td style="text-align: center;">${data[t] || ''}</td>`);
                body += `<td style="text-align: center; font-weight: bold;">${data.total}</td></tr>`;
            });

            body += '</tbody></table>';
        } else {
            body += `<p>Aucune récurrence de note basse pour ce dépôt.</p>`
        }

        const depotCategoryDrivers = Object.entries(categoryPivotData).filter(([_, data]) => data.depot === depot);
        if(depotCategoryDrivers.length > 0) {
            body += `<h3>Récurrence par catégorie de problème</h3>`;
            body += '<table><thead><tr><th>Livreur</th>';
            CATEGORIES_PROBLEMES.forEach(cat => body += `<th>${cat.charAt(0).toUpperCase() + cat.slice(1)}</th>`);
            body += '<th>Total</th></tr></thead><tbody>';

            depotCategoryDrivers.sort(([, a], [, b]) => b.total - a.total).forEach(([driver, data]) => {
                body += `<tr><td>${driver}</td>`;
                CATEGORIES_PROBLEMES.forEach(cat => body += `<td style="text-align: center;">${data[cat] || ''}</td>`);
                body += `<td style="text-align: center; font-weight: bold;">${data.total}</td></tr>`;
            });

            body += '</tbody></table>';
        } else {
            body += `<p>Aucune récurrence par catégorie pour ce dépôt.</p>`
        }
    });

    body += `
          <div class="footer">
            <p>Ce rapport a été généré automatiquement.</p>
          </div>
        </div>
      </body>
    </html>`;

    return body;
};
