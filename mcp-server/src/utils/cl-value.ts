/**
 * CLValue Extraction Utility
 *
 * Casper RPC returns CLValue in a specific format that needs extraction.
 * This utility handles the various ways CLValue data can be structured.
 */

/**
 * Extract the actual value from a Casper CLValue stored value
 *
 * The RPC can return data in different formats:
 * - { CLValue: { cl_type, bytes, parsed } } - Standard CLValue with parsed data
 * - { CLValue: { cl_type, bytes } } - CLValue without parsed (need to decode bytes)
 * - Direct value - Some queries return the value directly
 *
 * @param storedValue - The stored value from RPC query
 * @returns The extracted value (parsed if available, otherwise bytes or raw value)
 */
export function extractCLValue(storedValue: any): any {
  if (!storedValue) return null;

  // Handle standard CLValue wrapper
  if (storedValue.CLValue) {
    const clv = storedValue.CLValue;
    // Prefer parsed value if available
    if (clv.parsed !== undefined) return clv.parsed;
    // Fall back to bytes if no parsed value
    return clv.bytes;
  }

  // Return as-is if not in CLValue wrapper
  return storedValue;
}

/**
 * Safely convert a value to string
 * Handles numbers, bigints, strings, and nullish values
 *
 * @param value - Value to convert
 * @param defaultValue - Default value if conversion fails
 * @returns String representation of the value
 */
export function toSafeString(value: any, defaultValue: string = "0"): string {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return defaultValue;
}
