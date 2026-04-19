CREATE TABLE "dados_amostra" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "dados_amostra_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"valor_unitario" real,
	"testada" real,
	"idade_estimada" varchar(255),
	"area_terreno" real,
	"area_construida" real,
	"quartos" integer,
	"banheiros" integer,
	"suites" integer,
	"vagas" integer,
	"padrao_acabamento" varchar(255),
	"estado_conservacao" varchar(255),
	"infraestrutura" varchar(255),
	"servicos_publicos" varchar(255),
	"usos_predominantes" varchar(255),
	"via_acesso" varchar(255),
	"regiao_contexto" varchar(255),
	"data_referencia" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "dados_rae" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "dados_rae_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"proponente" varchar(255),
	"cpf_cnpj" varchar(20),
	"ddd" varchar(3),
	"telefone" varchar(20),
	"endereco_literal" text,
	"coordenada_s" varchar(255),
	"coordenada_w" varchar(255),
	"complemento" varchar(255),
	"bairro" varchar(255),
	"cep" varchar(15),
	"municipio" varchar(255),
	"uf" varchar(2),
	"empresa_responsavel" varchar(255),
	"valor_terreno" real,
	"matricula" varchar(255),
	"oficio" varchar(255),
	"comarca" varchar(255),
	"uf_matricula" varchar(2),
	"incidencias" real[],
	"valor_imovel" real,
	"numero_etapas" integer,
	"acumulado_proposto" real[]
);
--> statement-breakpoint
CREATE TABLE "laudos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "laudos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"texto_extraido" text,
	"profissional_id" integer NOT NULL,
	"dados_amostra_id" integer,
	"dados_rae_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "laudos" ADD CONSTRAINT "laudos_profissional_id_profissionais_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."profissionais"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "laudos" ADD CONSTRAINT "laudos_dados_amostra_id_dados_amostra_id_fk" FOREIGN KEY ("dados_amostra_id") REFERENCES "public"."dados_amostra"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "laudos" ADD CONSTRAINT "laudos_dados_rae_id_dados_rae_id_fk" FOREIGN KEY ("dados_rae_id") REFERENCES "public"."dados_rae"("id") ON DELETE no action ON UPDATE no action;