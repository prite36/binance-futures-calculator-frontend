import { Decimal } from 'decimal.js';

// Configure Decimal.js for financial calculations
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -7,
  toExpPos: 21,
  minE: -9e15,
  maxE: 9e15,
  crypto: false,
  modulo: Decimal.ROUND_DOWN,
});

/**
 * Safe decimal arithmetic operations
 */
export class DecimalMath {
  /**
   * Add two numbers with decimal precision
   */
  static add(a: number | string, b: number | string): Decimal {
    return new Decimal(a).add(new Decimal(b));
  }

  /**
   * Subtract two numbers with decimal precision
   */
  static subtract(a: number | string, b: number | string): Decimal {
    return new Decimal(a).sub(new Decimal(b));
  }

  /**
   * Multiply two numbers with decimal precision
   */
  static multiply(a: number | string, b: number | string): Decimal {
    return new Decimal(a).mul(new Decimal(b));
  }

  /**
   * Divide two numbers with decimal precision
   */
  static divide(a: number | string, b: number | string): Decimal {
    return new Decimal(a).div(new Decimal(b));
  }

  /**
   * Convert to number with proper rounding
   */
  static toNumber(value: Decimal | number | string): number {
    if (value instanceof Decimal) {
      return value.toNumber();
    }
    return new Decimal(value).toNumber();
  }

  /**
   * Format number for display with proper precision
   */
  static format(value: Decimal | number | string, decimals: number = 8): string {
    const decimal = value instanceof Decimal ? value : new Decimal(value);
    
    // Remove trailing zeros and format
    const formatted = decimal.toFixed(decimals);
    
    // Remove trailing zeros after decimal point
    if (formatted.includes('.')) {
      return formatted.replace(/\.?0+$/, '');
    }
    
    return formatted;
  }

  /**
   * Format price with dynamic precision (for trading pairs)
   */
  static formatPrice(value: Decimal | number | string, pricePrecision: number = 2): string {
    const decimal = value instanceof Decimal ? value : new Decimal(value);
    
    // For price display, we want to show the full precision
    const formatted = decimal.toFixed(pricePrecision);
    
    // Only remove trailing zeros if precision is high (> 4)
    if (pricePrecision > 4 && formatted.includes('.')) {
      return formatted.replace(/\.?0+$/, '');
    }
    
    return formatted;
  }

  /**
   * Format quantity with dynamic precision
   */
  static formatQuantity(value: Decimal | number | string, quantityPrecision: number = 3): string {
    const decimal = value instanceof Decimal ? value : new Decimal(value);
    
    const formatted = decimal.toFixed(quantityPrecision);
    
    // Remove trailing zeros for quantities
    if (formatted.includes('.')) {
      return formatted.replace(/\.?0+$/, '');
    }
    
    return formatted;
  }

  /**
   * Format for input fields (preserve user input precision)
   */
  static formatForInput(value: Decimal | number | string, maxDecimals: number = 8): string {
    if (!value || value === '') return '';
    
    const decimal = value instanceof Decimal ? value : new Decimal(value);
    
    // Check if the number is effectively an integer
    if (decimal.modulo(1).equals(0)) {
      return decimal.toFixed(0);
    }
    
    // Format with appropriate precision, removing trailing zeros
    const formatted = decimal.toFixed(maxDecimals);
    return formatted.replace(/\.?0+$/, '');
  }

  /**
   * Safe comparison operations
   */
  static equals(a: number | string, b: number | string): boolean {
    return new Decimal(a).equals(new Decimal(b));
  }

  static greaterThan(a: number | string, b: number | string): boolean {
    return new Decimal(a).greaterThan(new Decimal(b));
  }

  static lessThan(a: number | string, b: number | string): boolean {
    return new Decimal(a).lessThan(new Decimal(b));
  }

  /**
   * Calculate position size based on unit preference
   */
  static calculatePositionSize(
    inputValue: number | string,
    orderPrice: number | string,
    leverage: number | string,
    unitPreference: 'quantity' | 'orderSize' | 'initialMargin'
  ): Decimal {
    const input = new Decimal(inputValue);
    const price = new Decimal(orderPrice);
    const lev = new Decimal(leverage);

    switch (unitPreference) {
      case 'quantity':
        return input; // Direct quantity
      case 'orderSize':
        return input.div(price); // USDT amount / price
      case 'initialMargin':
        return input.mul(lev).div(price); // (margin * leverage) / price
      default:
        return input;
    }
  }

  /**
   * Calculate input value from position size
   */
  static calculateInputValue(
    positionSize: number | string,
    orderPrice: number | string,
    leverage: number | string,
    unitPreference: 'quantity' | 'orderSize' | 'initialMargin'
  ): Decimal {
    const size = new Decimal(positionSize);
    const price = new Decimal(orderPrice);
    const lev = new Decimal(leverage);

    switch (unitPreference) {
      case 'quantity':
        return size; // Direct quantity
      case 'orderSize':
        return size.mul(price); // quantity * price
      case 'initialMargin':
        return size.mul(price).div(lev); // (quantity * price) / leverage
      default:
        return size;
    }
  }
}

/**
 * Helper function to safely parse user input
 */
export function safeParseDecimal(value: string | number): Decimal | null {
  try {
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    const decimal = new Decimal(value);
    return decimal.isNaN() ? null : decimal;
  } catch {
    return null;
  }
}

/**
 * Helper function to validate numeric input
 */
export function isValidNumericInput(value: string): boolean {
  if (!value || value.trim() === '') return false;
  try {
    const decimal = new Decimal(value);
    return !decimal.isNaN() && decimal.isFinite();
  } catch {
    return false;
  }
}