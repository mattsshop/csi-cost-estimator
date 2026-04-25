
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProjectInfo, Division, LineItem } from '../types';

export const generateMissingPricesPdf = (
    projectInfo: ProjectInfo,
    divisions: Division[]
) => {
    console.log("generateMissingPricesPdf called", { projectInfo, divisions });
    try {
        const doc = new jsPDF();
        console.log("jsPDF instance created");
        
        // Header
    doc.setFillColor(220, 38, 38); // Red color for attention
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("MISSING PRICES REVIEW", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Project: ${projectInfo.jobName}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 196, 30, { align: 'right' });

    const missingItems: any[] = [];
    
    divisions.forEach(div => {
        div.items.forEach(item => {
            const total = item.material + item.labor + item.equipment + item.subContract;
            if (total === 0) {
                missingItems.push({
                    division: div.title,
                    costCode: item.costCode,
                    service: item.service,
                    isCritical: item.isCritical ? 'YES' : 'NO',
                    criticalRaw: item.isCritical
                });
            }
        });
    });

    if (missingItems.length === 0) {
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text("All items have prices assigned. Great job!", 14, 50);
    } else {
        const head = [['Division', 'Cost Code', 'Service', 'Critical?']];
        const body = missingItems.map(item => [
            item.division,
            item.costCode,
            item.service,
            item.isCritical
        ]);

        console.log("Calling autoTable with missing items:", body.length);
        autoTable(doc, {
            startY: 50,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' as any },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                3: { halign: 'center' as any, fontStyle: 'bold' as any }
            },
            didParseCell: (data: any) => {
                // Highlight critical items in red
                if (data.section === 'body' && data.column.index === 3 && data.cell.raw === 'YES') {
                    data.cell.styles.textColor = [220, 38, 38];
                }
                // If it's a critical row, maybe highlight the whole row or just the text
                const rowIndex = data.row.index;
                if (data.section === 'body' && missingItems[rowIndex].criticalRaw) {
                    data.cell.styles.fillColor = [254, 242, 242]; // Very light red background
                }
            }
        });
    }

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, 210 - 25, 290);
    }

    doc.save(`${projectInfo.jobName.replace(/\s+/g, '_')}_Missing_Prices.pdf`);
    console.log("Missing prices PDF saved successfully");
    } catch (error) {
        console.error("Missing prices PDF generation failed:", error);
    }
};
