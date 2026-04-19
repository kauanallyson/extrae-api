import { integer, pgTable, real, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const dadosAmostra = pgTable("dados_amostra", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  valorUnitario: real("valor_unitario"),
  testada: real("testada"),
  idadeEstimada: varchar("idade_estimada", { length: 255 }),
  areaTerreno: real("area_terreno"),
  areaConstruida: real("area_construida"),
  quartos: integer("quartos"),
  banheiros: integer("banheiros"),
  suites: integer("suites"),
  vagas: integer("vagas"),
  padraoAcabamento: varchar("padrao_acabamento", { length: 255 }),
  estadoConservacao: varchar("estado_conservacao", { length: 255 }),
  infraestrutura: varchar("infraestrutura", { length: 255 }),
  servicosPublicos: varchar("servicos_publicos", { length: 255 }),
  usosPredominantes: varchar("usos_predominantes", { length: 255 }),
  viaAcesso: varchar("via_acesso", { length: 255 }),
  regiaoContexto: varchar("regiao_contexto", { length: 255 }),
  dataReferencia: varchar("data_referencia", { length: 255 }),
});

export const insertDadosAmostraSchema = createInsertSchema(dadosAmostra);
