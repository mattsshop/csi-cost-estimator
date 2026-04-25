
import ExcelJS from 'exceljs';
import { ProjectData } from '../types';

export const generateExcel = async (
    projectData: ProjectData,
    subTotal: number,
    marginAmount: number,
    grandTotal: number
): Promise<Buffer> => {
    const { projectInfo, divisions } = projectData;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Budget');

    // Column widths based on layout
    sheet.columns = [
        { width: 12 },  // A: Cost Code
        { width: 30 },  // B: Service
        { width: 45 },  // C: Description
        { width: 15 },  // D: Material
        { width: 15 },  // E: Labor
        { width: 15 },  // F: Equipment
        { width: 15 },  // G: Sub-Contract
        { width: 18 },  // H: Total
        { width: 4 },   // I: X
        { width: 18 },  // J: Cost
    ];

    // --- Styles ---
    const colors = {
        primaryBlue: 'FF1E40AF',
        headerBlue: 'FF3366FF',
        divisionBlue: 'FFCBD5E1',
        white: 'FFFFFFFF',
        gray50: 'FFF8FAFC',
        gray100: 'FFF1F5F9',
        gray200: 'FFE2E8F0',
        gray400: 'FF94A3B8',
        gray700: 'FF334155',
        red: 'FFB91C1C',
        green: 'FF15803D'
    };

    const headerBarStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, color: { argb: colors.white }, size: 14 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBlue } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { bottom: { style: 'medium', color: { argb: '000000' } } }
    };

    const totalAmountStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, size: 16 },
        alignment: { horizontal: 'center', vertical: 'middle' },
        numFmt: '"$"#,##0.00'
    };

    const labelStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, size: 10 },
        alignment: { horizontal: 'left' }
    };

    const valueStyle: Partial<ExcelJS.Style> = {
        font: { size: 10 },
        alignment: { horizontal: 'left' }
    };

    const tableHeaderStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, size: 10, color: { argb: colors.gray700 } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.gray100 } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { 
            bottom: { style: 'thin', color: { argb: colors.gray400 } },
            top: { style: 'thin', color: { argb: colors.gray400 } }
        }
    };

    const divisionRowStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, size: 11, color: { argb: colors.primaryBlue } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.gray100 } },
        alignment: { horizontal: 'left' }
    };

    const currencyStyle: Partial<ExcelJS.Style> = {
        numFmt: '"$"#,##0.00',
        font: { size: 10 }
    };

    const currencySubtotalStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, size: 10 },
        numFmt: '"$"#,##0.00',
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.gray50 } }
    };

    const xColumnStyle: Partial<ExcelJS.Style> = {
        alignment: { horizontal: 'center' },
        font: { size: 9, color: { argb: colors.gray400 } }
    };

    // --- Header Section ---
    
    // Top Utility Buttons simulation or just blank space
    sheet.addRow([]);
    sheet.mergeCells('D1:E1');
    sheet.getCell('D1').value = 'Hide for Client';
    sheet.getCell('D1').style = { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.green } }, font: { color: { argb: colors.white }, size: 9 }, alignment: { horizontal: 'center' } };
    
    sheet.mergeCells('F1:G1');
    sheet.getCell('F1').value = 'Internal Use Only';
    sheet.getCell('F1').style = { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.red } }, font: { color: { argb: colors.white }, size: 9 }, alignment: { horizontal: 'center' } };

    sheet.addRow([]);

    // Cost to Complete Bar
    sheet.mergeCells('A3:H3');
    const titleCell = sheet.getCell('A3');
    titleCell.value = 'Cost to Complete';
    titleCell.style = headerBarStyle;

    // Total Amount merged
    sheet.mergeCells('A4:H4');
    const totalCell = sheet.getCell('A4');
    totalCell.value = grandTotal;
    totalCell.style = totalAmountStyle;
    sheet.getCell('A4').numFmt = '"$"#,##0.00';

    // Info Grid
    const infoRows = [
        { labelLeft: 'Job Name:', valueLeft: projectInfo.jobName, labelRight: 'Margin', valueRight: (projectInfo.margin / 100), fmtRight: '0%' },
        { labelLeft: 'Address:', valueLeft: projectInfo.address, labelRight: 'Add', valueRight: (projectInfo.add / 100), fmtRight: '0%' },
        { labelLeft: 'Rooms', valueLeft: projectInfo.rooms, labelRight: 'Cost Per Room:', valueRight: { formula: `H4/B7`, result: grandTotal / (projectInfo.rooms || 1) }, fmtRight: '"$"#,##0' },
        { labelLeft: 'Square Feet', valueLeft: projectInfo.squareFeet, labelRight: 'Cost Per SF:', valueRight: { formula: `H4/B8`, result: grandTotal / (projectInfo.squareFeet || 1) }, fmtRight: '"$"#,##0' },
    ];

    infoRows.forEach((item, idx) => {
        const row = sheet.addRow([]);
        const rNum = row.number;
        
        sheet.getCell(`A${rNum}`).value = item.labelLeft;
        sheet.getCell(`A${rNum}`).style = labelStyle;
        
        sheet.mergeCells(`B${rNum}:E${rNum}`);
        sheet.getCell(`B${rNum}`).value = item.valueLeft;
        sheet.getCell(`B${rNum}`).style = valueStyle;
        if (typeof item.valueLeft === 'number') {
            sheet.getCell(`B${rNum}`).numFmt = '#,##0';
            sheet.getCell(`B${rNum}`).alignment = { horizontal: 'left' };
        }

        sheet.getCell(`G${rNum}`).value = item.labelRight;
        sheet.getCell(`G${rNum}`).style = labelStyle;
        sheet.getCell(`G${rNum}`).alignment = { horizontal: 'right' };

        sheet.getCell(`H${rNum}`).value = item.valueRight;
        sheet.getCell(`H${rNum}`).style = valueStyle;
        sheet.getCell(`H${rNum}`).numFmt = item.fmtRight;
        sheet.getCell(`H${rNum}`).alignment = { horizontal: 'right' };
        
        sheet.getCell(`I${rNum}`).value = 'X';
        sheet.getCell(`I${rNum}`).style = xColumnStyle;
    });

    sheet.addRow([]); // Blank line

    // --- Table Header ---
    const tableHeader = sheet.addRow(['Cost Code', 'Service', 'Description', 'Material', 'Labor', 'Equipment', 'Sub-Contract', 'Total', 'X', 'Cost']);
    tableHeader.eachCell((cell) => {
        cell.style = tableHeaderStyle;
    });

    let currentIdx = sheet.lastRow!.number + 1;
    const subtotalRefs: string[] = [];
    const costSubtotalRefs: string[] = [];

    divisions.forEach(div => {
        const activeItems = div.items.filter(item => 
            item.material > 0 || item.labor > 0 || item.equipment > 0 || item.subContract > 0 || item.service.trim().length > 0
        );

        if (activeItems.length > 0) {
            // Division Header
            const divRow = sheet.addRow([`${div.costCode} ${div.title}`]);
            sheet.mergeCells(divRow.number, 1, divRow.number, 8);
            divRow.getCell(1).style = divisionRowStyle;
            sheet.getCell(`I${divRow.number}`).value = 'X';
            sheet.getCell(`I${divRow.number}`).style = xColumnStyle;
            currentIdx++;

            const startItemIdx = currentIdx;

            activeItems.forEach(item => {
                const row = sheet.addRow([
                    item.costCode,
                    item.service,
                    item.description,
                    item.material === 0 ? '-' : item.material,
                    item.labor === 0 ? '-' : item.labor,
                    item.equipment === 0 ? '-' : item.equipment,
                    item.subContract === 0 ? '-' : item.subContract,
                    { formula: `SUM(D${currentIdx}:G${currentIdx})` },
                    'X',
                    { formula: `H${currentIdx}*(1+$H$6)` }
                ]);

                // Styles
                row.getCell(1).alignment = { horizontal: 'left' };
                row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                row.getCell(4).style = currencyStyle;
                row.getCell(5).style = currencyStyle;
                row.getCell(6).style = currencyStyle;
                row.getCell(7).style = currencyStyle;
                row.getCell(8).style = currencyStyle;
                row.getCell(9).style = xColumnStyle;
                row.getCell(10).style = currencyStyle;

                if (currentIdx % 2 === 0) {
                    row.eachCell(cell => {
                        if (!cell.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.gray50 } };
                    });
                }

                currentIdx++;
            });

            // Division Footer/Summary
            const endItemIdx = currentIdx - 1;
            const divFooter = sheet.addRow([`Total ${div.costCode} ${div.title}`, '', '', '', '', '', '', { formula: `SUM(H${startItemIdx}:H${endItemIdx})` }, 'X', { formula: `SUM(J${startItemIdx}:J${endItemIdx})` }]);
            divFooter.height = 24; 
            divFooter.eachCell((cell) => {
                if (cell.address.startsWith('H') || cell.address.startsWith('J')) {
                    cell.style = currencySubtotalStyle;
                } else if (cell.address.startsWith('A')) {
                    cell.style = { font: { bold: true, size: 10 } };
                } else if (cell.address.startsWith('I')) {
                    cell.style = xColumnStyle;
                }
            });
            
            subtotalRefs.push(`H${divFooter.number}`);
            costSubtotalRefs.push(`J${divFooter.number}`);
            
            sheet.addRow(['', '', '', '', '', '', '', '', 'X', '']); // Buffer X
            currentIdx += 2;
        }
    });

    // --- Final Totals (Project Subtotals) ---
    sheet.addRow([]);
    currentIdx++;

    const subTotalLabelRow = sheet.addRow(['Project Subtotals']);
    subTotalLabelRow.getCell(1).style = { font: { bold: true, color: { argb: colors.headerBlue } } };
    currentIdx++;

    const subTotalRow = sheet.addRow(['Sub Total 01 00 00 - 33 00 00', '', '', { formula: `SUM(D12:D${currentIdx})` }, { formula: `SUM(E12:E${currentIdx})` }, { formula: `SUM(F12:F${currentIdx})` }, { formula: `SUM(G12:G${currentIdx})` }, { formula: `SUM(${subtotalRefs.join(',')})` }, 'X', { formula: `SUM(${costSubtotalRefs.join(',')})` }]);
    subTotalRow.getCell(1).style = { font: { bold: true, size: 10 } };
    for (let i = 4; i <= 10; i++) {
        if (i !== 9) subTotalRow.getCell(i).style = currencySubtotalStyle;
        else subTotalRow.getCell(i).style = xColumnStyle;
    }
    const subTotalRef = `H${subTotalRow.number}`;
    const costSubTotalRef = `J${subTotalRow.number}`;

    const marginRow = sheet.addRow(['Company Overhead', '', '', '', '', '', '', { formula: `${subTotalRef}*$H$5` }, 'X', { formula: `${costSubTotalRef}*$H$5` }]);
    marginRow.getCell(1).style = { font: { bold: true, size: 10 } };
    marginRow.getCell(8).style = currencySubtotalStyle;
    marginRow.getCell(9).style = xColumnStyle;
    marginRow.getCell(10).style = currencySubtotalStyle;
    const marginRef = `H${marginRow.number}`;
    const costMarginRef = `J${marginRow.number}`;

    const totalCostRow = sheet.addRow(['Total Cost 01 00 00 - 33 00 00', '', '', '', '', '', '', { formula: `${subTotalRef}+${marginRef}` }, 'X', { formula: `${costSubTotalRef}+${costMarginRef}` }]);
    totalCostRow.getCell(1).style = { font: { bold: true, size: 11 } };
    totalCostRow.getCell(8).style = totalAmountStyle;
    totalCostRow.getCell(10).style = totalAmountStyle;
    totalCostRow.getCell(9).style = xColumnStyle;

    sheet.addRow(['', '', '', '', '', '', '', '', 'X', '']);
    
    return await workbook.xlsx.writeBuffer() as Buffer;
};
