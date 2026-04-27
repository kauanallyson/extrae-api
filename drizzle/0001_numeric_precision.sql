ALTER TABLE "amostras"
	ALTER COLUMN "valor_terreno" TYPE numeric(14, 2) USING round("valor_terreno"::numeric, 2),
	ALTER COLUMN "valor_imovel" TYPE numeric(14, 2) USING round("valor_imovel"::numeric, 2),
	ALTER COLUMN "incidencias" TYPE numeric(10, 4)[] USING "incidencias"::numeric(10, 4)[],
	ALTER COLUMN "acumulado_proposto" TYPE numeric(10, 4)[] USING "acumulado_proposto"::numeric(10, 4)[],
	ALTER COLUMN "valor_unitario" TYPE numeric(14, 2) USING round("valor_unitario"::numeric, 2),
	ALTER COLUMN "testada" TYPE numeric(14, 2) USING round("testada"::numeric, 2),
	ALTER COLUMN "area_terreno" TYPE numeric(14, 2) USING round("area_terreno"::numeric, 2),
	ALTER COLUMN "area_construida" TYPE numeric(14, 2) USING round("area_construida"::numeric, 2);
