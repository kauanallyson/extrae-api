CREATE TABLE "municipios" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "municipios_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nome" text NOT NULL,
	"nome_normalizado" text GENERATED ALWAYS AS (translate(lower(btrim(nome)), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn')) STORED NOT NULL,
	"uf" char(2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "municipios_nomeNormalizado_uf_unique" UNIQUE NULLS NOT DISTINCT("nome_normalizado","uf")
);
--> statement-breakpoint
ALTER TABLE "amostras" ADD COLUMN "municipio_id" integer;--> statement-breakpoint
ALTER TABLE "amostras" ADD CONSTRAINT "amostras_municipio_id_municipios_id_fk" FOREIGN KEY ("municipio_id") REFERENCES "public"."municipios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
INSERT INTO "municipios" ("nome", "uf")
SELECT DISTINCT ON ("norm", "uf") "municipio", "uf"
FROM (
	SELECT
		"municipio",
		"uf",
		translate(lower(btrim("municipio")), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn') AS "norm",
		count(*) AS "freq"
	FROM "amostras"
	WHERE btrim(coalesce("municipio", '')) <> ''
	GROUP BY "municipio", "uf"
) AS "grafias"
ORDER BY "norm", "uf", "freq" DESC, "municipio";--> statement-breakpoint
UPDATE "amostras" SET "municipio_id" = "municipios"."id"
FROM "municipios"
WHERE "municipios"."nome_normalizado" = translate(lower(btrim("amostras"."municipio")), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn')
	AND "municipios"."uf" IS NOT DISTINCT FROM "amostras"."uf";