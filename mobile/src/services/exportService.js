import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { getAllFoodLogs } from './database';

/**
 * Generates a real .xlsx Excel file from the user's food logs,
 * names it {username}_report.xlsx, saves it locally, and opens the native share sheet.
 */
export async function exportLogsAsExcel(user) {
  const logs = await getAllFoodLogs();
  if (!logs || logs.length === 0) {
    throw new Error('No food logs available to export.');
  }

  // Generate filename: {username}_report.xlsx (e.g., Tejas_report.xlsx)
  const rawName = (user?.name || 'User').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${rawName || 'User'}_report.xlsx`;

  // Map logs to specified Excel columns
  const rows = logs.map(l => ({
    'ID': l.id,
    'Date': l.logged_at || '',
    'Meal Type': l.meal_type || '',
    'Food Name': l.name || '',
    'Grams': Number(l.grams_estimate) || 0,
    'Calories': Number(l.calories) || 0,
    'Protein(g)': Number(l.protein) || 0,
    'Carbs(g)': Number(l.carbs) || 0,
    'Fat(g)': Number(l.fat) || 0,
    'Fiber(g)': Number(l.fiber) || 0,
    'Source': l.source || '',
  }));

  // Create Worksheet & Workbook
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: ['ID', 'Date', 'Meal Type', 'Food Name', 'Grams', 'Calories', 'Protein(g)', 'Carbs(g)', 'Fat(g)', 'Fiber(g)', 'Source']
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Food Logs');

  if (Platform.OS === 'web') {
    // Web: direct download of the .xlsx file
    XLSX.writeFile(workbook, fileName);
    return fileName;
  } else {
    // Native (iOS/Android): generate base64, write to local cache, and open native share sheet
    const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Export Food Logs Excel Report',
        UTI: 'com.microsoft.excel.xlsx'
      });
    } else {
      throw new Error('Sharing is not available on this device.');
    }

    return fileUri;
  }
}
