// lib/settings.ts
// Definiciones de tipos, valores por defecto y concordancia gramatical para configuración parametrizable

export interface BankAccount {
  id: string;
  bankName: string; // ej. Banco Industrial (BI)
  accountType: string; // ej. Monetaria, Ahorro
  accountNumber: string; // ej. 000-000000-0
  accountHolder: string; // ej. Alegra Boutique
}

export type ProductNounKey = "prendas" | "juguetes" | "platillos" | "productos" | "personalizado";

export interface StoreSettings {
  storeName: string;
  tagline: string;
  logoUrl?: string;
  productNoun: ProductNounKey;
  nounSingular: string; // ej. prenda, juguete, platillo, producto
  nounPlural: string; // ej. prendas, juguetes, platillos, productos
  nounGender: "f" | "m"; // "f" (femenino: reservadas) | "m" (masculino: reservados)
  bankAccounts: BankAccount[];
  updatedAt?: string;
}

export const PRESET_NOUNS: Record<
  Exclude<ProductNounKey, "personalizado">,
  { singular: string; plural: string; gender: "f" | "m"; label: string; icon: string }
> = {
  prendas: {
    singular: "prenda",
    plural: "prendas",
    gender: "f",
    label: "Prendas (Ropa / Boutique)",
    icon: "👗",
  },
  juguetes: {
    singular: "juguete",
    plural: "juguetes",
    gender: "m",
    label: "Juguetes (Juguetería / Infantil)",
    icon: "🧸",
  },
  platillos: {
    singular: "platillo",
    plural: "platillos",
    gender: "m",
    label: "Platillos (Restaurante / Comida)",
    icon: "🍽️",
  },
  productos: {
    singular: "producto",
    plural: "productos",
    gender: "m",
    label: "Productos (General / Variado)",
    icon: "📦",
  },
};

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: "ALEGRA",
  tagline: "Inventario & Live POS",
  logoUrl: "",
  productNoun: "prendas",
  nounSingular: "prenda",
  nounPlural: "prendas",
  nounGender: "f",
  bankAccounts: [
    {
      id: "bi_default",
      bankName: "Banco Industrial (BI)",
      accountType: "Monetaria",
      accountNumber: "000-000000-0",
      accountHolder: "Alegra Boutique",
    },
    {
      id: "banrural_default",
      bankName: "Banrural",
      accountType: "Ahorro / Monetaria",
      accountNumber: "000-000000-0",
      accountHolder: "Alegra Boutique",
    },
  ],
};

/**
 * Retorna textos adaptados a la concordancia de género y número del sustantivo configurado
 */
export function getGrammarTexts(settings?: Partial<StoreSettings> | null) {
  const s = { ...DEFAULT_STORE_SETTINGS, ...settings };
  const singular = s.nounSingular?.trim().toLowerCase() || "prenda";
  const plural = s.nounPlural?.trim().toLowerCase() || "prendas";
  const isFem = s.nounGender === "f";

  // Capitalizados
  const capSingular = singular.charAt(0).toUpperCase() + singular.slice(1);
  const capPlural = plural.charAt(0).toUpperCase() + plural.slice(1);

  return {
    singular,
    plural,
    capSingular,
    capPlural,
    gender: s.nounGender,
    
    // Artículos y demostrativos
    articleSingular: isFem ? "la" : "el",
    articlePlural: isFem ? "las" : "los",
    thisSingular: isFem ? "esta" : "este",
    thesePlural: isFem ? "estas" : "estos",

    // Participios y adjetivos concordantes
    reservedPlural: isFem ? "reservadas" : "reservados",
    selectedPlural: isFem ? "seleccionadas" : "seleccionados",
    soldPlural: isFem ? "vendidas" : "vendidos",
    availablePlural: `${capPlural} disponibles`,

    // Frases completas utilizadas en la interfaz
    reservedBanner: `Tus ${plural} están ${isFem ? "reservadas" : "reservados"} temporalmente. Envíanos tu comprobante para programar tu envío.`,
    photosHeading: `Fotos de tus ${capPlural}`,
    catalogHeading: `Catálogo de ${capPlural} ${isFem ? "Seleccionadas" : "Seleccionados"}`,
    whatsappInterest: (itemName: string, barcode: string) =>
      `¡Hola ${s.storeName}! 💕 Me interesa ${isFem ? "la" : "el"} ${singular} *${itemName}* (Código: *${barcode}*) que vi en el catálogo.`,
  };
}
