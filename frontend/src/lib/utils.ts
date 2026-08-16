import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | null | undefined, currency: string = "MMK"): string {
  if (amount === null || amount === undefined || amount === "" || isNaN(Number(amount))) {
    return "0.00"
  }
  const num = Number(amount)
  return new Intl.NumberFormat("en-US", { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(num)
}

export function formatNumber(
  amount: number | string | null | undefined, 
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number } | number
): string {
  if (amount === null || amount === undefined || amount === "" || isNaN(Number(amount))) {
    return "0"
  }
  const num = Number(amount)
  
  if (typeof options === "number") {
    return new Intl.NumberFormat("en-US", { 
      maximumFractionDigits: options,
      minimumFractionDigits: options
    }).format(num)
  }

  return new Intl.NumberFormat("en-US", { 
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 4
  }).format(num)
}

/**
 * Formats a raw string or number into a comma-separated thousands string
 * while preserving in-progress typing states like trailing decimal points (e.g. "1234." -> "1,234.")
 */
export function formatThousands(val: string | number | null | undefined, allowDecimals: boolean = true): string {
  if (val === null || val === undefined || val === "") return ""
  const str = String(val).replace(/,/g, "").trim()
  if (str === "" || str === "-" || str === ".") return str

  const isNegative = str.startsWith("-")
  const cleanStr = isNegative ? str.slice(1) : str

  if (!allowDecimals) {
    const digits = cleanStr.replace(/\D/g, "")
    if (!digits) return isNegative ? "-" : ""
    const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    return isNegative ? `-${formatted}` : formatted
  }

  const parts = cleanStr.split(".")
  const integerDigits = parts[0].replace(/\D/g, "")
  
  if (integerDigits === "" && parts.length === 1) {
    return isNegative ? "-" : ""
  }

  const formattedInteger = integerDigits ? integerDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0"

  if (parts.length > 1) {
    const decimalDigits = parts.slice(1).join("").replace(/\D/g, "")
    return `${isNegative ? "-" : ""}${formattedInteger}.${decimalDigits}`
  }

  return `${isNegative ? "-" : ""}${formattedInteger}`
}

/**
 * Parses a thousands-formatted string back to a numeric value or undefined if empty/invalid.
 */
export function parseThousands(val: string | number | null | undefined): number | undefined {
  if (val === null || val === undefined || val === "") return undefined
  const clean = String(val).replace(/,/g, "").trim()
  if (clean === "" || clean === "-" || clean === ".") return undefined
  const num = parseFloat(clean)
  return isNaN(num) ? undefined : num
}
