/**
 * Currency conversion utilities for Casper Network
 *
 * Provides safe, precision-preserving conversions between CSPR and motes.
 * Avoids floating-point arithmetic to prevent precision loss in financial calculations.
 */

import { MOTES_PER_CSPR } from "../constants.js";

/**
 * Safely convert CSPR amount to motes without precision loss
 *
 * @param csprAmount - Amount in CSPR (can be string or number)
 * @returns Amount in motes as a string
 * @throws Error if the input is invalid or would result in fractional motes
 *
 * @example
 * csprToMotes("1.5") // "1500000000"
 * csprToMotes(0.000000001) // "1"
 * csprToMotes("0.0000000005") // Error: fractional motes
 */
export function csprToMotes(csprAmount: string | number): string {
  // Convert to string for consistent processing
  const csprString = String(csprAmount);

  // Validate input format
  if (!/^-?\d+\.?\d*$/.test(csprString)) {
    throw new Error(`Invalid CSPR amount format: ${csprString}`);
  }

  // Parse the CSPR amount
  const [integerPart = "0", decimalPart = ""] = csprString.split(".");

  // Check for negative amounts
  if (csprString.startsWith("-")) {
    throw new Error("CSPR amount cannot be negative");
  }

  // MOTES_PER_CSPR is 1_000_000_000 (9 decimal places)
  const DECIMAL_PLACES = 9;

  // Pad or truncate decimal part to exactly 9 digits
  const paddedDecimal = decimalPart.padEnd(DECIMAL_PLACES, "0");

  // Check if we would lose precision (more than 9 decimal places)
  if (decimalPart.length > DECIMAL_PLACES) {
    // Check if the extra digits are non-zero (would lose precision)
    const extraDigits = decimalPart.slice(DECIMAL_PLACES);
    if (extraDigits.replace(/0+$/, "").length > 0) {
      throw new Error(
        `CSPR amount has too many decimal places. Maximum precision is 9 decimal places (1 mote). Got: ${csprString}`
      );
    }
  }

  // Combine integer and decimal parts to get motes
  const motesString = integerPart + paddedDecimal.slice(0, DECIMAL_PLACES);

  // Convert to BigInt to validate and remove leading zeros
  const motesBigInt = BigInt(motesString);

  return motesBigInt.toString();
}

/**
 * Safely convert motes to CSPR for display
 *
 * @param motes - Amount in motes (string or bigint)
 * @returns Amount in CSPR as a string with trailing zeros removed
 *
 * @example
 * motesToCspr("1500000000") // "1.5"
 * motesToCspr("1") // "0.000000001"
 * motesToCspr("1000000000") // "1"
 */
export function motesToCspr(motes: string | bigint): string {
  const motesBigInt = typeof motes === "string" ? BigInt(motes) : motes;
  const motesPerCspr = BigInt(MOTES_PER_CSPR);

  const integerPart = motesBigInt / motesPerCspr;
  const decimalPart = motesBigInt % motesPerCspr;

  if (decimalPart === BigInt(0)) {
    return integerPart.toString();
  }

  // Pad decimal part to 9 digits and remove trailing zeros
  const decimalString = decimalPart.toString().padStart(9, "0");
  const trimmedDecimal = decimalString.replace(/0+$/, "");

  return `${integerPart}.${trimmedDecimal}`;
}

/**
 * Validate that a CSPR amount is within acceptable bounds
 *
 * @param cspr - Amount in CSPR
 * @param minCspr - Minimum allowed amount (default: 0)
 * @param maxCspr - Maximum allowed amount (default: total supply)
 * @throws Error if amount is out of bounds
 */
export function validateCsprAmount(
  cspr: string | number,
  minCspr: string | number = "0",
  maxCspr: string | number = "10000000000" // 10 billion CSPR (approximate total supply)
): void {
  const motes = BigInt(csprToMotes(cspr));
  const minMotes = BigInt(csprToMotes(minCspr));
  const maxMotes = BigInt(csprToMotes(maxCspr));

  if (motes < minMotes) {
    throw new Error(
      `Amount ${cspr} CSPR is below minimum ${minCspr} CSPR`
    );
  }

  if (motes > maxMotes) {
    throw new Error(
      `Amount ${cspr} CSPR exceeds maximum ${maxCspr} CSPR`
    );
  }
}
