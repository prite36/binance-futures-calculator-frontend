/**
 * Binance USDⓈ-M Futures Liquidation Price Calculator
 *
 * Official Formula from Binance Documentation:
 * https://www.binance.com/en/support/faq/how-to-calculate-liquidation-price-of-usd%E2%93%A2-m-futures-contracts-b3c689c1f50a44cabb3a84e663b81d93
 *
 * General Formula: LP = (WB - TMM + UPNL + cumB - Side × Position × EP) / (Position × (Side - MMR))
 *
 * For Cross/Isolated Margin Mode (One-way Mode):
 * - LONG (Side = 1): LP = (WB - TMM + UPNL + cumB - Position × EP) / (Position × (1 - MMR))
 * - SHORT (Side = -1): LP = (WB - TMM + UPNL + cumB + Position × EP) / (Position × (-1 - MMR))
 *
 * Where:
 * - WB = Wallet Balance (crossWalletBalance for cross, isolatedWalletBalance for isolated)
 * - TMM = Total Maintenance Margin of all other contracts (0 for isolated or single position)
 * - UPNL = Unrealized PNL of all other contracts (0 for isolated or single position)
 * - cumB = Maintenance Amount (from tier brackets)
 * - Position = Position size (absolute value)
 * - EP = Entry Price
 * - MMR = Maintenance Margin Rate (from tier brackets)
 * - Side = 1 for Long, -1 for Short
 */

interface MaintenanceTier {
  minNotional: number;
  maxNotional: number;
  maintenanceMarginRate: number;
  maintenanceAmount: number;
  maxLeverage: number;
}

// Real BTCUSDT leverage brackets from Binance API (updated to match route.ts)
const BTCUSDT_TIERS: MaintenanceTier[] = [
  {
    minNotional: 0,
    maxNotional: 300000,
    maintenanceMarginRate: 0.004,
    maintenanceAmount: 0.0,
    maxLeverage: 150,
  },
  {
    minNotional: 300000,
    maxNotional: 800000,
    maintenanceMarginRate: 0.005,
    maintenanceAmount: 300.0,
    maxLeverage: 100,
  },
  {
    minNotional: 800000,
    maxNotional: 3000000,
    maintenanceMarginRate: 0.0065,
    maintenanceAmount: 1500.0,
    maxLeverage: 75,
  },
  {
    minNotional: 3000000,
    maxNotional: 12000000,
    maintenanceMarginRate: 0.01,
    maintenanceAmount: 12000.0,
    maxLeverage: 50,
  },
  {
    minNotional: 12000000,
    maxNotional: 70000000,
    maintenanceMarginRate: 0.02,
    maintenanceAmount: 132000.0,
    maxLeverage: 25,
  },
  {
    minNotional: 70000000,
    maxNotional: 100000000,
    maintenanceMarginRate: 0.025,
    maintenanceAmount: 482000.0,
    maxLeverage: 20,
  },
  {
    minNotional: 100000000,
    maxNotional: 230000000,
    maintenanceMarginRate: 0.05,
    maintenanceAmount: 2982000.0,
    maxLeverage: 10,
  },
  {
    minNotional: 230000000,
    maxNotional: 480000000,
    maintenanceMarginRate: 0.1,
    maintenanceAmount: 14482000.0,
    maxLeverage: 5,
  },
  {
    minNotional: 480000000,
    maxNotional: 600000000,
    maintenanceMarginRate: 0.125,
    maintenanceAmount: 26482000.0,
    maxLeverage: 4,
  },
  {
    minNotional: 600000000,
    maxNotional: 800000000,
    maintenanceMarginRate: 0.15,
    maintenanceAmount: 41482000.0,
    maxLeverage: 3,
  },
  {
    minNotional: 800000000,
    maxNotional: 1200000000,
    maintenanceMarginRate: 0.25,
    maintenanceAmount: 121482000.0,
    maxLeverage: 2,
  },
  {
    minNotional: 1200000000,
    maxNotional: Number.POSITIVE_INFINITY,
    maintenanceMarginRate: 0.5,
    maintenanceAmount: 421482000.0,
    maxLeverage: 1,
  },
];

export function convertBinanceBracketsToTiers(
  brackets: any[]
): MaintenanceTier[] {
  return brackets.map((bracket) => ({
    minNotional: bracket.notionalFloor,
    maxNotional: bracket.notionalCap,
    maintenanceMarginRate: bracket.maintMarginRatio,
    maintenanceAmount: bracket.cum,
    maxLeverage: bracket.initialLeverage,
  }));
}

