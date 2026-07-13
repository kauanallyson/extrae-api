CREATE TABLE "acumulados_propostos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "acumulados_propostos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"amostra_id" integer NOT NULL,
	"ordem" integer NOT NULL,
	"percentual" integer NOT NULL,
	CONSTRAINT "acumulados_propostos_amostraId_ordem_unique" UNIQUE("amostra_id","ordem")
);
--> statement-breakpoint
CREATE TABLE "incidencias" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "incidencias_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"amostra_id" integer NOT NULL,
	"ordem" integer NOT NULL,
	"percentual" integer NOT NULL,
	CONSTRAINT "incidencias_amostraId_ordem_unique" UNIQUE("amostra_id","ordem")
);
--> statement-breakpoint
ALTER TABLE "acumulados_propostos" ADD CONSTRAINT "acumulados_propostos_amostra_id_amostras_id_fk" FOREIGN KEY ("amostra_id") REFERENCES "public"."amostras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_amostra_id_amostras_id_fk" FOREIGN KEY ("amostra_id") REFERENCES "public"."amostras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "incidencias" ("amostra_id", "ordem", "percentual")
SELECT a."id", u."ordem", round(u."valor" * 100)::integer
FROM "amostras" a
CROSS JOIN LATERAL unnest(a."incidencias") WITH ORDINALITY AS u("valor", "ordem")
WHERE a."incidencias" IS NOT NULL AND u."valor" IS NOT NULL;--> statement-breakpoint
INSERT INTO "acumulados_propostos" ("amostra_id", "ordem", "percentual")
SELECT a."id", u."ordem", round(u."valor" * 100)::integer
FROM "amostras" a
CROSS JOIN LATERAL unnest(a."acumulado_proposto") WITH ORDINALITY AS u("valor", "ordem")
WHERE a."acumulado_proposto" IS NOT NULL AND u."valor" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "amostras" DROP COLUMN "incidencias";--> statement-breakpoint
ALTER TABLE "amostras" DROP COLUMN "acumulado_proposto";--> statement-breakpoint
ALTER TABLE "amostras" ALTER COLUMN "valor_terreno" SET DATA TYPE bigint USING round("valor_terreno" * 100)::bigint;--> statement-breakpoint
ALTER TABLE "amostras" ALTER COLUMN "valor_imovel" SET DATA TYPE bigint USING round("valor_imovel" * 100)::bigint;--> statement-breakpoint
ALTER TABLE "amostras" ALTER COLUMN "valor_unitario" SET DATA TYPE bigint USING round("valor_unitario" * 100)::bigint;--> statement-breakpoint
ALTER TABLE "amostras" ALTER COLUMN "testada" SET DATA TYPE integer USING round("testada" * 100)::integer;--> statement-breakpoint
ALTER TABLE "amostras" ALTER COLUMN "area_terreno" SET DATA TYPE integer USING round("area_terreno" * 100)::integer;--> statement-breakpoint
ALTER TABLE "amostras" ALTER COLUMN "area_construida" SET DATA TYPE integer USING round("area_construida" * 100)::integer;
