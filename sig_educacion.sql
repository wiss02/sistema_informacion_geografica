-- Habilitar la extensión PostGIS si no está habilitada
CREATE EXTENSION IF NOT EXISTS postgis;

-- Crear tabla instituciones si no existe
CREATE TABLE IF NOT EXISTS instituciones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(100),
    distrito INT,
    oferta_academica TEXT,
    longitud DOUBLE PRECISION,
    latitud DOUBLE PRECISION,
    geom GEOMETRY(Point, 4326)
);

-- Limpiamos datos previos de prueba si lo deseas (Opcional)
TRUNCATE TABLE instituciones;

-- Insertar Unidades Educativas e Institutos de El Alto
INSERT INTO instituciones (nombre, tipo, distrito, oferta_academica, longitud, latitud, geom)
VALUES 
-- DISTRITO 6 (Zona Norte / 16 de Julio)
('Universidad Pública de El Alto', 'Instituto Superior', 6, 'Ingeniería de Sistemas, Ciencias de la Educación', -68.1931, -16.4914, ST_SetSRID(ST_MakePoint(-68.1931, -16.4914), 4326)),
('Unidad Educativa Los Andes', 'Unidad Educativa', 6, 'Turno Mañana - Nivel Secundario', -68.1985, -16.4880, ST_SetSRID(ST_MakePoint(-68.1985, -16.4880), 4326)),

-- DISTRITO 1 (Zona Sur / Ciudad Satélite)
('Instituto Tecnológico Infocal El Alto', 'Instituto Superior', 1, 'Mecánica Automotriz, Informática Industrial', -68.1632, -16.5255, ST_SetSRID(ST_MakePoint(-68.1632, -16.5255), 4326)),
('Unidad Educativa Don Bosco Satélite', 'Unidad Educativa', 1, 'Turno Mañana y Tarde - Inicial, Primaria, Secundaria', -68.1690, -16.5210, ST_SetSRID(ST_MakePoint(-68.1690, -16.5210), 4326)),

-- DISTRITO 2 (Zona Senkata / Cruce Villa Adela)
('Instituto Tecnológico El Alto (ITS)', 'Instituto Superior', 2, 'Electricidad Industrial, Electrónica', -68.2250, -16.5410, ST_SetSRID(ST_MakePoint(-68.2250, -16.5410), 4326)),
('Unidad Educativa Cuerpo de Cristo', 'Unidad Educativa', 2, 'Turno Tarde - Técnico Humanístico', -68.2110, -16.5350, ST_SetSRID(ST_MakePoint(-68.2110, -16.5350), 4326)),

-- DISTRITO 8 (Zona Senkata / Puente Vela)
('Unidad Educativa San Francisco de Asís', 'Unidad Educativa', 8, 'Turno Mañana', -68.2450, -16.5750, ST_SetSRID(ST_MakePoint(-68.2450, -16.5750), 4326)),

-- DISTRITO 14 (Zona Bautista Saavedra)
('Unidad Educativa Bautista Saavedra', 'Unidad Educativa', 14, 'Turno Mañana - Plena', -68.2190, -16.4480, ST_SetSRID(ST_MakePoint(-68.2190, -16.4480), 4326));