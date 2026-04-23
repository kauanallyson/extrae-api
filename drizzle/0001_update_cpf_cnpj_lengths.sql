ALTER TABLE "dados_amostra" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dados_rae" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "dados_amostra" CASCADE;--> statement-breakpoint
DROP TABLE "dados_rae" CASCADE;--> statement-breakpoint

ALTER TABLE "profissionais" ALTER COLUMN "nome" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "profissionais" ALTER COLUMN "nome_fantasia" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "profissionais" ALTER COLUMN "cpf" SET DATA TYPE varchar(14);--> statement-breakpoint
ALTER TABLE "profissionais" ALTER COLUMN "cnpj" SET DATA TYPE varchar(18);--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "proponente" text;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "cpf" varchar(14);--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "cnpj" varchar(18);--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "ddd" varchar(3);--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "telefone" varchar(20);--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "endereco_literal" text;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "coordenada_s" text;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "coordenada_w" text;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "complemento" text;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "bairro" text;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "cep" varchar(15);--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "municipio" text;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "uf" char(2);--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "empresa_responsavel" text;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "valor_terreno" real;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "matricula" text;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "oficio" text;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "comarca" text;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "uf_matricula" char(2);--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "valor_imovel" real;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "incidencias" real[];--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "numero_etapas" integer;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "acumulado_proposto" real[];--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "valor_unitario" real;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "testada" real;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "idade_estimada" text;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "area_terreno" real;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "area_construida" real;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "quartos" integer;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "banheiros" integer;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "suites" integer;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "vagas" integer;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "padrao_acabamento" text;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "estado_conservacao" text;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "infraestrutura" text;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "servicos_publicos" text;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "usos_predominantes" text;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "via_acesso" text;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "regiao_contexto" text;--> statement-breakpoint
ALTER TABLE "laudos" ADD COLUMN "data_referencia" text;--> statement-breakpoint
ALTER TABLE "laudos" DROP COLUMN "dados_amostra_id";--> statement-breakpoint
ALTER TABLE "laudos" DROP COLUMN "dados_rae_id";