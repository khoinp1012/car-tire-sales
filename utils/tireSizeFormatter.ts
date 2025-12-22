/**
 * Formats tire size from compact format (e.g., "2557016") to standard format (e.g., "255/70R16")
 * @param sizeString - The tire size string in compact format
 * @returns Formatted tire size string
 */
export function formatTireSize(sizeString: string | undefined | null): string {
  if (!sizeString || typeof sizeString !== 'string') {
    return '';
  }

  // Remove any non-digit characters
  const cleanSize = sizeString.replace(/[^0-9]/g, '');
  
  // Check if it's a compact format (7 digits like 2557016)
  if (cleanSize.length === 7) {
    const width = cleanSize.substring(0, 3);      // First 3 digits (255)
    const aspectRatio = cleanSize.substring(3, 5); // Next 2 digits (70)
    const rimDiameter = cleanSize.substring(5, 7); // Last 2 digits (16)
    
    return `${width}/${aspectRatio}R${rimDiameter}`;
  }
  
  // Check if it's a 6-digit format (like 185651 for 185/65R15)
  if (cleanSize.length === 6) {
    const width = cleanSize.substring(0, 3);      // First 3 digits (185)
    const aspectRatio = cleanSize.substring(3, 5); // Next 2 digits (65)
    const rimDiameter = cleanSize.substring(5, 6); // Last 1 digit (5, making it 15)
    
    return `${width}/${aspectRatio}R1${rimDiameter}`;
  }
  
  // If already formatted or doesn't match expected patterns, return as is
  return sizeString;
}

/**
 * Converts formatted tire size back to compact format for storage
 * @param formattedSize - The tire size in standard format (e.g., "255/70R16")
 * @returns Compact tire size string (e.g., "2557016")
 */
export function compactTireSize(formattedSize: string | undefined | null): string {
  if (!formattedSize || typeof formattedSize !== 'string') {
    return '';
  }

  // Match the pattern: 255/70R16 or 255/70/16 or 255-70-16
  const match = formattedSize.match(/(\d{3})[\/\-](\d{2})[R\/\-](\d{1,2})/i);
  
  if (match) {
    const [, width, aspectRatio, rimDiameter] = match;
    // Pad rim diameter to 2 digits if needed
    const paddedRim = rimDiameter.length === 1 ? `0${rimDiameter}` : rimDiameter;
    return `${width}${aspectRatio}${paddedRim}`;
  }
  
  // If it's already in compact format or doesn't match, return as is
  return formattedSize;
}

/**
 * Checks if a tire size string is in compact format
 * @param sizeString - The tire size string to check
 * @returns true if the string appears to be in compact format
 */
export function isCompactTireSize(sizeString: string | undefined | null): boolean {
  if (!sizeString || typeof sizeString !== 'string') {
    return false;
  }
  
  const cleanSize = sizeString.replace(/[^0-9]/g, '');
  return cleanSize.length === 6 || cleanSize.length === 7;
}
