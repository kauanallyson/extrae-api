ALTER TABLE "acumulados_propostos" ALTER COLUMN "percentual" SET DATA TYPE double precision USING "percentual"::double precision / 100;--> statement-breakpoint
ALTER TABLE "amostras" ALTER COLUMN "valor_terreno" SET DATA TYPE double precision USING "valor_terreno"::double precision / 100;--> statement-breakpoint
ALTER TABLE "amostras" ALTER COLUMN "valor_imovel" SET DATA TYPE double precision USING "valor_imovel"::double precision / 100;--> statement-breakpoint
ALTER TABLE "amostras" ALTER COLUMN "valor_unitario" SET DATA TYPE double precision USING "valor_unitario"::double precision / 100;--> statement-breakpoint
ALTER TABLE "amostras" ALTER COLUMN "testada" SET DATA TYPE double precision USING "testada"::double precision / 100;--> statement-breakpoint
ALTER TABLE "amostras" ALTER COLUMN "area_terreno" SET DATA TYPE double precision USING "area_terreno"::double precision / 100;--> statement-breakpoint
ALTER TABLE "amostras" ALTER COLUMN "area_construida" SET DATA TYPE double precision USING "area_construida"::double precision / 100;--> statement-breakpoint
ALTER TABLE "incidencias" ALTER COLUMN "percentual" SET DATA TYPE double precision USING "percentual"::double precision / 100;
