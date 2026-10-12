import React, { useState, useMemo } from "react";
import {
  Calculator,
  Ship,
  Plane,
  Truck,
  DollarSign,
  Percent,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Download,
  Copy,
  Check,
  BookmarkCheck,
  RefreshCw,
  Sparkles,
  Info,
  Scale,
  Landmark,
  Globe2,
  Package,
  Layers,
  FileSpreadsheet,
  AlertTriangle,
  ArrowDownRight,
  Loader2
} from "lucide-react";
import { SavedItem } from "../types";
import { authFetch } from "../utils/apiHelper";
import { normalizeErrorMessage } from "../utils/errorUtils";
import { useLanguage } from "../i18n/LanguageContext";
import { useCredits } from "../context/CreditsContext";

export type FreightMode =
  | "ocean_lcl"
  | "ocean_fcl_20"
  | "ocean_fcl_40"
  | "air_cargo"
  | "air_express"
  | "truck_crossborder";

export type IncotermType = "EXW" | "FOB" | "CIF" | "DDP";

export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  defaultRateToUsd: number; // 1 USD = X Currency
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: "USD", name: "US Dollar", symbol: "$", defaultRateToUsd: 1.0 },
  { code: "EUR", name: "Euro", symbol: "€", defaultRateToUsd: 0.92 },
  { code: "GBP", name: "British Pound", symbol: "£", defaultRateToUsd: 0.77 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", defaultRateToUsd: 83.5 },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", defaultRateToUsd: 3.67 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", defaultRateToUsd: 1.36 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", defaultRateToUsd: 1.52 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", defaultRateToUsd: 1.35 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", defaultRateToUsd: 155.0 },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", defaultRateToUsd: 7.24 },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", defaultRateToUsd: 25400 },
  { code: "MXN", name: "Mexican Peso", symbol: "Mex$", defaultRateToUsd: 18.2 },
];

export interface RoutePreset {
  id: string;
  name: string;
  productName: string;
  originCountry: string;
  targetCountry: string;
  originCurrency: string;
  targetCurrency: string;
  freightMode: FreightMode;
  units: number;
  unitCostOrigin: number;
  packagingCostOrigin: number;
  unitWeightKg: number;
  unitCbm: number;
  inlandFreightUsd: number;
  freightCostUsd: number;
  tariffRatePct: number;
  vatRatePct: number;
  destClearanceUsd: number;
  targetPriceInvoicing: number;
  incoterm: IncotermType;
  description: string;
}

const ROUTE_PRESETS: RoutePreset[] = [
  {
    id: "india-usa-brass",
    name: "India → USA (Handicrafts & Brassware, Ocean LCL)",
    productName: "Handcrafted Brass Tableware & Decor",
    originCountry: "India",
    targetCountry: "United States",
    originCurrency: "INR",
    targetCurrency: "USD",
    freightMode: "ocean_lcl",
    units: 500,
    unitCostOrigin: 650, // INR (~$7.80)
    packagingCostOrigin: 45, // INR
    unitWeightKg: 0.8,
    unitCbm: 0.003, // total ~1.5 CBM
    inlandFreightUsd: 95,
    freightCostUsd: 380, // ~$250/CBM base + docs
    tariffRatePct: 3.5, // Brassware MFN duty
    vatRatePct: 0.0, // US state sales tax collected at retail, 0% import VAT
    destClearanceUsd: 180, // US customs entry & ISF filing
    targetPriceInvoicing: 26.5, // Target selling price in USD
    incoterm: "CIF",
    description: "Standard artisan export batch via Mumbai Nhava Sheva to New York / Newark.",
  },
  {
    id: "india-uae-spices",
    name: "India → UAE (Organic Spices & Food, Air Freight)",
    productName: "Organic Spices & Herbal Extracts",
    originCountry: "India",
    targetCountry: "United Arab Emirates",
    originCurrency: "INR",
    targetCurrency: "AED",
    freightMode: "air_cargo",
    units: 300,
    unitCostOrigin: 420, // INR
    packagingCostOrigin: 35,
    unitWeightKg: 0.5, // 150 kg total air cargo
    unitCbm: 0.0015,
    inlandFreightUsd: 65,
    freightCostUsd: 420, // ~$2.80/kg air cargo
    tariffRatePct: 5.0, // GCC unified customs tariff
    vatRatePct: 5.0, // UAE standard VAT
    destClearanceUsd: 120, // Dubai customs broker
    targetPriceInvoicing: 45.0, // AED
    incoterm: "CIF",
    description: "High-value perishable seasoning air cargo to Dubai / Jebel Ali buyers.",
  },
  {
    id: "vietnam-germany-textiles",
    name: "Vietnam → Germany (Eco Apparel, Ocean FCL 20ft)",
    productName: "Organic Bamboo Apparel & Garments",
    originCountry: "Vietnam",
    targetCountry: "Germany",
    originCurrency: "VND",
    targetCurrency: "EUR",
    freightMode: "ocean_fcl_20",
    units: 2500,
    unitCostOrigin: 110000, // VND (~$4.30)
    packagingCostOrigin: 8000,
    unitWeightKg: 0.35,
    unitCbm: 0.002, // 5 CBM fits comfortably in 20ft
    inlandFreightUsd: 220,
    freightCostUsd: 1650, // 20ft container Hai Phong to Hamburg
    tariffRatePct: 0.0, // 0% under EU-Vietnam FTA (EVFTA) preferential trade
    vatRatePct: 19.0, // German Import VAT (Einfuhrumsatzsteuer)
    destClearanceUsd: 280,
    targetPriceInvoicing: 11.5, // EUR
    incoterm: "FOB",
    description: "Containerized garment shipment benefiting from preferential tariff agreements.",
  },
  {
    id: "mexico-usa-ceramics",
    name: "Mexico → USA (Artisan Ceramics, Cross-Border Truck)",
    productName: "Hand-Painted Talavera Ceramic Tiles",
    originCountry: "Mexico",
    targetCountry: "United States",
    originCurrency: "MXN",
    targetCurrency: "USD",
    freightMode: "truck_crossborder",
    units: 800,
    unitCostOrigin: 120, // MXN (~$6.60)
    packagingCostOrigin: 18,
    unitWeightKg: 1.2,
    unitCbm: 0.0025,
    inlandFreightUsd: 140,
    freightCostUsd: 580, // Laredo cross-docking drayage & line-haul
    tariffRatePct: 0.0, // 0% under USMCA Rules of Origin certificate
    vatRatePct: 0.0,
    destClearanceUsd: 160,
    targetPriceInvoicing: 19.0, // USD
    incoterm: "DDP",
    description: "Overland freight from Jalisco to Dallas distribution hub with USMCA origin compliance.",
  },
  {
    id: "china-uk-electronics",
    name: "China → UK (Consumer Accessories, Ocean LCL)",
    productName: "Smart Wireless Desk Peripherals",
    originCountry: "China",
    targetCountry: "United Kingdom",
    originCurrency: "CNY",
    targetCurrency: "GBP",
    freightMode: "ocean_lcl",
    units: 1000,
    unitCostOrigin: 45, // CNY (~$6.20)
    packagingCostOrigin: 4,
    unitWeightKg: 0.45,
    unitCbm: 0.0018,
    inlandFreightUsd: 85,
    freightCostUsd: 490,
    tariffRatePct: 4.2, // UK Global Tariff for electronic accessories
    vatRatePct: 20.0, // UK standard VAT
    destClearanceUsd: 195,
    targetPriceInvoicing: 18.5, // GBP
    incoterm: "CIF",
    description: "Shenzhen to Southampton port LCL consolidation with customs broker clearance.",
  },
];

