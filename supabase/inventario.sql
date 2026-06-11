-- =============================================
-- CIBUM — Módulo de Inventario en Consignación
-- Ejecutar en Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS distribuidores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  direccion TEXT,
  zona TEXT,
  contacto TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventario_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribuidor_id UUID REFERENCES distribuidores(id),
  fecha DATE NOT NULL,
  tipo TEXT NOT NULL,
  referencia TEXT,
  especial_daniel INT DEFAULT 0,
  honey_chipotle INT DEFAULT 0,
  lemon_pepper INT DEFAULT 0,
  teriyaki INT DEFAULT 0,
  palitos_26g INT DEFAULT 0,
  jerky_35g INT DEFAULT 0,
  jerky_81g INT DEFAULT 0,
  total_unidades INT GENERATED ALWAYS AS (
    especial_daniel + honey_chipotle + lemon_pepper + teriyaki +
    palitos_26g + jerky_35g + jerky_81g
  ) STORED,
  total_q NUMERIC(10,2),
  contrasena_pago TEXT,
  estado TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventario_cortes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribuidor_id UUID REFERENCES distribuidores(id),
  fecha_corte DATE NOT NULL,
  teorico_especial_daniel INT DEFAULT 0,
  teorico_honey_chipotle INT DEFAULT 0,
  teorico_lemon_pepper INT DEFAULT 0,
  teorico_teriyaki INT DEFAULT 0,
  teorico_palitos_26g INT DEFAULT 0,
  teorico_jerky_35g INT DEFAULT 0,
  teorico_jerky_81g INT DEFAULT 0,
  fisico_especial_daniel INT,
  fisico_honey_chipotle INT,
  fisico_lemon_pepper INT,
  fisico_teriyaki INT,
  fisico_palitos_26g INT,
  fisico_jerky_35g INT,
  fisico_jerky_81g INT,
  conciliado BOOLEAN DEFAULT false,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventario_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribuidor_id UUID REFERENCES distribuidores(id) UNIQUE,
  min_especial_daniel INT DEFAULT 10,
  min_honey_chipotle INT DEFAULT 10,
  min_lemon_pepper INT DEFAULT 10,
  min_teriyaki INT DEFAULT 10,
  min_palitos_26g INT DEFAULT 5,
  min_jerky_35g INT DEFAULT 5,
  min_jerky_81g INT DEFAULT 5,
  optimo_especial_daniel INT DEFAULT 30,
  optimo_honey_chipotle INT DEFAULT 30,
  optimo_lemon_pepper INT DEFAULT 30,
  optimo_teriyaki INT DEFAULT 30,
  optimo_palitos_26g INT DEFAULT 15,
  optimo_jerky_35g INT DEFAULT 15,
  optimo_jerky_81g INT DEFAULT 15,
  frecuencia_reposicion_dias INT DEFAULT 7,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Distribuidores iniciales
INSERT INTO distribuidores (nombre, zona) VALUES
('La Torre Américas', 'zona 13'),
('La Torre Miraflores', 'zona 11'),
('La Torre Oakland', 'zona 10'),
('La Torre Condado', 'zona 14');

-- RLS
ALTER TABLE distribuidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_cortes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read distribuidores" ON distribuidores FOR SELECT USING (true);
CREATE POLICY "Public write distribuidores" ON distribuidores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public read inv_mov" ON inventario_movimientos FOR SELECT USING (true);
CREATE POLICY "Public write inv_mov" ON inventario_movimientos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public read inv_cortes" ON inventario_cortes FOR SELECT USING (true);
CREATE POLICY "Public write inv_cortes" ON inventario_cortes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public read inv_config" ON inventario_config FOR SELECT USING (true);
CREATE POLICY "Public write inv_config" ON inventario_config FOR ALL USING (true) WITH CHECK (true);
