
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProjectInfo, Division } from '../types';

export const generatePdf = (
    projectInfo: ProjectInfo,
    divisions: Division[],
    subTotal: number,
    marginAmount: number,
    grandTotal: number,
    isClientView: boolean,
    showOverhead: boolean = true,
    orientation: 'p' | 'l' = 'p',
    showDetailedWeights: boolean = false
) => {
    console.log("generatePdf called", { projectInfo, divisions, subTotal, marginAmount, grandTotal, isClientView, showOverhead, orientation, showDetailedWeights });
    try {
        const doc = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: 'a4'
        });
        
        const pageWidth = orientation === 'l' ? 297 : 210;
        const pageHeight = orientation === 'l' ? 210 : 297;
        
        console.log("jsPDF instance created with orientation:", orientation);
        
        const overheadRate = showOverhead ? projectInfo.add : 0;

    const ownerAllowanceItems: any[] = [];
  
    divisions.forEach(div => {
        div.items.forEach(item => {
            if (item.ownerAllowance) {
                ownerAllowanceItems.push({ ...item, divisionTitle: div.title });
            }
        });
    });

    const allowanceTotal = ownerAllowanceItems.reduce((acc, item) => {
        const itemBaseTotal = item.material + item.labor + item.equipment + item.subContract;
        const itemTotalWithOverhead = itemBaseTotal * (1 + overheadRate / 100);
        return acc + itemTotalWithOverhead;
    }, 0);
    
    // Header Branding/Title (Indigo Banner)
    doc.setFillColor(63, 81, 181); // Indigo color
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Primary Heading: Job Name
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    const jobTitle = projectInfo.jobName || "UNNAMED PROJECT";
    doc.text(jobTitle.toUpperCase(), 14, 20);
    
    // Subheading: Address
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const addressLine = projectInfo.address || "No address provided";
    doc.text(addressLine, 14, 30);

    // Decorative Tag: "COST ESTIMATE"
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(199, 210, 254); // Light indigo text
    doc.text("CONSTRUCTION COST ESTIMATE", 14, 40);

    // Date and Document ID area (Right aligned in header)
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 14, 20, { align: 'right' });
    
    // Project Specifications Section (Light Gray Bar)
    doc.setFillColor(245, 247, 250);
    doc.rect(0, 45, pageWidth, 25, 'F');
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text("PROJECT SPECIFICATIONS", 14, 54);
    
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.setFont("helvetica", "normal");
    doc.text(`Total Area: ${projectInfo.squareFeet.toLocaleString()} SQFT`, 14, 62);
    doc.text(`Total Rooms: ${projectInfo.rooms}`, 80, 62);

    const head = isClientView
        ? [['Service', 'Description', 'Total']]
        : (showDetailedWeights 
            ? [['Cost Code', 'Service', 'Material', 'Labor', 'Equip', 'Sub', 'Total']]
            : [['Cost Code', 'Service', 'Description', 'Total']]);
    
    const body: any[] = [];

    divisions.forEach(div => {
        const itemsToInclude = div.items.filter(item => 
            (item.material + item.labor + item.equipment + item.subContract) > 0 || (item.service.trim() !== '' && item.description.trim() !== '')
        );

        if (itemsToInclude.length > 0) {
            const divisionTotal = itemsToInclude.reduce((acc, item) => {
                const baseTotal = item.material + item.labor + item.equipment + item.subContract;
                return acc + (baseTotal * (1 + overheadRate / 100));
            }, 0);

            // Add division header row
            body.push([
                {
                    content: `${div.costCode} - ${div.title}`,
                    colSpan: isClientView ? 2 : (showDetailedWeights ? 6 : 3),
                    styles: { fontStyle: 'bold' as any, fillColor: [241, 245, 249], textColor: [30, 41, 59], cellPadding: 3 }
                },
                {
                    content: divisionTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
                    styles: { fontStyle: 'bold' as any, halign: 'right' as any, fillColor: [241, 245, 249], textColor: [30, 41, 59], cellPadding: 3 }
                }
            ]);

            // Add line item rows
            itemsToInclude.forEach(item => {
                const itemBaseTotal = item.material + item.labor + item.equipment + item.subContract;
                const itemTotalWithOverhead = itemBaseTotal * (1 + overheadRate / 100);
                
                const serviceName = item.ownerAllowance ? `${item.service} (Allowance)` : item.service;

                if (isClientView) {
                    body.push([
                        serviceName,
                        item.description,
                        itemTotalWithOverhead.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                    ]);
                } else if (showDetailedWeights) {
                    const factor = (1 + overheadRate / 100);
                    body.push([
                        item.costCode,
                        serviceName,
                        (item.material * factor).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
                        (item.labor * factor).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
                        (item.equipment * factor).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
                        (item.subContract * factor).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
                        itemTotalWithOverhead.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                    ]);
                } else {
                    body.push([
                        item.costCode,
                        serviceName,
                        item.description,
                        itemTotalWithOverhead.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                    ]);
                }
            });
        }
    });

    let finalY = 75;
    if (body.length > 0) {
        autoTable(doc, {
            startY: 75,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [63, 81, 181], textColor: 255, fontStyle: 'bold' as any },
            styles: {
                cellPadding: 3,
                fontSize: 8, // Smaller font for detailed view
                lineColor: [226, 232, 240]
            },
            columnStyles: isClientView
                ? { 
                    0: { cellWidth: orientation === 'l' ? 80 : 60 },
                    1: { cellWidth: 'auto' },
                    2: { halign: 'right', cellWidth: orientation === 'l' ? 50 : 40, fontStyle: 'bold' } 
                }
                : (showDetailedWeights 
                    ? {
                        0: { cellWidth: 15 },
                        1: { cellWidth: orientation === 'l' ? 70 : 40 },
                        2: { halign: 'right', cellWidth: orientation === 'l' ? 35 : 25 },
                        3: { halign: 'right', cellWidth: orientation === 'l' ? 35 : 25 },
                        4: { halign: 'right', cellWidth: orientation === 'l' ? 35 : 25 },
                        5: { halign: 'right', cellWidth: orientation === 'l' ? 35 : 25 },
                        6: { halign: 'right', cellWidth: orientation === 'l' ? 40 : 30, fontStyle: 'bold' }
                      }
                    : {
                        0: { cellWidth: 25 },
                        1: { cellWidth: orientation === 'l' ? 70 : 50 },
                        2: { cellWidth: 'auto' },
                        3: { halign: 'right', cellWidth: orientation === 'l' ? 50 : 40, fontStyle: 'bold' }
                      }),
            didDrawPage: (data: any) => {
                finalY = data.cursor.y;
            }
        });
    } else {
        doc.setFontSize(12);
        doc.setTextColor(100, 116, 139);
        doc.text("No line items recorded for this estimate.", 14, 85);
        finalY = 90;
    }

    // Calculations for metrics
    const sqftSize = projectInfo.squareFeet > 0 ? projectInfo.squareFeet : 1;
    
    // Sitework Calculation for PDF
    const siteworkDivs = divisions.filter(d => 
        d.costCode.startsWith('31') || 
        d.costCode.startsWith('32') || 
        d.costCode.startsWith('33')
    );
    const siteworkBase = siteworkDivs.reduce((acc, div) => {
        return acc + div.items.reduce((sum, item) => sum + (Number(item.material) + Number(item.labor) + Number(item.equipment) + Number(item.subContract)), 0);
    }, 0);
    const siteworkGrandTotal = (siteworkBase * overheadRate) * (1 + projectInfo.margin / 100);

    const totalCostPerSqFt = grandTotal / sqftSize;
    const siteworkCostPerSqFt = siteworkGrandTotal / sqftSize;
    const buildingOnlyCostPerSqFt = (grandTotal - siteworkGrandTotal) / sqftSize;
    const costPerRoom = projectInfo.rooms > 0 ? grandTotal / projectInfo.rooms : 0;

    // Summary Section
    let summaryY = finalY + 15;

    // Ensure summary doesn't overflow page
    if (summaryY > pageHeight - 60) {
        doc.addPage();
        summaryY = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Estimate Summary", 14, summaryY);

    const subtotalLabel = showOverhead ? 'Subtotal (incl. Overhead)' : 'Subtotal (Excl. Overhead)';

    const summaryTable = [
        [subtotalLabel, subTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })],
        [`Margin (${projectInfo.margin}%)`, marginAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })],
        ['Grand Total', { content: grandTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), styles: { fontStyle: 'bold', fontSize: 12, textColor: [63, 81, 181] } as any }],
        ['Total Allowances (Included Above)', allowanceTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })],
        ['Total Cost per SQFT', totalCostPerSqFt.toLocaleString('en-US', { style: 'currency', currency: 'USD' })],
        ['Sitework per SQFT (Div 31-33)', siteworkCostPerSqFt.toLocaleString('en-US', { style: 'currency', currency: 'USD' })],
        ['Building per SQFT (Excl. Sitework)', buildingOnlyCostPerSqFt.toLocaleString('en-US', { style: 'currency', currency: 'USD' })],
        ['Cost per Room', costPerRoom.toLocaleString('en-US', { style: 'currency', currency: 'USD' })]
    ];
    
    autoTable(doc, {
        startY: summaryY + 5,
        body: summaryTable,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: {
            0: { halign: 'right', cellWidth: pageWidth - 70, textColor: [100, 116, 139] },
            1: { halign: 'right', cellWidth: 40, textColor: [30, 41, 59] }
        }
    });

    // Add Owner Specific Sections if items exist
    if (ownerAllowanceItems.length > 0) {
        doc.addPage();
        let currentY = 20;

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(63, 81, 181);
        doc.text("Owner Items Reference", 14, currentY);
        currentY += 10;

        if (ownerAllowanceItems.length > 0) {
            doc.setFontSize(12);
            doc.setTextColor(30, 41, 59);
            doc.text("Owner Allowances", 14, currentY);
            currentY += 5;

            const allowanceBody = ownerAllowanceItems.map(item => {
                const itemBaseTotal = item.material + item.labor + item.equipment + item.subContract;
                const itemTotalWithOverhead = itemBaseTotal * (1 + overheadRate / 100);
                return [
                    item.divisionTitle,
                    item.service,
                    item.description || 'N/A',
                    itemTotalWithOverhead.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                ];
            });

            autoTable(doc, {
                startY: currentY,
                head: [['Division', 'Item', 'Description', 'Total']],
                body: allowanceBody,
                theme: 'striped',
                headStyles: { fillColor: [63, 81, 181], textColor: 255 },
                styles: { fontSize: 9 },
                columnStyles: {
                    3: { halign: 'right' }
                },
                didDrawPage: (data: any) => {
                    currentY = data.cursor.y + 10;
                }
            });

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(`Total Allowances: ${allowanceTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`, pageWidth - 14, currentY, { align: 'right' });
        }
    }

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 25, pageHeight - 7);
        doc.text(`Document generated for ${projectInfo.jobName} on ${new Date().toLocaleDateString()}`, 14, pageHeight - 7);
    }

    doc.save(`${projectInfo.jobName.replace(/\s+/g, '_')}_Estimate.pdf`);
    console.log("PDF saved successfully");
    } catch (error) {
        console.error("PDF generation failed:", error);
    }
};
