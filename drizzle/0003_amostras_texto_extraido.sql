CREATE TABLE "amostras_texto_extraido" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "amostras_texto_extraido_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"amostra_id" integer NOT NULL,
	"texto_extraido" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "amostras_texto_extraido_amostraId_unique" UNIQUE("amostra_id")
);
--> statement-breakpoint
ALTER TABLE "amostras_texto_extraido" ADD CONSTRAINT "amostras_texto_extraido_amostra_id_amostras_id_fk" FOREIGN KEY ("amostra_id") REFERENCES "public"."amostras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "amostras_texto_extraido" ("amostra_id", "texto_extraido")
SELECT "id", "texto_extraido"
FROM "amostras"
WHERE "texto_extraido" IS NOT NULL
  AND btrim("texto_extraido") <> '';--> statement-breakpoint
ALTER TABLE "amostras" DROP COLUMN "texto_extraido";
