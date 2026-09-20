import ExcelJS from 'exceljs';
import { ProjectData, ProjectInfo, Division, LineItem } from '../types';

/**
 * Parses an existing estimate workbook (the "COST DETAIL" layout produced by
 * excelService.ts, or a hand-maintained sheet using the same columns) back into
 * the app's ProjectData shape.
 *
 * The parser is positional-free: it locates the table by its header row and maps
 * columns by name, so extra columns (e.g. "Phase"), extra header rows, or a
 * renamed sheet will not break it.
 */

export interface ImportResult {
    projectData: ProjectData;
    stats: {
        divisions: number;
        items: number;
        subTotal: number;
        skippedRows: number;
    };
    warnings: string[];
}

// ---------------------------------------------------------------------------
// Cell helpers
// ---------------------------------------------------------------------------

/** ExcelJS cells can be strings, numbers, dates, formulas, rich text or errors. */
const cellText = (value: ExcelJS.CellValue): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim();
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (value instanceof Date) return value.toISOString();

    const v = value as any;
    if (v.richText) return cellText(v.richText.map((t: any) => t.text).join(''));
    if (v.text !== undefined) return cellText(v.text);
    if (v.result !== undefined) return cellText(v.result);
    if (v.formula !== undefined) return '';
    if (v.error !== undefined) return '';
    return '';
};

/** Normalised lookup key: lowercase, alphanumerics and spaces only. */
const cellKey = (value: ExcelJS.CellValue): string =>
    cellText(value).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

/** Tolerant number parse: handles "$1,234.00", "(500)", "-", "" and formula results. */
const cellNumber = (value: ExcelJS.CellValue): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return isFinite(value) ? value : 0;

    const v = value as any;
    if (typeof v === 'object' && v.result !== undefined) return cellNumber(v.result);

    const raw = cellText(value);
    if (!raw) return 0;

    const cleaned = raw.replace(/[^0-9.\-()]/g, '');
    if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '()') return 0;

    const negative = cleaned.startsWith('(');
    const parsed = parseFloat(cleaned.replace(/[()]/g, ''));
    if (!isFinite(parsed)) return 0;
    return negative ? -parsed : parsed;
};

// ---------------------------------------------------------------------------
// Header / column mapping
// ---------------------------------------------------------------------------

type ColumnField =
    | 'costCode' | 'service' | 'description'
    | 'material' | 'labor' | 'equipment' | 'subContract'
    | 'total' | 'cost' | 'phase';

const HEADER_ALIASES: Record<string, ColumnField> = {
    'cost code': 'costCode', 'code': 'costCode', 'csi code': 'costCode', 'csi': 'costCode',
    'service': 'service', 'item': 'service', 'scope': 'service', 'trade': 'service',
    'description': 'description', 'notes': 'description', 'scope of work': 'description',
    'material': 'material', 'materials': 'material', 'mat': 'material',
    'labor': 'labor', 'labour': 'labor',
    'equipment': 'equipment', 'equip': 'equipment',
    'subcontract': 'subContract', 'sub contract': 'subContract', 'sub': 'subContract',
    'subs': 'subContract', 'subcontractor': 'subContract',
    'total': 'total',
    'cost': 'cost',
    'phase': 'phase',
};

const PROJECT_INFO_LABELS: Record<string, keyof ProjectInfo> = {
    'job name': 'jobName', 'job': 'jobName', 'project': 'jobName', 'project name': 'jobName',
    'address': 'address', 'job address': 'address', 'location': 'address',
    'rooms': 'rooms', 'room count': 'rooms', 'keys': 'rooms',
    'square feet': 'squareFeet', 'sf': 'squareFeet', 'sq ft': 'squareFeet', 'gsf': 'squareFeet',
    'margin': 'margin',
    'add': 'add',
};

const MAX_SCAN_COLUMNS = 40;
const MAX_HEADER_SCAN_ROWS = 60;

interface SheetTable {
    sheet: ExcelJS.Worksheet;
    headerRow: number;
    columns: Partial<Record<ColumnField, number>>;
}

const locateTable = (workbook: ExcelJS.Workbook): SheetTable | null => {
    let found: SheetTable | null = null;

    workbook.eachSheet((sheet) => {
        if (found) return;
        const lastRow = Math.min(sheet.rowCount || 0, MAX_HEADER_SCAN_ROWS);

        for (let r = 1; r <= lastRow; r++) {
            const row = sheet.getRow(r);
            const columns: Partial<Record<ColumnField, number>> = {};

            for (let c = 1; c <= MAX_SCAN_COLUMNS; c++) {
                const field = HEADER_ALIASES[cellKey(row.getCell(c).value)];
                if (field && columns[field] === undefined) columns[field] = c;
            }

            const hasLabels = columns.costCode !== undefined && columns.service !== undefined;
            const hasMoney = columns.material !== undefined || columns.total !== undefined;
            if (hasLabels && hasMoney) {
                found = { sheet, headerRow: r, columns };
                return;
            }
        }
    });

    return found;
};

// ---------------------------------------------------------------------------
// Project info block (everything above the table header)
// ---------------------------------------------------------------------------

