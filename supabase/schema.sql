-- =============================================
-- CIBUM - Schema de base de datos
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nit TEXT,
  nombre TEXT NOT NULL,
  telefono TEXT,
  direccion TEXT,
  medio_contacto TEXT,
  tipo TEXT DEFAULT 'EXISTENTE',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Productos / SKUs
CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca TEXT NOT NULL,
  nombre TEXT NOT NULL,
  precio_unitario NUMERIC(10,2),
  activo BOOLEAN DEFAULT true
);

-- Órdenes de compra
CREATE TABLE IF NOT EXISTS ordenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_ingreso TIMESTAMPTZ DEFAULT now(),
  fecha_entrega_comprometida DATE,
  fecha_cobro DATE,
  cliente_id UUID REFERENCES clientes(id),
  venta_a TEXT,
  venta_de TEXT,
  estado_produccion TEXT DEFAULT 'RECIBIDO',
  estado_comercial TEXT DEFAULT 'PENDIENTE',
  medio_envio TEXT,
  metodo_pago TEXT,
  forma_pago TEXT,
  vendedor TEXT,
  usuario_registro TEXT,
  comentarios TEXT,
  total_unidades INT,
  total_q NUMERIC(10,2),
  mes TEXT,
  tipo_cliente TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Detalle de productos por orden
CREATE TABLE IF NOT EXISTS orden_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id UUID REFERENCES ordenes(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  cantidad INT NOT NULL DEFAULT 0,
  precio_unitario NUMERIC(10,2),
  subtotal NUMERIC(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);

-- Historial de cambios de estado
CREATE TABLE IF NOT EXISTS orden_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id UUID REFERENCES ordenes(id) ON DELETE CASCADE,
  campo_cambiado TEXT,
  estado_anterior TEXT,
  estado_nuevo TEXT,
  usuario TEXT,
  fecha TIMESTAMPTZ DEFAULT now(),
  notas TEXT
);

-- =============================================
-- PRODUCTOS INICIALES
-- =============================================

-- MR. BEEF
INSERT INTO productos (marca, nombre, precio_unitario) VALUES
('MR.BEEF', 'Especial de Daniel', 18.00),
('MR.BEEF', 'Honey Chipotle', 18.00),
('MR.BEEF', 'Lemon Pepper', 18.00),
('MR.BEEF', 'Teriyaki', 18.00),
('MR.BEEF', 'Sabor de Temporada', 18.00);

-- JACK LINKS
INSERT INTO productos (marca, nombre, precio_unitario) VALUES
('JACK LINKS', 'Sticks 26gr', 10.50),
('JACK LINKS', 'Jerky 35gr', 24.50),
('JACK LINKS', 'Jerky 81gr', 52.50);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orden_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orden_historial ENABLE ROW LEVEL SECURITY;

-- Permitir acceso a usuarios autenticados (ajustar según roles si se necesita más granularidad)
CREATE POLICY "Authenticated users can read clientes" ON clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert clientes" ON clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update clientes" ON clientes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read productos" ON productos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read ordenes" ON ordenes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert ordenes" ON ordenes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update ordenes" ON ordenes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete ordenes" ON ordenes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read orden_items" ON orden_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert orden_items" ON orden_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update orden_items" ON orden_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete orden_items" ON orden_items FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read orden_historial" ON orden_historial FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert orden_historial" ON orden_historial FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================
-- REALTIME
-- =============================================

-- Habilitar Realtime para la tabla ordenes
ALTER PUBLICATION supabase_realtime ADD TABLE ordenes;
