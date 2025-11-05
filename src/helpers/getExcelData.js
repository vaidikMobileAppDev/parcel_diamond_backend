import ExcelJS from 'exceljs';

export const GetExcelData = async (file) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);
    const data = [];

    workbook.eachSheet((worksheet, sheetId) => {
        const headerRow = worksheet.getRow(1);  // Get the header row
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber !== 1) {  // Skip the header row
                const rowData = {};

                // Iterate over all columns based on header row length
                headerRow.eachCell((headerCell, colNumber) => {
                    const key = headerCell.value.toString().trim();
                    // Get the cell in the current row for this column
                    const cell = row.getCell(colNumber);

                    // If the cell exists and has a value, get the value; otherwise, leave it undefined or set it to null/empty string
                    // const value = cell.value && typeof cell.value === 'object' ? cell.value.text : cell.value || null;
                    const value =
                        typeof cell.value === "object"
                            ? cell.value.text ?? null
                            : cell.value === 0
                            ? 0
                            : cell.value ?? null;

                    rowData[key] = value;
                });

                data.push(rowData);
            }
        });
    });
    return data;
};