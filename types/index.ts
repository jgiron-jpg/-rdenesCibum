export type UserRole = "admin" | "produccion" | "comercial";

export type EstadoProduccion =
  | "RECIBIDO"
  | "EN_PREPARACION"
  | "EMPACADO"
  | "ENVIADO";

export type EstadoComercial =
  | "PENDIENTE"
  | "FACTURADO"
  | "GESTION_PROGRAMADA"
  | "GUIA_GENERADA"
  | "ENVIADO"
  | "ENTREGADO"
  | "CANCELADO"
  | "COBRADO";

export type AlertType = "ATRASADO" | "POR_VENCER" | "ESTANCADO_PROD" | "ESTANCADO_COM";

export interface Cliente {
  id: string;
  nit: string | null;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  medio_contacto: string | null;
  tipo: string | null;
  created_at: string;
}

export interface Producto {
  id: string;
  marca: string;
  nombre: string;
  precio_unitario: number;
  activo: boolean;
}

export interface OrdenItem {
  id: string;
  orden_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto?: Producto;
}

export interface Orden {
  id: string;
  fecha_ingreso: string;
  fecha_entrega_comprometida: string | null;
  fecha_cobro: string | null;
  cliente_id: string | null;
  venta_a: string | null;
  venta_de: string | null;
  estado_produccion: EstadoProduccion;
  estado_comercial: EstadoComercial;
  medio_envio: string | null;
  metodo_pago: string | null;
  forma_pago: string | null;
  vendedor: string | null;
  usuario_registro: string | null;
  usuario_red?: string | null;
  comentarios: string | null;
  total_unidades: number | null;
  total_q: number | null;
  mes: string | null;
  tipo_cliente: string | null;
  created_at: string;
  updated_at: string;
  cliente?: Cliente;
  orden_items?: OrdenItem[];
}

export interface OrdenHistorial {
  id: string;
  orden_id: string;
  campo_cambiado: string;
  estado_anterior: string;
  estado_nuevo: string;
  usuario: string;
  fecha: string;
  notas: string | null;
}

export interface KPIs {
  activos: number;
  pendientes: number;
  atrasados: number;
  entregadosSemana: number;
}

export interface AlertaOrden {
  orden: Orden;
  tipo: AlertType;
}
