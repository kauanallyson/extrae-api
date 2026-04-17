CREATE TABLE "profissionais" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "profissionais_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nome" varchar(512) NOT NULL,
	"nomeFantasia" varchar(512) NOT NULL,
	"cpf" char(11) NOT NULL,
	"cnpj" char(14) NOT NULL,
	"registroCrea" varchar(25) NOT NULL,
	CONSTRAINT "profissionais_cpf_unique" UNIQUE("cpf"),
	CONSTRAINT "profissionais_cnpj_unique" UNIQUE("cnpj")
);
--> statement-breakpoint
DROP TABLE "users" CASCADE;