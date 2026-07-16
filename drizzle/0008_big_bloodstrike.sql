CREATE TABLE "usuarios" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "usuarios_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nome" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"senha_hash" text NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
