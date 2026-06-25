import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEETS_ID!;
const SHEET_NAME = "PEDIDOS";
const HEADERS = [
  "ID", "Fecha Ingreso", "Fecha Entrega", "Cliente", "Venta A", "Venta De",
  "Estado Producción", "Estado Comercial", "Total Unidades", "Total Q",
  "Medio Envío", "Método Pago", "Forma Pago", "Mes", "Tipo Cliente", "Comentarios",
];

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

export async function inicializarSheet() {
  const sheets = getSheets();
  // Verificar si ya tiene encabezados
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A1:P1`,
  });
  if (!res.data.values?.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADERS] },
    });
  }
}

function ordenToRow(orden: Record<string, unknown>): string[] {
  return [
    String(orden.id ?? "").slice(0, 8).toUpperCase(),
    String(orden.fecha_ingreso ?? "").slice(0, 10),
    String(orden.fecha_entrega_comprometida ?? ""),
    String((orden.cliente as Record<string, unknown>)?.nombre ?? orden.cliente_id ?? ""),
    String(orden.venta_a ?? ""),
    String(orden.venta_de ?? ""),
    String(orden.estado_produccion ?? ""),
    String(orden.estado_comercial ?? ""),
    String(orden.total_unidades ?? ""),
    String(orden.total_q ?? ""),
    String(orden.medio_envio ?? ""),
    String(orden.metodo_pago ?? ""),
    String(orden.forma_pago ?? ""),
    String(orden.mes ?? ""),
    String(orden.tipo_cliente ?? ""),
    String(orden.comentarios ?? ""),
  ];
}

export async function agregarOrdenSheet(orden: Record<string, unknown>) {
  await inicializarSheet();
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:P`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [ordenToRow(orden)] },
  });
}

export async function actualizarOrdenSheet(orden: Record<string, unknown>) {
  const sheets = getSheets();
  const ordenId = String(orden.id ?? "").slice(0, 8).toUpperCase();

  // Buscar la fila por ID
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:A`,
  });

  const filas = res.data.values ?? [];
  const rowIndex = filas.findIndex((r) => r[0] === ordenId);
  if (rowIndex < 1) {
    // No existe, la agrega
    await agregarOrdenSheet(orden);
    return;
  }

  const sheetRow = rowIndex + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A${sheetRow}:P${sheetRow}`,
    valueInputOption: "RAW",
    requestBody: { values: [ordenToRow(orden)] },
  });
}
