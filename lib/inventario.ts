export const SKUS = [
  { key: "especial_daniel", label: "Especial de Daniel", marca: "MR.BEEF" },
  { key: "honey_chipotle",  label: "Honey Chipotle",     marca: "MR.BEEF" },
  { key: "lemon_pepper",    label: "Lemon Pepper",        marca: "MR.BEEF" },
  { key: "teriyaki",        label: "Teriyaki",            marca: "MR.BEEF" },
  { key: "palitos_26g",     label: "Palitos 26g",         marca: "JACK LINKS" },
  { key: "jerky_35g",       label: "Jerky 35g",           marca: "JACK LINKS" },
  { key: "jerky_81g",       label: "Jerky 81g",           marca: "JACK LINKS" },
] as const;

export type SkuKey = (typeof SKUS)[number]["key"];
export type StockPorSku = Record<SkuKey, number>;

export function stockVacio(): StockPorSku {
  return {
    especial_daniel: 0, honey_chipotle: 0, lemon_pepper: 0, teriyaki: 0,
    palitos_26g: 0, jerky_35g: 0, jerky_81g: 0,
  };
}

export const OPTIMO_DEFAULT: StockPorSku = {
  especial_daniel: 350, honey_chipotle: 200, lemon_pepper: 300, teriyaki: 200,
  palitos_26g: 200, jerky_35g: 100, jerky_81g: 80,
};

export interface Movimiento {
  id: string;
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
  notas: string | null;
  created_at: string;
}

export interface ConfigEricka {
  especial_daniel_optimo: number;
  honey_chipotle_optimo: number;
  lemon_pepper_optimo: number;
  teriyaki_optimo: number;
  palitos_26g_optimo: number;
  jerky_35g_optimo: number;
  jerky_81g_optimo: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchMovimientos(supabase: any): Promise<Movimiento[]> {
  const PAGE = 1000;
  let from = 0;
  const all: Movimiento[] = [];
  for (;;) {
    const { data, error } = await supabase
      .from("ericka_movimientos")
      .select("*")
      .order("fecha", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error || !data) break;
    all.push(...(data as Movimiento[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

export function calcularStock(movimientos: Movimiento[]): StockPorSku {
  const stock = stockVacio();
  for (const m of movimientos) {
    for (const sku of SKUS) {
      stock[sku.key] += (m[sku.key] as number) ?? 0;
    }
  }
  return stock;
}

export function getOptimos(config: ConfigEricka | null): StockPorSku {
  if (!config) return OPTIMO_DEFAULT;
  const opt = stockVacio();
  for (const sku of SKUS) {
    opt[sku.key] = (config as Record<string, number>)[`${sku.key}_optimo`] ?? OPTIMO_DEFAULT[sku.key];
  }
  return opt;
}

export function margenColor(pct: number): string {
  if (pct < 80)  return "bg-red-500/15 text-red-500 border-red-500/30";
  if (pct > 120) return "bg-amber-500/15 text-amber-500 border-amber-500/30";
  return "bg-green-500/15 text-green-500 border-green-500/30";
}
