// Lógica del módulo de inventario en consignación

export const SKUS = [
  { key: "especial_daniel", label: "Especial de Daniel", marca: "MR.BEEF" },
  { key: "honey_chipotle", label: "Honey Chipotle", marca: "MR.BEEF" },
  { key: "lemon_pepper", label: "Lemon Pepper", marca: "MR.BEEF" },
  { key: "teriyaki", label: "Teriyaki", marca: "MR.BEEF" },
  { key: "palitos_26g", label: "Palitos 26g", marca: "JACK LINKS" },
  { key: "jerky_35g", label: "Jerky 35g", marca: "JACK LINKS" },
  { key: "jerky_81g", label: "Jerky 81g", marca: "JACK LINKS" },
] as const;

export type SkuKey = (typeof SKUS)[number]["key"];

export const TIPOS_MOVIMIENTO = ["ENTREGA", "VENTA_REPORTADA", "AJUSTE", "DEVOLUCION"] as const;
export const ESTADOS_MOVIMIENTO = ["PENDIENTE", "PAGADO", "CONCILIADO"] as const;

export interface Distribuidor {
  id: string;
  nombre: string;
  direccion: string | null;
  zona: string | null;
  contacto: string | null;
  activo: boolean;
}

export interface Movimiento {
  id: string;
  distribuidor_id: string;
  fecha: string;
  tipo: string;
  referencia: string | null;
  especial_daniel: number;
  honey_chipotle: number;
  lemon_pepper: number;
  teriyaki: number;
  palitos_26g: number;
  jerky_35g: number;
  jerky_81g: number;
  total_unidades: number;
  total_q: number | null;
  contrasena_pago: string | null;
  estado: string | null;
  notas: string | null;
  created_at: string;
}

export interface ConfigInventario {
  distribuidor_id: string;
  [key: string]: string | number;
}

export type StockPorSku = Record<SkuKey, number>;

// Mínimos y óptimos por defecto cuando no hay config guardada
export const MIN_DEFAULT: StockPorSku = {
  especial_daniel: 10, honey_chipotle: 10, lemon_pepper: 10, teriyaki: 10,
  palitos_26g: 5, jerky_35g: 5, jerky_81g: 5,
};

export const OPTIMO_DEFAULT: StockPorSku = {
  especial_daniel: 30, honey_chipotle: 30, lemon_pepper: 30, teriyaki: 30,
  palitos_26g: 15, jerky_35g: 15, jerky_81g: 15,
};

export function stockVacio(): StockPorSku {
  return {
    especial_daniel: 0, honey_chipotle: 0, lemon_pepper: 0, teriyaki: 0,
    palitos_26g: 0, jerky_35g: 0, jerky_81g: 0,
  };
}

// Calcular stock actual: suma de todos los movimientos
export function calcularStock(movimientos: Movimiento[]): StockPorSku {
  const stock = stockVacio();
  for (const m of movimientos) {
    for (const sku of SKUS) {
      stock[sku.key] += (m[sku.key] as number) ?? 0;
    }
  }
  return stock;
}

export function getMinimos(config: ConfigInventario | null): StockPorSku {
  if (!config) return MIN_DEFAULT;
  const min = stockVacio();
  for (const sku of SKUS) {
    min[sku.key] = (config[`min_${sku.key}`] as number) ?? MIN_DEFAULT[sku.key];
  }
  return min;
}

export function getOptimos(config: ConfigInventario | null): StockPorSku {
  if (!config) return OPTIMO_DEFAULT;
  const opt = stockVacio();
  for (const sku of SKUS) {
    opt[sku.key] = (config[`optimo_${sku.key}`] as number) ?? OPTIMO_DEFAULT[sku.key];
  }
  return opt;
}

// Semáforo: rojo (crítico) / amarillo (atención) / verde (ok)
export type Semaforo = "rojo" | "amarillo" | "verde";

export function semaforoSku(stock: number, min: number, optimo: number): Semaforo {
  if (stock < min) return "rojo";
  if (stock < (min + optimo) / 2) return "amarillo";
  return "verde";
}

export function colorSemaforo(s: Semaforo): string {
  const map = {
    rojo: "bg-red-500/15 text-red-500 border-red-500/30",
    amarillo: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    verde: "bg-green-500/15 text-green-500 border-green-500/30",
  };
  return map[s];
}

export function dotSemaforo(s: Semaforo): string {
  const map = { rojo: "bg-red-500", amarillo: "bg-amber-500", verde: "bg-green-500" };
  return map[s];
}

// Consumo promedio semanal de las últimas 4 semanas (solo salidas)
export function consumoPromedioSemanal(movimientos: Movimiento[]): StockPorSku {
  const hace4Semanas = new Date();
  hace4Semanas.setDate(hace4Semanas.getDate() - 28);

  const consumo = stockVacio();
  for (const m of movimientos) {
    if (new Date(m.fecha) < hace4Semanas) continue;
    for (const sku of SKUS) {
      const val = (m[sku.key] as number) ?? 0;
      if (val < 0) consumo[sku.key] += Math.abs(val);
    }
  }
  // Dividir entre 4 semanas
  for (const sku of SKUS) {
    consumo[sku.key] = consumo[sku.key] / 4;
  }
  return consumo;
}

// Días de cobertura: stock actual / consumo diario
export function diasCobertura(stock: number, consumoSemanal: number): number {
  if (consumoSemanal <= 0) return Infinity;
  return stock / (consumoSemanal / 7);
}

export type Riesgo = "ALTO" | "MEDIO" | "BAJO";

export function nivelRiesgo(dias: number): Riesgo {
  if (dias < 3) return "ALTO";
  if (dias < 7) return "MEDIO";
  return "BAJO";
}

export function colorRiesgo(r: Riesgo): string {
  const map = {
    ALTO: "bg-red-500/15 text-red-500 border-red-500/30",
    MEDIO: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    BAJO: "bg-green-500/15 text-green-500 border-green-500/30",
  };
  return map[r];
}