function getMaintenanceTier(
  notionalValue: number,
  tiers: MaintenanceTier[]
): MaintenanceTier {
  const tier = tiers.find(
    (t) => notionalValue >= t.minNotional && notionalValue < t.maxNotional
  );
  return tier || tiers[tiers.length - 1];
}

interface CalculationParams {
  side: "long" | "short";
  leverage: number;
  entryPrice: number;
  quantity: number;
  balance: number;
  marginMode: "isolated" | "cross";
  tiers?: MaintenanceTier[]; // Optional custom tiers from API
  symbol?: string; // Optional symbol for logging
}

export function calculateLiquidationPrice(params: CalculationParams): number {
  const {
    side,
    entryPrice,
    quantity,
    balance,
    marginMode,
    tiers = BTCUSDT_TIERS,
    symbol = "UNKNOWN",
  } = params;

  // Calculate position notional value
  const notionalValue = entryPrice * quantity;

  const tier = getMaintenanceTier(notionalValue, tiers);
  const MMR = tier.maintenanceMarginRate;
  const cumB = tier.maintenanceAmount;

  // For both isolated and cross margin with single position:
  // TMM = 0 (no other contracts)
  // UPNL = 0 (no other contracts)
  const WB = balance; // Wallet Balance
  const TMM = 0; // Total Maintenance Margin of other contracts (0 for single position)
  const UPNL = 0; // Unrealized PNL of other contracts (0 for single position)
  const Position = quantity; // Position size (absolute value)
  const EP = entryPrice; // Entry Price

  let liquidationPrice: number;

  if (side === "long") {
    // LONG Position Formula
    if (marginMode === "isolated") {
      // Isolated Margin Long: LP = EP - (Isolated Margin - cumB) / (Position × (1 - MMR))
      liquidationPrice = EP - (WB - cumB) / (Position * (1 - MMR));
    } else {
      // Cross Margin Long - Final Corrected Formula
      // LP = EP - (WB - cumB) / (Position × (1 - MMR))
      liquidationPrice = EP - (WB - cumB) / (Position * (1 - MMR));
    }
  } else {
    // SHORT Position Formula (Cross Margin)
    // LP = (Position × EP + WB - TMM + UPNL - cumB) / (Position × (1 + MMR))
    if (marginMode === "isolated") {
      const isolatedMargin = (Position * EP) / params.leverage;
      liquidationPrice =
        (Position * EP + isolatedMargin - cumB) / (Position * (1 + MMR));
    } else {
      // Cross Margin Short - Corrected Formula
      liquidationPrice =
        (Position * EP + WB - TMM + UPNL - cumB) / (Position * (1 + MMR));
    }
  }

  console.log(`[v0] Liquidation Price Calculation for ${symbol}:`);
  console.log(`  Side: ${side.toUpperCase()}`);
  console.log(`  Entry Price: ${EP} USDT`);
  console.log(`  Quantity: ${Position} ${symbol.replace("USDT", "")}`);
  console.log(`  Balance: ${WB} USDT`);
  console.log(`  Notional Value: ${notionalValue} USDT`);
  console.log(`  Maintenance Margin Rate: ${MMR} (${(MMR * 100).toFixed(4)}%)`);
  console.log(`  Maintenance Amount (cum): ${cumB} USDT`);
  console.log(`  Calculated LP: ${liquidationPrice.toFixed(2)} USDT`);

  // Ensure liquidation price is positive
  return Math.max(0, liquidationPrice);
}

/**
 * Calculate maintenance margin for a position
 */
export function calculateMaintenanceMargin(
  entryPrice: number,
  quantity: number
): {
  maintenanceMargin: number;
  maintenanceMarginRate: number;
  maintenanceAmount: number;
} {
  const notionalValue = entryPrice * quantity;
  const tier = getMaintenanceTier(notionalValue, BTCUSDT_TIERS);

  const maintenanceMargin =
    notionalValue * tier.maintenanceMarginRate - tier.maintenanceAmount;

  return {
    maintenanceMargin,
    maintenanceMarginRate: tier.maintenanceMarginRate,
    maintenanceAmount: tier.maintenanceAmount,
  };
}
