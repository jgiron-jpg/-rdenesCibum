// Importa el histórico del Excel "CONTROL ERICKA" a Supabase
// Solo lee la hoja más reciente (es acumulativa desde nov 2023)
// Uso: node scripts/importar-control-ericka.js

const { readFile, utils } = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://cefmkwyjwtxbryvcpjcc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlZm1rd3lqd3R4YnJ5dmNwamNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODU3NjksImV4cCI6MjA5NjE2MTc2OX0.kgCM30qBcXiOGGEK3Rhw-jUziFcsRgE9bHld8sNlyQk";

const ARCHIVO = "C:/Users/joaco/Downloads/Copia de CONTROL ERICKA.xlsx";
const NOMBRE_DISTRIBUIDOR = "Consignación Ericka";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function parseNum(v) {
  if (v === null || v === undefined || v === "") return 0;
  return parseInt(String(v).replace(/,/g, "")) || 0;
}

function parseQ(v) {
  if (!v) return null;
  const limpio = String(v).replace(/[Q,\s]/g, "").replace("−", "-");
  const n = parseFloat(limpio);
  return isNaN(n) ? null : n;
}

function parseFechaRecibo(ref) {
  // "Recibo 20/11/2023" → "2023-11-20"
  const m = String(ref).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

async function main() {
  const wb = readFile(ARCHIVO);
  const hojaReciente = wb.SheetNames[0];
  console.log(`Leyendo hoja: ${hojaReciente}`);

  const rows = utils.sheet_to_json(wb.Sheets[hojaReciente], { header: 1, raw: false });

  // Buscar o crear distribuidor
  let { data: dist } = await supabase
    .from("distribuidores")
    .select("id")
    .eq("nombre", NOMBRE_DISTRIBUIDOR)
    .maybeSingle();

  if (!dist) {
    const { data: creado, error } = await supabase
      .from("distribuidores")
      .insert({ nombre: NOMBRE_DISTRIBUIDOR, zona: "bodega" })
      .select()
      .single();
    if (error) throw error;
    dist = creado;
    console.log("Distribuidor creado:", NOMBRE_DISTRIBUIDOR);
  } else {
    // Limpiar movimientos previos para no duplicar si se corre dos veces
    await supabase.from("inventario_movimientos").delete().eq("distribuidor_id", dist.id);
    console.log("Movimientos previos eliminados (re-importación limpia)");
  }

  const movimientos = [];
  let fechaActual = "2023-11-20"; // fallback inicial

  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[2]) continue; // sin referencia → fila vacía
    const ref = String(r[2]).trim();
    if (!ref) continue;
    // Saltar filas de resumen — no son movimientos
    if (ref.toLowerCase() === "inventario actual") continue;

    const cantidades = {
      especial_daniel: parseNum(r[3]),
      honey_chipotle: parseNum(r[4]),
      lemon_pepper: parseNum(r[5]),
      teriyaki: parseNum(r[6]),
      palitos_26g: parseNum(r[7]),
      jerky_35g: parseNum(r[8]),
      jerky_81g: parseNum(r[9]),
    };

    const total = Object.values(cantidades).reduce((s, v) => s + v, 0);
    if (total === 0 && !ref.toLowerCase().startsWith("recibo")) continue; // fila sin datos

    const esRecibo = ref.toLowerCase().startsWith("recibo");
    const esAjuste = /ajuste|cambio|cuadre|inventario/i.test(ref);

    if (esRecibo) {
      const f = parseFechaRecibo(ref);
      if (f) fechaActual = f;
    }

    const tipo = esRecibo ? "ENTREGA" : esAjuste ? "AJUSTE" : "VENTA_REPORTADA";

    movimientos.push({
      distribuidor_id: dist.id,
      fecha: fechaActual,
      tipo,
      referencia: ref,
      ...cantidades,
      total_q: parseQ(r[11]),
      contrasena_pago: r[12] ? String(r[12]).trim() : null,
      estado: r[13] ? String(r[13]).trim().toUpperCase() : null,
    });
  }

  console.log(`Movimientos a insertar: ${movimientos.length}`);

  const BATCH = 200;
  let insertados = 0;
  for (let i = 0; i < movimientos.length; i += BATCH) {
    const { error } = await supabase
      .from("inventario_movimientos")
      .insert(movimientos.slice(i, i + BATCH));
    if (error) {
      console.error("Error en lote:", error.message);
      process.exit(1);
    }
    insertados += Math.min(BATCH, movimientos.length - i);
    console.log(`  ${insertados}/${movimientos.length}`);
  }

  // Resumen de stock final
  const stock = {};
  for (const m of movimientos) {
    for (const k of ["especial_daniel","honey_chipotle","lemon_pepper","teriyaki","palitos_26g","jerky_35g","jerky_81g"]) {
      stock[k] = (stock[k] ?? 0) + m[k];
    }
  }
  console.log("\n✅ Importación completa. Stock actual calculado:");
  console.log(stock);
}

main().catch(e => { console.error(e); process.exit(1); });
