ALTER TABLE "amostras" ALTER COLUMN "cpf" SET DATA TYPE char(14);--> statement-breakpoint
ALTER TABLE "amostras" ALTER COLUMN "cnpj" SET DATA TYPE char(18);--> statement-breakpoint
ALTER TABLE "amostras" ALTER COLUMN "telefone" SET DATA TYPE varchar(9);--> statement-breakpoint
ALTER TABLE "amostras" ALTER COLUMN "cep" SET DATA TYPE char(9);--> statement-breakpoint
ALTER TABLE "amostras" ALTER COLUMN "incidencias" SET DATA TYPE numeric(14, 2)[];--> statement-breakpoint
ALTER TABLE "amostras" ALTER COLUMN "acumulado_proposto" SET DATA TYPE numeric(14, 2)[];--> statement-breakpoint
ALTER TABLE "avaliadores" ALTER COLUMN "registro_crea" SET DATA TYPE varchar(15);