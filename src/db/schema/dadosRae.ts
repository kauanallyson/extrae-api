import { pgTable, integer, varchar, text, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const dadosRae = pgTable("dados_rae", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	proponente: varchar({ length: 255 }),
	cpfCnpj: varchar("cpf_cnpj", { length: 20 }),
	ddd: varchar({ length: 3 }),
	telefone: varchar({ length: 20 }),
	enderecoLiteral: text("endereco_literal"),
	coordenadaS: varchar("coordenada_s", { length: 255 }),
	coordenadaW: varchar("coordenada_w", { length: 255 }),
	complemento: varchar({ length: 255 }),
	bairro: varchar({ length: 255 }),
	cep: varchar({ length: 15 }),
	municipio: varchar({ length: 255 }),
	uf: varchar({ length: 2 }),
	empresaResponsavel: varchar("empresa_responsavel", { length: 255 }),
	valorTerreno: real("valor_terreno"),
	matricula: varchar({ length: 255 }),
	oficio: varchar({ length: 255 }),
	comarca: varchar({ length: 255 }),
	ufMatricula: varchar("uf_matricula", { length: 2 }),
	incidencias: real("incidencias").array(),
	valorImovel: real("valor_imovel"),
	numeroEtapas: integer("numero_etapas"),
	acumuladoProposto: real("acumulado_proposto").array(),
});

export const insertDadosRaeSchema = createInsertSchema(dadosRae);
