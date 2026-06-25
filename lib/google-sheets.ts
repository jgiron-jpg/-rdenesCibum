import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEETS_ID!;
const SHEET_NAME = "PEDIDOS";

// Columna 30 (índice 29) = ID interno para poder actualizar filas
// Coincide con la estructura del ERP original

const PRODUCTO_COL: Record<string, number> = {
  "cbaa1e02-aafa-489d-b369-4f8cf636c38e": 8,  // Especial de Daniel
  "db599147-9b28-41cf-b965-d370eb087da0": 9,  // Honey Chipotle
  "3b83cdc0-5564-4695-ba5e-3cc78974b468": 10, // Lemon Pepper
  "2f0dadec-ffc6-42d1-8d50-2281eb81ab4d": 11, // Teriyaki
  "e1d01857-7c27-4030-bec3-559b55d0662e": 12, // Sabor de Temporada
  "f84e2d8a-67a2-4cce-b18f-80a9cf588408": 13, // Sticks 26gr
  "e8389401-cd45-48e1-a0d3-94685f93865d": 14, // Jerky 35gr
  "de80e846-0605-4024-83c5-2703dfdb3977": 15, // Jerky 81gr
};

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ordenToRow(orden: any): (string | number)[] {
  // Fila de 30 columnas — misma estructura que el ERP original
  const row: (string | number)[] = new Array(30).fill("");

  const cliente = orden.cliente ?? {};
  const items: { producto_id: string; cantidad: number }[] = orden.orden_items ?? [];

  // Cantidades por producto (cols 8-15)
  const qtys = new Array(8).fill(0);
  for (const item of items) {
    const colOffset = PRODUCTO_COL[item.producto_id];
    if (colOffset !== undefined) qtys[colOffset - 8] = item.cantidad;
  }

  row[0]  = orden.fecha_ingreso ? new Date(orden.fecha_ingreso).toLocaleString("es-GT", { timeZone: "America/Guatemala" }) : "";
  row[1]  = orden.fecha_entrega_comprometida ?? "";
  row[2]  = orden.fecha_cobro ?? "";
  row[3]  = orden.estado_produccion ?? "";
  row[4]  = orden.estado_comercial ?? "";
  row[5]  = orden.venta_a ?? "";
  row[6]  = orden.venta_de ?? "";
  row[7]  = orden.tipo_cliente ?? "";
  row[8]  = qtys[0]; // Especial de Daniel
  row[9]  = qtys[1]; // Honey Chipotle
  row[10] = qtys[2]; // Lemon Pepper
  row[11] = qtys[3]; // Teriyaki
  row[12] = qtys[4]; // Sabor de Temporada
  row[13] = qtys[5]; // Sticks 26gr
  row[14] = qtys[6]; // Jerky 35gr
  row[15] = qtys[7]; // Jerky 81gr
  row[16] = typeof orden.total_q === "number" ? Math.round(orden.total_q * 100) / 100 : Number(orden.total_q) || 0;
  row[17] = cliente.nit ?? "";
  row[18] = (orden.venta_a === "PUNTO DE VENTA" ? orden.venta_de : cliente.nombre) ?? "";
  row[19] = cliente.telefono ?? "";
  row[20] = cliente.direccion ?? "";
  row[21] = cliente.medio_contacto ?? "";
  row[22] = orden.usuario_red ?? "";
  row[23] = orden.comentarios ?? "";
  row[24] = orden.medio_envio ?? "";
  row[25] = orden.metodo_pago ?? "";
  row[26] = orden.forma_pago ?? "";
  row[27] = orden.usuario_registro ?? "";
  row[28] = "";
  row[29] = String(orden.id ?? "").slice(0, 8).toUpperCase(); // ID para tracking

  return row;
}

export async function agregarOrdenSheet(orden: Record<string, unknown>) {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:AD`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [ordenToRow(orden)] },
  });
}

export async function borrarOrdenSheet(ordenId: string) {
  const sheets = getSheets();
  const id = ordenId.slice(0, 8).toUpperCase();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!AD:AD`,
  });

  const filas = res.data.values ?? [];
  const rowIndex = filas.findIndex((r) => r[0] === id);
  if (rowIndex < 1) return;

  // Obtener spreadsheet ID de la hoja para batchUpdate
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === SHEET_NAME);
  const sheetId = sheet?.properties?.sheetId ?? 0;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: "ROWS",
            startIndex: rowIndex,
            endIndex: rowIndex + 1,
          },
        },
      }],
    },
  });
}

// ─── Control Ericka ──────────────────────────────────────────────────────────

const ERICKA_SHEET = "CONTROL ERICKA";
const SKU_COLS = [
  "especial_daniel", "honey_chipotle", "lemon_pepper", "teriyaki",
  "palitos_26g", "jerky_35g", "jerky_81g",
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function movimientoToRow(mov: any): (string | number)[] {
  return [
    mov.fecha ?? "",
    mov.tipo ?? "",
    mov.referencia ?? "",
    ...SKU_COLS.map((k) => (typeof mov[k] === "number" ? mov[k] : Number(mov[k]) || 0)),
    typeof mov.total_unidades === "number" ? mov.total_unidades : Number(mov.total_unidades) || 0,
    mov.notas ?? "",
  ];
}

export async function agregarMovimientoErickaSheet(mov: Record<string, unknown>) {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${ERICKA_SHEET}!A:K`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [movimientoToRow(mov)] },
  });
}

// ─── Órdenes ─────────────────────────────────────────────────────────────────

export async function actualizarOrdenSheet(orden: Record<string, unknown>) {
  const sheets = getSheets();
  const ordenId = String(orden.id ?? "").slice(0, 8).toUpperCase();

  // Buscar en col 30 (AD) por el ID
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!AD:AD`,
  });

  const filas = res.data.values ?? [];
  const rowIndex = filas.findIndex((r) => r[0] === ordenId);

  if (rowIndex < 1) {
    await agregarOrdenSheet(orden);
    return;
  }

  const sheetRow = rowIndex + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A${sheetRow}:AD${sheetRow}`,
    valueInputOption: "RAW",
    requestBody: { values: [ordenToRow(orden)] },
  });
}