const readProjectInfo = (table: SheetTable): ProjectInfo => {
    const info: ProjectInfo = {
        jobName: '', address: '', rooms: 0, squareFeet: 0, margin: 0, add: 0,
    };

    for (let r = 1; r < table.headerRow; r++) {
        const row = table.sheet.getRow(r);

        for (let c = 1; c <= MAX_SCAN_COLUMNS; c++) {
            const field = PROJECT_INFO_LABELS[cellKey(row.getCell(c).value)];
            if (!field) continue;

            // Take the first non-empty cell to the right of the label.
            for (let c2 = c + 1; c2 <= MAX_SCAN_COLUMNS; c2++) {
                const raw = row.getCell(c2).value;
                const text = cellText(raw);
                if (!text) continue;

                if (field === 'jobName' || field === 'address') {
                    info[field] = text;
                } else {
                    let n = cellNumber(raw);
                    // Margin/Add are stored as percentages (0.05) in the sheet
                    // but as whole numbers (5) in the app.
                    if ((field === 'margin' || field === 'add') && n > 0 && n <= 1) n *= 100;
                    if (n) info[field] = Math.round(n * 1000) / 1000;
                }
                break;
            }
        }
    }

    return info;
};

// ---------------------------------------------------------------------------
// Row classification
// ---------------------------------------------------------------------------

/** "01 00 00 General Conditions" -> division banner; "01 00 00" alone -> line item. */
const DIVISION_BANNER = /^(\d{2})\s*[- ]?\s*00\s*[- ]?\s*00\b(.*)$/;
const SUMMARY_ROW = /^(total|totals|sub ?total|project sub|company overhead|grand total|contingency total)/;
const ALLOWANCE = /^allowance\b/i;

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${(++idCounter).toString(36)}`;

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export const importEstimateFromExcel = async (file: File): Promise<ImportResult> => {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const table = locateTable(workbook);
    if (!table) {
        throw new Error(
            'Could not find an estimate table in this workbook. ' +
            'The sheet needs a header row containing "Cost Code", "Service" and the cost columns.'
        );
    }

    const { sheet, columns, headerRow } = table;
    const projectInfo = readProjectInfo(table);

    const divisions: Division[] = [];
    const warnings: string[] = [];
    let current: Division | null = null;
    let skippedRows = 0;

    const lastRow = sheet.rowCount || headerRow;

    for (let r = headerRow + 1; r <= lastRow; r++) {
        const row = sheet.getRow(r);
        const at = (field: ColumnField): ExcelJS.CellValue =>
            columns[field] === undefined ? null : row.getCell(columns[field]!).value;

        const code = cellText(at('costCode'));
        const service = cellText(at('service'));
        const description = cellText(at('description'));

        const material = cellNumber(at('material'));
        const labor = cellNumber(at('labor'));
        const equipment = cellNumber(at('equipment'));
        const subContract = cellNumber(at('subContract'));
        const total = cellNumber(at('total'));
        const hasMoney = !!(material || labor || equipment || subContract || total);

        // Blank spacer row.
        if (!code && !service && !description && !hasMoney) continue;

        // "Total 03 00 00 Concrete", "Sub Total ...", "Company Overhead".
        if (SUMMARY_ROW.test(cellKey(at('costCode'))) || SUMMARY_ROW.test(cellKey(at('service')))) {
            skippedRows++;
            continue;
        }

        const banner = DIVISION_BANNER.exec(code);
        const bannerTitle = banner ? banner[2].trim() : '';

        // A title inside the cost-code cell means a banner row. With dollars on
        // it, it is the division's subtotal footer; without, it opens a division.
        if (banner && bannerTitle) {
            if (hasMoney) {
                skippedRows++;
                continue;
            }
            current = {
                id: `div-${banner[1]}`,
                costCode: `${banner[1]} 00 00`,
                title: bannerTitle,
                items: [],
            };
            divisions.push(current);
            continue;
        }

        // A line item that appeared before any division banner.
        if (!current) {
            const prefix = /^\d{2}/.test(code) ? code.slice(0, 2) : '00';
            current = {
                id: `div-${prefix}`,
                costCode: `${prefix} 00 00`,
                title: 'Imported Items',
                items: [],
            };
            divisions.push(current);
            warnings.push(`Row ${r}: line item found before any division heading — filed under "Imported Items".`);
        }

        if (!code && !service) {
            skippedRows++;
            continue;
        }

        const item: LineItem = {
            id: nextId(current.costCode.slice(0, 2)),
            costCode: code,
            service,
            description,
            material,
            labor,
            equipment,
            subContract,
        };

        // The sheet has no dedicated allowance flag, so infer it from wording.
        // Delete these two lines if you would rather set allowances by hand.
        if (ALLOWANCE.test(description) || ALLOWANCE.test(service)) item.ownerAllowance = true;

        // Sanity check the row against its own Total column, when present.
        if (total) {
            const sum = material + labor + equipment + subContract;
            if (Math.abs(sum - total) > 0.51) {
                warnings.push(
                    `Row ${r} (${code || service}): columns add to ${sum.toFixed(2)} but the Total cell says ${total.toFixed(2)}.`
                );
            }
        }

        current.items.push(item);
    }

    if (!divisions.length) {
        throw new Error('The estimate table was found, but no division rows could be read from it.');
    }

    const subTotal = divisions.reduce(
        (sum, div) => sum + div.items.reduce(
            (s, i) => s + i.material + i.labor + i.equipment + i.subContract, 0,
        ), 0,
    );

    if (!projectInfo.jobName) {
        projectInfo.jobName = file.name.replace(/\.(xlsx|xlsm|xls)$/i, '').replace(/[_-]+/g, ' ');
        warnings.push('No "Job Name:" label found — used the file name instead.');
    }

    return {
        projectData: { projectInfo, divisions },
        stats: {
            divisions: divisions.length,
            items: divisions.reduce((n, d) => n + d.items.length, 0),
            subTotal,
            skippedRows,
        },
        warnings,
    };
};