interface ExportCostCalculatorProps {
  onSaveItem: (item: Omit<SavedItem, "id" | "createdAt">) => void;
  defaultProduct?: string;
  defaultOrigin?: string;
  defaultDestination?: string;
}

export const ExportCostCalculator: React.FC<ExportCostCalculatorProps> = ({
  onSaveItem,
  defaultProduct = "Handmade Ceramic & Brass Decor",
  defaultOrigin = "India",
  defaultDestination = "United States",
}) => {
  const { languageInfo } = useLanguage();
  const { canPerformAIAction, consumeCredit, openSignupModal, openLimitModal } = useCredits();

  // Basic Information
  const [productName, setProductName] = useState(defaultProduct);
  const [originCountry, setOriginCountry] = useState(defaultOrigin);
  const [targetCountry, setTargetCountry] = useState(defaultDestination);
  const [hsCodeHint, setHsCodeHint] = useState("7418.10");

  // Currency Selection & Custom Rates
  const [originCurrencyCode, setOriginCurrencyCode] = useState("INR");
  const [targetCurrencyCode, setTargetCurrencyCode] = useState("USD");
  const [customExchangeRate, setCustomExchangeRate] = useState<number | null>(null);

  // Bank & Hedging Spreads
  const [bankFxSpreadPct, setBankFxSpreadPct] = useState(2.2); // Typical 2.2% bank wire fee
  const [fxVolatilityBufferPct, setFxVolatilityBufferPct] = useState(1.5); // 1.5% currency hedge cushion

  // Shipment & Product Parameters
  const [units, setUnits] = useState(500);
  const [unitProductionCostOrigin, setUnitProductionCostOrigin] = useState(650);
  const [unitPackagingCostOrigin, setUnitPackagingCostOrigin] = useState(45);
  const [unitWeightKg, setUnitWeightKg] = useState(0.8);
  const [unitCbm, setUnitCbm] = useState(0.003);

  // Freight & Logistics
  const [freightMode, setFreightMode] = useState<FreightMode>("ocean_lcl");
  const [inlandTransportUsd, setInlandTransportUsd] = useState(95);
  const [freightCostUsd, setFreightCostUsd] = useState(380);
  const [marineInsuranceRatePct, setMarineInsuranceRatePct] = useState(0.4); // 0.4% Institute Cargo Clauses
  const [exportDocumentationUsd, setExportDocumentationUsd] = useState(60); // B/L, Certificate of Origin

  // Tariffs, Destination Taxes & Port Fees
  const [tariffRatePct, setTariffRatePct] = useState(3.5);
  const [destVatRatePct, setDestVatRatePct] = useState(0.0);
  const [isVatRecoverable, setIsVatRecoverable] = useState(true); // B2B buyers reclaim import VAT
  const [destPortHandlingUsd, setDestPortHandlingUsd] = useState(120);
  const [customsBrokerageUsd, setCustomsBrokerageUsd] = useState(85);

  // Pricing & Commercial Incoterm
  const [incoterm, setIncoterm] = useState<IncotermType>("CIF");
  const [targetUnitPriceInvoicing, setTargetUnitPriceInvoicing] = useState(26.5);

  // UI state
  const [copied, setCopied] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAdvisoryText, setAiAdvisoryText] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Exchange rate determination: 1 Target Currency = X Origin Currency
  const activeExchangeRate = useMemo(() => {
    if (customExchangeRate !== null && customExchangeRate > 0) {
      return customExchangeRate;
    }
    const originCfg = SUPPORTED_CURRENCIES.find((c) => c.code === originCurrencyCode);
    const targetCfg = SUPPORTED_CURRENCIES.find((c) => c.code === targetCurrencyCode);

    if (!originCfg || !targetCfg) return 1.0;

    // Both rates are expressed as Units per 1 USD
    // Example: origin = INR (83.5 per USD), target = USD (1.0 per USD)
    // 1 Target (USD) = 83.5 / 1.0 = 83.5 INR
    // Example: origin = INR (83.5 per USD), target = EUR (0.92 per USD)
    // 1 EUR = 83.5 / 0.92 = 90.76 INR
    return originCfg.defaultRateToUsd / targetCfg.defaultRateToUsd;
  }, [originCurrencyCode, targetCurrencyCode, customExchangeRate]);

  // Convert Origin Currency amount to Target Invoicing Currency
  const originToTarget = (originAmount: number): number => {
    if (activeExchangeRate <= 0) return originAmount;
    return originAmount / activeExchangeRate;
  };

  // Convert USD amount to Target Invoicing Currency
  const usdToTarget = (usdAmount: number): number => {
    const targetCfg = SUPPORTED_CURRENCIES.find((c) => c.code === targetCurrencyCode);
    const targetRateToUsd = targetCfg ? targetCfg.defaultRateToUsd : 1.0;
    return usdAmount * targetRateToUsd;
  };

  // Convert Target Invoicing Currency to USD (for standard customs basis)
  const targetToUsd = (targetAmount: number): number => {
    const targetCfg = SUPPORTED_CURRENCIES.find((c) => c.code === targetCurrencyCode);
    const targetRateToUsd = targetCfg ? targetCfg.defaultRateToUsd : 1.0;
    return targetAmount / targetRateToUsd;
  };

  // Apply a Preset
  const handleApplyPreset = (presetId: string) => {
    const preset = ROUTE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setProductName(preset.productName);
    setOriginCountry(preset.originCountry);
    setTargetCountry(preset.targetCountry);
    setOriginCurrencyCode(preset.originCurrency);
    setTargetCurrencyCode(preset.targetCurrency);
    setCustomExchangeRate(null);

    setFreightMode(preset.freightMode);
    setUnits(preset.units);
    setUnitProductionCostOrigin(preset.unitCostOrigin);
    setUnitPackagingCostOrigin(preset.packagingCostOrigin);
    setUnitWeightKg(preset.unitWeightKg);
    setUnitCbm(preset.unitCbm);

    setInlandTransportUsd(preset.inlandFreightUsd);
    setFreightCostUsd(preset.freightCostUsd);
    setTariffRatePct(preset.tariffRatePct);
    setDestVatRatePct(preset.vatRatePct);
    setIsVatRecoverable(preset.vatRatePct > 0);
    setDestPortHandlingUsd(preset.destClearanceUsd * 0.6);
    setCustomsBrokerageUsd(preset.destClearanceUsd * 0.4);

    setIncoterm(preset.incoterm);
    setTargetUnitPriceInvoicing(preset.targetPriceInvoicing);
    setHasSaved(false);
    setAiAdvisoryText(null);
  };

  // Detailed Real-time Calculations
  const calculations = useMemo(() => {
    const safeUnits = Math.max(1, units);

    // 1. Factory Production & Packaging
    const totalUnitFactoryOrigin = unitProductionCostOrigin + unitPackagingCostOrigin;
    const totalProductionOrigin = totalUnitFactoryOrigin * safeUnits;
    const totalProductionInvoicing = originToTarget(totalProductionOrigin);
    const unitProductionInvoicing = totalProductionInvoicing / safeUnits;

    // 2. Physical Cargo Volume & Weight
    const totalWeightKg = unitWeightKg * safeUnits;
    const totalCbm = unitCbm * safeUnits;

    // 3. Inland Drayage & Origin Documentation (USD converted to Invoicing Currency)
    const inlandFreightInvoicing = usdToTarget(inlandTransportUsd);
    const exportDocsInvoicing = usdToTarget(exportDocumentationUsd);
    const totalOriginPortLogisticsInvoicing = inlandFreightInvoicing + exportDocsInvoicing;

    // FOB Baseline Cost
    const totalFobCostInvoicing = totalProductionInvoicing + totalOriginPortLogisticsInvoicing;
    const unitFobCostInvoicing = totalFobCostInvoicing / safeUnits;

    // 4. International Sea/Air Freight & Marine Insurance
    const internationalFreightInvoicing = usdToTarget(freightCostUsd);
    // Insurance typically 0.3% - 0.5% of (FOB + Freight) * 1.1 (110% CIF value)
    const insurableValueInvoicing = (totalFobCostInvoicing + internationalFreightInvoicing) * 1.1;
    const marineInsuranceInvoicing = (insurableValueInvoicing * marineInsuranceRatePct) / 100;

    // CIF Baseline Cost
    const totalCifCostInvoicing = totalFobCostInvoicing + internationalFreightInvoicing + marineInsuranceInvoicing;
    const unitCifCostInvoicing = totalCifCostInvoicing / safeUnits;

    // 5. Destination Tariffs & Customs Port Duties
    // Import tariff is levied on CIF value
    const destinationTariffDutyInvoicing = (totalCifCostInvoicing * tariffRatePct) / 100;
    const destPortFeesInvoicing = usdToTarget(destPortHandlingUsd + customsBrokerageUsd);

    // Destination Import VAT (only a cost to the exporter if DDP and non-recoverable)
    const importVatBasisInvoicing = totalCifCostInvoicing + destinationTariffDutyInvoicing;
    const destImportVatInvoicing = !isVatRecoverable
      ? (importVatBasisInvoicing * destVatRatePct) / 100
      : 0;

    // DDP Baseline Cost (all tariffs, clearance, and non-recoverable VAT included)
    const totalDdpCostInvoicing =
      totalCifCostInvoicing +
      destinationTariffDutyInvoicing +
      destPortFeesInvoicing +
      destImportVatInvoicing;
    const unitDdpCostInvoicing = totalDdpCostInvoicing / safeUnits;

    // 6. Currency Conversion Fees & FX Buffer
    // Exporter receives payment in Invoicing Currency and converts back to Origin Currency
    // Bank wire conversion fee + hedging cushion
    const totalFxSpreadPct = bankFxSpreadPct + fxVolatilityBufferPct;

    // Active Landed Cost according to selected Incoterm:
    let relevantLandedCostInvoicing = totalFobCostInvoicing;
    if (incoterm === "EXW") {
      relevantLandedCostInvoicing = totalProductionInvoicing;
    } else if (incoterm === "FOB") {
      relevantLandedCostInvoicing = totalFobCostInvoicing;
    } else if (incoterm === "CIF") {
      relevantLandedCostInvoicing = totalCifCostInvoicing;
    } else if (incoterm === "DDP") {
      relevantLandedCostInvoicing = totalDdpCostInvoicing;
    }

    // Revenue calculation
    const totalRevenueInvoicing = targetUnitPriceInvoicing * safeUnits;
    const totalRevenueOrigin = totalRevenueInvoicing * activeExchangeRate;

    // FX fee applied on received gross revenue
    const fxBankingCostInvoicing = (totalRevenueInvoicing * totalFxSpreadPct) / 100;

    // Total Exporter Cost (Landed cost under contract terms + banking/FX loss)
    const totalExporterCostInvoicing = relevantLandedCostInvoicing + fxBankingCostInvoicing;
    const unitExporterCostInvoicing = totalExporterCostInvoicing / safeUnits;
    const totalExporterCostOrigin = totalExporterCostInvoicing * activeExchangeRate;

    // Profit & Margins
    const totalGrossProfitInvoicing = totalRevenueInvoicing - totalExporterCostInvoicing;
    const totalGrossProfitOrigin = totalGrossProfitInvoicing * activeExchangeRate;
    const unitProfitInvoicing = totalGrossProfitInvoicing / safeUnits;

    const netProfitMarginPct =
      totalRevenueInvoicing > 0
        ? (totalGrossProfitInvoicing / totalRevenueInvoicing) * 100
        : 0;

    // Break-even floor selling prices per unit under each Incoterm (with zero profit, factoring FX loss)
    const fxMultiplier = 1 / (1 - totalFxSpreadPct / 100);
    const breakEvenExwPrice = (totalProductionInvoicing / safeUnits) * fxMultiplier;
    const breakEvenFobPrice = (totalFobCostInvoicing / safeUnits) * fxMultiplier;
    const breakEvenCifPrice = (totalCifCostInvoicing / safeUnits) * fxMultiplier;
    const breakEvenDdpPrice = (totalDdpCostInvoicing / safeUnits) * fxMultiplier;

    // Cost Structure Breakdown Percentages
    const costComponents = {
      productionPct:
        totalExporterCostInvoicing > 0
          ? Math.round((totalProductionInvoicing / totalExporterCostInvoicing) * 100)
          : 0,
      freightLogisticsPct:
        totalExporterCostInvoicing > 0
          ? Math.round(
              ((totalOriginPortLogisticsInvoicing +
                (incoterm === "CIF" || incoterm === "DDP"
                  ? internationalFreightInvoicing + marineInsuranceInvoicing
                  : 0)) /
                totalExporterCostInvoicing) *
                100
            )
          : 0,
      tariffsDutyPct:
        totalExporterCostInvoicing > 0 && incoterm === "DDP"
          ? Math.round(
              ((destinationTariffDutyInvoicing + destPortFeesInvoicing + destImportVatInvoicing) /
                totalExporterCostInvoicing) *
                100
            )
          : 0,
      fxBankingPct:
        totalExporterCostInvoicing > 0
          ? Math.round((fxBankingCostInvoicing / totalExporterCostInvoicing) * 100)
          : 0,
    };

    return {
      safeUnits,
      totalWeightKg,
      totalCbm,
      totalProductionInvoicing,
      unitProductionInvoicing,
      inlandFreightInvoicing,
      exportDocsInvoicing,
      totalOriginPortLogisticsInvoicing,
      internationalFreightInvoicing,
      marineInsuranceInvoicing,
      totalFobCostInvoicing,
      unitFobCostInvoicing,
      totalCifCostInvoicing,
      unitCifCostInvoicing,
      destinationTariffDutyInvoicing,
      destPortFeesInvoicing,
      destImportVatInvoicing,
      totalDdpCostInvoicing,
      unitDdpCostInvoicing,
      relevantLandedCostInvoicing,
      fxBankingCostInvoicing,
      totalExporterCostInvoicing,
      unitExporterCostInvoicing,
      totalExporterCostOrigin,
      totalRevenueInvoicing,
      totalRevenueOrigin,
      totalGrossProfitInvoicing,
      totalGrossProfitOrigin,
      unitProfitInvoicing,
      netProfitMarginPct,
      breakEvenExwPrice,
      breakEvenFobPrice,
      breakEvenCifPrice,
      breakEvenDdpPrice,
      costComponents,
    };
  }, [
    units,
    unitProductionCostOrigin,
    unitPackagingCostOrigin,
    unitWeightKg,
    unitCbm,
    inlandTransportUsd,
    exportDocumentationUsd,
    freightCostUsd,
    marineInsuranceRatePct,
    tariffRatePct,
    destVatRatePct,
    isVatRecoverable,
    destPortHandlingUsd,
    customsBrokerageUsd,
    bankFxSpreadPct,
    fxVolatilityBufferPct,
    incoterm,
    targetUnitPriceInvoicing,
    activeExchangeRate,
  ]);

  const originCurrency = SUPPORTED_CURRENCIES.find((c) => c.code === originCurrencyCode) || SUPPORTED_CURRENCIES[0];
  const targetCurrency = SUPPORTED_CURRENCIES.find((c) => c.code === targetCurrencyCode) || SUPPORTED_CURRENCIES[0];

  // Markdown Proforma Generation for Clipboard / File Export
  const generateProformaMarkdown = (): string => {
    return `# Export Cost & Profit Proforma Analysis
**Product:** ${productName}
**Trade Lane:** ${originCountry} → ${targetCountry}
**Harmonized Tariff (HS Hint):** ${hsCodeHint}
**Incoterm Contract:** ${incoterm}
**Order Quantity:** ${calculations.safeUnits} units | Gross Weight: ${calculations.totalWeightKg.toFixed(1)} kg | Volume: ${calculations.totalCbm.toFixed(2)} CBM

---

### Commercial Financial Summary (${targetCurrency.code})
- **Quoted Unit Price (${incoterm}):** ${targetCurrency.symbol}${targetUnitPriceInvoicing.toFixed(2)}
- **Total Export Revenue:** ${targetCurrency.symbol}${calculations.totalRevenueInvoicing.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${originCurrency.symbol}${calculations.totalRevenueOrigin.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
- **Total Exporter Cost:** ${targetCurrency.symbol}${calculations.totalExporterCostInvoicing.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- **Landed Cost Per Unit:** ${targetCurrency.symbol}${calculations.unitExporterCostInvoicing.toFixed(2)}
- **Total Net Profit:** ${targetCurrency.symbol}${calculations.totalGrossProfitInvoicing.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${originCurrency.symbol}${calculations.totalGrossProfitOrigin.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
- **Net Export Margin:** ${calculations.netProfitMarginPct.toFixed(1)}%

---

### Itemized Cost Breakdown (${targetCurrency.code})
1. **Production & Packaging:** ${targetCurrency.symbol}${calculations.totalProductionInvoicing.toFixed(2)} (${targetCurrency.symbol}${calculations.unitProductionInvoicing.toFixed(2)}/u)
2. **Origin Drayage & Port Customs:** ${targetCurrency.symbol}${calculations.totalOriginPortLogisticsInvoicing.toFixed(2)}
3. **International Freight (${freightMode.replace("_", " ").toUpperCase()}):** ${targetCurrency.symbol}${calculations.internationalFreightInvoicing.toFixed(2)}
4. **Marine Cargo Insurance (${marineInsuranceRatePct}%):** ${targetCurrency.symbol}${calculations.marineInsuranceInvoicing.toFixed(2)}
5. **Destination Tariff (${tariffRatePct}%):** ${targetCurrency.symbol}${calculations.destinationTariffDutyInvoicing.toFixed(2)}
6. **Destination Port Clearance & Brokerage:** ${targetCurrency.symbol}${calculations.destPortFeesInvoicing.toFixed(2)}
7. **Foreign Exchange & Wire Spread (${(bankFxSpreadPct + fxVolatilityBufferPct).toFixed(1)}%):** ${targetCurrency.symbol}${calculations.fxBankingCostInvoicing.toFixed(2)}

---

### Recommended Incoterm Pricing Floors (Break-Even)
- **EXW Floor:** ${targetCurrency.symbol}${calculations.breakEvenExwPrice.toFixed(2)}/u
- **FOB Floor:** ${targetCurrency.symbol}${calculations.breakEvenFobPrice.toFixed(2)}/u
- **CIF Floor:** ${targetCurrency.symbol}${calculations.breakEvenCifPrice.toFixed(2)}/u
- **DDP Floor:** ${targetCurrency.symbol}${calculations.breakEvenDdpPrice.toFixed(2)}/u

*Notice: Needs verification with the relevant official authority for real-time customs tariffs, port surcharges, and bi-lateral trade pacts.*`;
  };

  const handleCopyProforma = () => {
    const md = generateProformaMarkdown();
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const md = generateProformaMarkdown();
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export-cost-proforma-${productName.toLowerCase().replace(/[^a-z0-9]/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveToVault = () => {
    if (hasSaved) return;
    const md = generateProformaMarkdown();
    onSaveItem({
      type: "export",
      title: `Export Cost Proforma: ${productName} (${originCountry} → ${targetCountry})`,
      summary: `${incoterm} terms for ${units} units. Quoted: ${targetCurrency.symbol}${targetUnitPriceInvoicing}/u. Margin: ${calculations.netProfitMarginPct.toFixed(1)}% (${targetCurrency.symbol}${calculations.totalGrossProfitInvoicing.toFixed(0)}).`,
      content: md,
      category: "Cost & Profit Calculator",
      tags: [productName, originCountry, targetCountry, incoterm, "Export Costing"],
    });
    setHasSaved(true);
  };

  // AI Tariff & Route Optimization Advisory
  const handleRunAiAdvisory = async () => {
    const creditCheck = canPerformAIAction();
    if (!creditCheck.allowed) {
      if (creditCheck.reason === "need_signup") openSignupModal();
      else if (creditCheck.reason === "daily_limit_reached") openLimitModal();
      return;
    }

    setIsAiAnalyzing(true);
    setAiError(null);

    try {
      const res = await authFetch("/api/ai/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          productCategory: "Commercial Manufactured Goods",
          originCountry,
          targetCountry,
          buyerType: "B2B Importer / Commercial Wholesaler",
          businessSize: "Commercial Exporter",
          specificQuestion: `Costing analysis for ${units} units under ${incoterm} Incoterms. Quoted price ${targetCurrency.symbol}${targetUnitPriceInvoicing}, estimated freight $${freightCostUsd}, tariff rate ${tariffRatePct}%. What tariff concessions, FTA rules of origin, or freight consolidation strategies can optimize margins?`,
          subTool: "quotation-draft",
          budget: `$${calculations.totalRevenueInvoicing.toFixed(0)}`,
          quantity: `${units} units`,
          language: languageInfo.code,
          languageName: `${languageInfo.nativeName} (${languageInfo.name})`,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Failed to generate AI trade advisory.");
      }

      const advice =
        data.data?.incotermsGuidance ||
        data.data?.hsCodeGuidance ||
        data.data?.content ||
        data.content ||
        "Trade route analysis generated.";
      setAiAdvisoryText(advice);
      await consumeCredit();
    } catch (err: unknown) {
      const msg = normalizeErrorMessage(err, "Could not fetch automated AI trade advisory.");
      setAiError(msg);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-950/80 via-slate-900/90 to-cyan-950/80 border border-blue-500/30 backdrop-blur-2xl shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider">
              <Calculator className="w-3.5 h-3.5" />
              <span>International Trade Financial Modeler</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Export Cost &amp; Profit Calculator
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Estimate landed costs, cross-border shipping, foreign tariffs, port duties, and bank currency conversion spreads. Compare FOB vs CIF vs DDP profit margins before sending commercial quotations.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyProforma}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy Proforma in Markdown"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
              <span>{copied ? "Copied Proforma!" : "Copy Proforma"}</span>
            </button>

            <button
              onClick={handleSaveToVault}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                hasSaved
                  ? "bg-emerald-950 text-emerald-300 border-emerald-500/50"
                  : "bg-blue-600 hover:bg-blue-500 text-white border-blue-500"
              }`}
              title="Save to your cloud vault"
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>{hasSaved ? "Saved in Vault" : "Save Analysis"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Popular Trade Route Presets Carousel */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Globe2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Quick Corridor Presets</span>
          </label>
          <span className="text-[11px] text-slate-400">Click to autofill realistic trade corridor rates</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {ROUTE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleApplyPreset(preset.id)}
              className="px-3.5 py-2 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-xs font-semibold text-slate-300 hover:text-white shrink-0 flex items-center gap-2 transition-all cursor-pointer text-left shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <div>
                <span className="block font-bold text-white text-[11px]">{preset.name}</span>
                <span className="block text-[10px] text-slate-400">
                  {preset.originCurrency} → {preset.targetCurrency} • {preset.incoterm}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Main Calculator Form & Interactive Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Columns: Inputs & Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Section A: Product & Factory Cost Basis */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  1. Product &amp; Factory Production Economics
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Ex-Factory Basis</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Product Description</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Handmade Brass Tableware"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  HS Code Category (Tariff Guide)
                </label>
                <input
                  type="text"
                  value={hsCodeHint}
                  onChange={(e) => setHsCodeHint(e.target.value)}
                  placeholder="e.g. 7418.10 or 6204.42"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Origin Country</label>
                <input
                  type="text"
                  value={originCountry}
                  onChange={(e) => setOriginCountry(e.target.value)}
                  placeholder="e.g. India, Vietnam, Mexico"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Destination Country</label>
                <input
                  type="text"
                  value={targetCountry}
                  onChange={(e) => setTargetCountry(e.target.value)}
                  placeholder="e.g. United States, Germany, UAE"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 text-white outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Order Batch (Units)</label>
                <input
                  type="number"
                  min="1"
                  value={units}
                  onChange={(e) => setUnits(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Unit Cost ({originCurrency.code} {originCurrency.symbol})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={unitProductionCostOrigin}
                  onChange={(e) => setUnitProductionCostOrigin(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Packaging / Unit ({originCurrency.code} {originCurrency.symbol})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={unitPackagingCostOrigin}
                  onChange={(e) => setUnitPackagingCostOrigin(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 text-white outline-none font-mono"
                />
              </div>
            </div>

            {/* Quick Batch Physical Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Unit Weight</span>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <input
                    type="number"
                    step="0.05"
                    value={unitWeightKg}
                    onChange={(e) => setUnitWeightKg(Math.max(0.01, Number(e.target.value)))}
                    className="w-14 bg-transparent text-center font-bold text-white text-xs border-b border-slate-700 outline-none"
                  />
                  <span className="text-slate-400 text-[10px]">kg</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Total Gross Wt</span>
                <span className="font-mono font-bold text-white text-xs block mt-1">
                  {calculations.totalWeightKg.toFixed(1)} kg
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Unit Volume</span>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <input
                    type="number"
                    step="0.001"
                    value={unitCbm}
                    onChange={(e) => setUnitCbm(Math.max(0.0001, Number(e.target.value)))}
                    className="w-14 bg-transparent text-center font-bold text-white text-xs border-b border-slate-700 outline-none"
                  />
                  <span className="text-slate-400 text-[10px]">m³</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Total CBM</span>
                <span className="font-mono font-bold text-cyan-400 text-xs block mt-1">
                  {calculations.totalCbm.toFixed(2)} CBM
                </span>
              </div>
            </div>
          </div>

          {/* Section B: Freight & Shipping Parameters */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Ship className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  2. International Freight &amp; Logistics
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Port-to-Port Allocation</span>
            </div>

            {/* Freight Mode Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                { id: "ocean_lcl", label: "Ocean LCL (Consolidation)", icon: Ship },
                { id: "ocean_fcl_20", label: "Ocean 20ft Container", icon: Ship },
                { id: "ocean_fcl_40", label: "Ocean 40ft Container", icon: Ship },
                { id: "air_cargo", label: "Air Cargo (Standard)", icon: Plane },
                { id: "air_express", label: "Express Courier (DHL/FedEx)", icon: Plane },
                { id: "truck_crossborder", label: "Overland Freight (Truck)", icon: Truck },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = freightMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setFreightMode(m.id as FreightMode)}
                    className={`p-2.5 rounded-xl text-left border flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-cyan-950/60 border-cyan-500 text-white font-bold"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                    <span className="text-[11px] leading-tight">{m.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Inland Drayage / Port Trucking ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={inlandTransportUsd}
                  onChange={(e) => setInlandTransportUsd(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Ocean / Air Freight Total ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={freightCostUsd}
                  onChange={(e) => setFreightCostUsd(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Marine Insurance ({marineInsuranceRatePct}%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={marineInsuranceRatePct}
                  onChange={(e) => setMarineInsuranceRatePct(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 text-white outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section C: Destination Tariffs, Customs & Currency Conversion */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  3. Destination Tariffs &amp; Currency Conversion
                </h3>
              </div>
              <span className="text-[11px] text-amber-400/90 font-mono">Official Authority Rule</span>
            </div>

            {/* Currency Pairs & Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Origin Currency (Factory)
                </label>
                <select
                  value={originCurrencyCode}
                  onChange={(e) => setOriginCurrencyCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Invoicing Currency (Buyer)
                </label>
                <select
                  value={targetCurrencyCode}
                  onChange={(e) => setTargetCurrencyCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                  <span>Exchange Rate</span>
                  <span className="text-[10px] text-slate-400">1 {targetCurrency.code} =</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0.0001"
                    value={activeExchangeRate.toFixed(2)}
                    onChange={(e) => setCustomExchangeRate(Math.max(0.0001, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none font-mono"
                  />
                  <span className="text-slate-400 font-mono text-xs shrink-0">{originCurrency.symbol}</span>
                </div>
              </div>
            </div>

            {/* FX Bank Wire Fees & Hedging Risk Buffer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-300">Bank FX Wire Spread:</span>
                  <span className="font-mono font-bold text-amber-400">{bankFxSpreadPct}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4.5"
                  step="0.1"
                  value={bankFxSpreadPct}
                  onChange={(e) => setBankFxSpreadPct(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Foreign remittance margin deducted by international receiving banks.
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-300">FX Volatility Buffer:</span>
                  <span className="font-mono font-bold text-cyan-400">{fxVolatilityBufferPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="4.0"
                  step="0.1"
                  value={fxVolatilityBufferPct}
                  onChange={(e) => setFxVolatilityBufferPct(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Safety margin cushion against exchange rate fluctuations during 30-day transit.
                </span>
              </div>
            </div>

            {/* Tariffs & Destination Customs Clearance */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Import Tariff Duty ({tariffRatePct}%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={tariffRatePct}
                  onChange={(e) => setTariffRatePct(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-white outline-none font-mono"
                />
                <span className="text-[10px] text-amber-400/90 block mt-0.5">
                  Needs verification with official authority
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Destination Port Handling ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={destPortHandlingUsd}
                  onChange={(e) => setDestPortHandlingUsd(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Customs Brokerage / Entry ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={customsBrokerageUsd}
                  onChange={(e) => setCustomsBrokerageUsd(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-white outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section D: Pricing Simulation & Incoterm Strategy */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  4. Commercial Incoterms &amp; Target Quotation
                </h3>
              </div>
              <span className="text-[11px] text-emerald-400 font-mono">Invoice Terms</span>
            </div>

            {/* Incoterm Selector Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { term: "EXW", label: "EXW (Ex Works)", desc: "Buyer covers all shipping" },
                { term: "FOB", label: "FOB (Free on Board)", desc: "Exporter pays to ship at port" },
                { term: "CIF", label: "CIF (Cost, Ins, Freight)", desc: "Exporter pays sea/air + ins" },
                { term: "DDP", label: "DDP (Delivered Duty Paid)", desc: "Exporter covers tariffs + door" },
              ].map((item) => {
                const isSelected = incoterm === item.term;
                return (
                  <button
                    key={item.term}
                    onClick={() => setIncoterm(item.term as IncotermType)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-950/70 border-emerald-500 text-white shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/40"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                    }`}
                  >
                    <span className="block font-black text-xs text-white">{item.term}</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5 leading-tight">{item.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Target Quoted Price per Unit */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold text-xs">
                  Your Target Quoted Price per Unit ({targetCurrency.code})
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Amount billed to foreign buyer on Proforma Invoice under <strong className="text-emerald-400">{incoterm}</strong> terms.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-white">{targetCurrency.symbol}</span>
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  value={targetUnitPriceInvoicing}
                  onChange={(e) => setTargetUnitPriceInvoicing(Math.max(0.1, Number(e.target.value)))}
                  className="w-28 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-500 text-white text-base font-mono font-bold text-right outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Columns: Real-Time Intelligence & Results Dashboard (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Executive Profit Summary Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                  Order Profitability Verdict
                </span>
                <h3 className="text-base font-black text-white">
                  {incoterm} Margin Analysis
                </h3>
              </div>

              <div
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                  calculations.netProfitMarginPct >= 25
                    ? "bg-emerald-950 text-emerald-300 border-emerald-500/50"
                    : calculations.netProfitMarginPct >= 15
                    ? "bg-cyan-950 text-cyan-300 border-cyan-500/50"
                    : "bg-rose-950 text-rose-300 border-rose-500/50"
                }`}
              >
                {calculations.netProfitMarginPct.toFixed(1)}% Net Margin
              </div>
            </div>

            {/* Primary KPI Grid */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Revenue</span>
                <span className="text-lg font-black text-white font-mono block mt-0.5">
                  {targetCurrency.symbol}{calculations.totalRevenueInvoicing.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {originCurrency.symbol}{calculations.totalRevenueOrigin.toLocaleString(undefined, { maximumFractionDigits: 0 })} {originCurrency.code}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Net Profit</span>
                <span
                  className={`text-lg font-black font-mono block mt-0.5 ${
                    calculations.totalGrossProfitInvoicing >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {targetCurrency.symbol}{calculations.totalGrossProfitInvoicing.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {originCurrency.symbol}{calculations.totalGrossProfitOrigin.toLocaleString(undefined, { maximumFractionDigits: 0 })} {originCurrency.code}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Per-Unit Profit</span>
                <span className="text-sm font-bold text-emerald-400 font-mono block mt-0.5">
                  +{targetCurrency.symbol}{calculations.unitProfitInvoicing.toFixed(2)}/u
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Landed Cost / Unit</span>
                <span className="text-sm font-bold text-slate-200 font-mono block mt-0.5">
                  {targetCurrency.symbol}{calculations.unitExporterCostInvoicing.toFixed(2)}/u
                </span>
              </div>
            </div>

            {/* Cost Breakdown Progress Bar */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-300">Cost Structure Breakdown</span>
                <span className="text-slate-500 font-mono">100% Total Cost</span>
              </div>

              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                <div
                  style={{ width: `${calculations.costComponents.productionPct}%` }}
                  className="bg-blue-500 h-full transition-all"
                  title={`Production: ${calculations.costComponents.productionPct}%`}
                />
                <div
                  style={{ width: `${calculations.costComponents.freightLogisticsPct}%` }}
                  className="bg-cyan-400 h-full transition-all"
                  title={`Shipping & Freight: ${calculations.costComponents.freightLogisticsPct}%`}
                />
                <div
                  style={{ width: `${calculations.costComponents.tariffsDutyPct}%` }}
                  className="bg-amber-400 h-full transition-all"
                  title={`Tariffs & Port Duties: ${calculations.costComponents.tariffsDutyPct}%`}
                />
                <div
                  style={{ width: `${calculations.costComponents.fxBankingPct}%` }}
                  className="bg-purple-400 h-full transition-all"
                  title={`FX & Wire Spread: ${calculations.costComponents.fxBankingPct}%`}
                />
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Production: {calculations.costComponents.productionPct}%</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>Freight/Insurance: {calculations.costComponents.freightLogisticsPct}%</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Tariffs &amp; Duty: {calculations.costComponents.tariffsDutyPct}%</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span>Bank FX Spread: {calculations.costComponents.fxBankingPct}%</span>
                </span>
              </div>
            </div>

            {/* Incoterm Floor Rate Quotation Matrix */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  Break-Even Floor Price Matrix
                </span>
                <span className="text-[10px] text-slate-400">Zero-Loss Threshold</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
                  <span className="font-semibold text-slate-300">EXW Floor (Factory Gate):</span>
                  <span className="font-mono font-bold text-white">
                    {targetCurrency.symbol}{calculations.breakEvenExwPrice.toFixed(2)}/u
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
                  <span className="font-semibold text-slate-300">FOB Floor (Origin Port):</span>
                  <span className="font-mono font-bold text-blue-300">
                    {targetCurrency.symbol}{calculations.breakEvenFobPrice.toFixed(2)}/u
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
                  <span className="font-semibold text-slate-300">CIF Floor (Dest. Port):</span>
                  <span className="font-mono font-bold text-cyan-300">
                    {targetCurrency.symbol}{calculations.breakEvenCifPrice.toFixed(2)}/u
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
                  <span className="font-semibold text-slate-300">DDP Floor (Landed Door):</span>
                  <span className="font-mono font-bold text-amber-300">
                    {targetCurrency.symbol}{calculations.breakEvenDdpPrice.toFixed(2)}/u
                  </span>
                </div>
              </div>
            </div>

            {/* AI Optimization & Route Strategy CTA */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleRunAiAdvisory}
                disabled={isAiAnalyzing}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {isAiAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Corridors &amp; Tariffs...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-cyan-300" />
                    <span>Get AI Tariff &amp; Logistics Advisory</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadFile}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Proforma Sheet (.md)</span>
              </button>
            </div>

            {/* AI Error Alert */}
            {aiError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs">
                {aiError}
              </div>
            )}

            {/* AI Advisory Response Card */}
            {aiAdvisoryText && (
              <div className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-500/40 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-blue-300">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>AI Trade Logistics Advisory</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px] whitespace-pre-wrap">
                  {aiAdvisoryText}
                </p>
              </div>
            )}

            {/* Mandatory Official Authority Notice */}
            <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200/90 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Official Authority Notice:</strong>
                <span>
                  Needs verification with the relevant official authority. Customs tariffs, anti-dumping duties, and port surcharges fluctuate based on bilateral trade pacts and commodity classification.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
