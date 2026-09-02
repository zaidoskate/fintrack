-- 08_inversion_inicial.sql
-- Añade columna para registrar la inversión inicial en activos de renta variable

ALTER TABLE portafolio_activos 
ADD COLUMN inversion_inicial numeric DEFAULT 0 NOT NULL;
