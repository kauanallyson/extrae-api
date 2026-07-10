# GET /amostras/:id/similares

Retorna as amostras mais parecidas com a amostra `:id` (mesma faixa de preço
esperada) e uma estimativa de `valorImovel`/`valorTerreno` para ela, calculada
a partir dessas amostras similares.

## Request

```
GET /amostras/:id/similares?raioKm=5&limit=5
```

| Param     | Tipo   | Default | Descrição                                                |
| --------- | ------ | ------- | --------------------------------------------------------- |
| `id`      | path   | —       | id da amostra alvo                                        |
| `raioKm`  | query  | `5`     | raio de busca em km (distância planar, não geodésica)     |
| `limit`   | query  | `5`     | número máximo de similares retornados                     |

## Response `200`

```jsonc
{
  "amostra": { /* SelectAmostra completo — a amostra alvo */ },
  "similares": [
    {
      "amostra": { /* SelectAmostra completo */ },
      "score": 0.97,          // 0 a 1, maior = mais similar
      "distanciaKm": 0.17
    }
    // ordenado por score desc, no máximo `limit` itens
  ],
  "estimativa": {
    "valorImovel": 785969.10,
    "valorTerreno": 294753.61
  }
}
```

- `similares` pode vir **vazio** (`[]`) se nenhuma amostra estiver dentro do
  raio — não é erro.
- `estimativa` vem **`null`** quando `similares` está vazio.
- `estimativa.valorImovel` / `estimativa.valorTerreno` também podem vir
  `null` individualmente se nenhuma similar tiver aquele valor preenchido
  (não deveria acontecer hoje, já que candidatas sem valor são excluídas na
  origem, mas o front não deve assumir non-null).

## Erros

| Status | Quando                                                                 | Body                                                       |
| ------ | ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| `400`  | `id` não é um inteiro válido, ou `raioKm`/`limit` inválidos              | `{ "message": "..." }`                                        |
| `404`  | amostra `:id` não existe                                                 | `{ "message": "Amostra {id} nao encontrada." }`                |
| `422`  | amostra `:id` existe mas não tem `coordenadaS`/`coordenadaW` parseáveis  | `{ "message": "Amostra {id} nao possui coordenadas validas para calcular similares." }` |

O front deve tratar o `422` como um estado distinto de "sem similares": aqui
a amostra alvo em si não tem coordenadas utilizáveis (texto fora do formato
`XXºYY'ZZ,ZZZ"`), então a comparação nem chega a rodar — vale exibir algo como
"não foi possível calcular similares para esta amostra" em vez de "nenhuma
similar encontrada".

## Como o score é calculado (para contextualizar a UI)

Pesos fixos, aplicados só sobre os componentes que puderem ser calculados
(campos faltando em ambos os lados são simplesmente ignorados, redistribuindo
o peso relativo entre os demais):

| Componente            | Peso | Base                                                          |
| ---------------------- | ---- | -------------------------------------------------------------- |
| Distância               | 30%  | `1 - distanciaKm / raioKm`                                      |
| Área do terreno         | 15%  | diferença relativa entre as áreas                               |
| Área construída         | 15%  | diferença relativa entre as áreas                                |
| Padrão de acabamento    | 15%  | distância ordinal na escala `padraoAcabamento` (abaixo)          |
| Estado de conservação   | 15%  | distância ordinal na escala `estadoConservacao` (abaixo)         |
| Data de referência      | 10%  | diferença em dias, capada em 5 anos                              |

`padraoAcabamento` e `estadoConservacao` agora são enums fixos no banco
(`pgEnum`), na seguinte ordem (índice usado para a distância ordinal):

```
padraoAcabamento:
  0. Mínimo
  1. Baixo
  2. Normal (c/ aspectos de baixo)
  3. Normal (forte predominância)
  4. Normal (c/ aspectos de alto)
  5. Alto (por predominância)
  6. Alto (superior, luxo)

estadoConservacao:
  0. Em construção ou na planta
  1. Bom (aparência de novo)
  2. Bom (aparência de usado)
  3. Regular (reparos simples)
  4. Regular (reparos importantes)
  5. Ruim
```

Essas são as únicas strings válidas para esses dois campos em qualquer lugar
da API (inclusive em `POST`/`PUT /amostras`) — o front deve usar essa lista
fechada em selects/dropdowns em vez de texto livre.

A estimativa é uma média ponderada pelo `score` de cada similar:
`Σ(valor_i · score_i) / Σ(score_i)`, calculada separadamente para
`valorImovel` e `valorTerreno`.
