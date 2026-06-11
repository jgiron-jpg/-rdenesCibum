// Precios por canal de venta
// Fuente: ERP CIBUM - Clasificación de precios

export const PUNTOS_DE_VENTA = [
  "LAS TORRES",
  "TORRES EXPRESS",
  "PUERTA DEL SOL",
  "OTROS",
  "PEDIDOS YA",
  "BICIMANIA",
  "BROT",
  "CAOBA FARMS",
  "DAILY MARKET",
  "DELICA",
  "FUN TOURS",
  "JAMONERIA",
  "KEMIK",
  "MERCADITO DE LOLA",
  "REVOLUTION BIKES",
  "SOLOMOTOS XELA",
  "SUPER AGUA VIVA",
  "THE COFEE ROOM",
  "THE OUTDOORS HUB",
  "TIENDAS B3",
  "TIENDAS MASS RAMBLA",
  "MEAT CLUB",
];

// Mapa de precios: canal -> nombre producto -> precio
export const PRECIOS_POR_CANAL: Record<string, Record<string, number>> = {
  "LAS TORRES": {
    "Especial de Daniel": 18.65,
    "Honey Chipotle": 18.65,
    "Lemon Pepper": 18.65,
    "Teriyaki": 18.65,
    "Sabor de Temporada": 18.65,
    "Sticks 26gr": 12.13,
    "Jerky 35gr": 26.57,
    "Jerky 81gr": 57.37,
  },
  "TORRES EXPRESS": {
    "Especial de Daniel": 18.65,
    "Honey Chipotle": 18.65,
    "Lemon Pepper": 18.65,
    "Teriyaki": 18.65,
    "Sabor de Temporada": 18.65,
    "Sticks 26gr": 12.13,
    "Jerky 35gr": 26.57,
    "Jerky 81gr": 57.37,
  },
  "PUERTA DEL SOL": {
    "Especial de Daniel": 20.72,
    "Honey Chipotle": 20.72,
    "Lemon Pepper": 20.72,
    "Teriyaki": 20.72,
    "Sabor de Temporada": 20.72,
    "Sticks 26gr": 10.50,
    "Jerky 35gr": 24.50,
    "Jerky 81gr": 52.50,
  },
  "PEDIDOS YA": {
    "Especial de Daniel": 20.72,
    "Honey Chipotle": 20.72,
    "Lemon Pepper": 20.72,
    "Teriyaki": 20.72,
    "Sabor de Temporada": 20.72,
    "Sticks 26gr": 14.99,
    "Jerky 35gr": 25.99,
    "Jerky 81gr": 55.00,
  },
  "OTROS": {
    "Especial de Daniel": 21.00,
    "Honey Chipotle": 21.00,
    "Lemon Pepper": 21.00,
    "Teriyaki": 21.00,
    "Sabor de Temporada": 21.00,
    "Sticks 26gr": 15.00,
    "Jerky 35gr": 26.25,
    "Jerky 81gr": 56.00,
  },
  "CLIENTE REDES SOCIALES": {
    "Especial de Daniel": 30.00,
    "Honey Chipotle": 30.00,
    "Lemon Pepper": 30.00,
    "Teriyaki": 30.00,
    "Sabor de Temporada": 30.00,
    "Sticks 26gr": 20.00,
    "Jerky 35gr": 37.50,
    "Jerky 81gr": 80.00,
  },
};

// Precio por defecto si no hay canal definido
export const PRECIOS_DEFAULT: Record<string, number> = {
  "Especial de Daniel": 18.00,
  "Honey Chipotle": 18.00,
  "Lemon Pepper": 18.00,
  "Teriyaki": 18.00,
  "Sabor de Temporada": 18.00,
  "Sticks 26gr": 10.50,
  "Jerky 35gr": 24.50,
  "Jerky 81gr": 52.50,
};

// NITs conocidos por punto de venta — agregar los que falten
export const NIT_POR_PUNTO: Record<string, string> = {
  "LAS TORRES": "26532476",
  "TORRES EXPRESS": "26532476",
  "BICIMANIA": "5199654",
  "BROT": "94577994",
  "CAOBA FARMS": "96814357",
  "DELICA": "1699431",
};

export function getPrecio(nombreProducto: string, canal: string): number {
  // Para puntos de venta específicos que son "OTROS", usar precios OTROS
  const preciosCanal = PRECIOS_POR_CANAL[canal] ?? PRECIOS_POR_CANAL["OTROS"];
  return preciosCanal[nombreProducto] ?? PRECIOS_DEFAULT[nombreProducto] ?? 0;
}
