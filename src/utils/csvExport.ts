/**
 * Converts an array of objects to CSV string
 */
export function objectsToCSV<T extends Record<string, unknown>>(data: T[], columns?: { key: keyof T; label: string }[]): string {
  if (data.length === 0) return '';

  // Use provided columns or auto-detect from first object
  const headers = columns 
    ? columns.map(c => c.label) 
    : Object.keys(data[0]);
  
  const keys = columns 
    ? columns.map(c => c.key) 
    : Object.keys(data[0]) as (keyof T)[];

  const csvRows: string[] = [];
  
  // Add header row
  csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));

  // Add data rows
  for (const row of data) {
    const values = keys.map(key => {
      const value = row[key];
      if (value === null || value === undefined) return '""';
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

/**
 * Downloads a CSV string as a file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Export data as CSV file
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[], 
  filename: string, 
  columns?: { key: keyof T; label: string }[]
): void {
  const csv = objectsToCSV(data, columns);
  downloadCSV(csv, filename);
}

// Predefined column mappings for common data types
export const transactionColumns = [
  { key: 'id' as const, label: 'Transaction ID' },
  { key: 'itemName' as const, label: 'Item' },
  { key: 'amount' as const, label: 'Amount (KES)' },
  { key: 'status' as const, label: 'Status' },
  { key: 'buyerName' as const, label: 'Buyer' },
  { key: 'sellerName' as const, label: 'Seller' },
  { key: 'createdAt' as const, label: 'Created At' },
  { key: 'completedAt' as const, label: 'Completed At' },
];

export const userColumns = [
  { key: 'id' as const, label: 'User ID' },
  { key: 'name' as const, label: 'Name' },
  { key: 'phone' as const, label: 'Phone' },
  { key: 'email' as const, label: 'Email' },
  { key: 'role' as const, label: 'Role' },
  { key: 'isActive' as const, label: 'Active' },
  { key: 'createdAt' as const, label: 'Joined' },
];

export const disputeColumns = [
  { key: 'id' as const, label: 'Dispute ID' },
  { key: 'transactionId' as const, label: 'Transaction ID' },
  { key: 'reason' as const, label: 'Reason' },
  { key: 'status' as const, label: 'Status' },
  { key: 'openedBy' as const, label: 'Opened By' },
  { key: 'createdAt' as const, label: 'Created At' },
  { key: 'resolvedAt' as const, label: 'Resolved At' },
];
