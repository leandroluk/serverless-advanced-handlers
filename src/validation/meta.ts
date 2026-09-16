import * as z from 'zod';

/**
 * Leitura e validação dos metadados de `.meta()` (REQ-017, REQ-018).
 *
 * Duas funções puras, sem estado próprio — a fonte dos metadados é sempre o `z.globalRegistry`, populado
 * pelo próprio `.meta()` do Zod:
 *
 * - `resolveMeta(schema)` — funde os metadados da cadeia de wrappers num único objeto;
 * - `validateMeta(schema, path?)` — rejeita chaves fora do allowlist, com o caminho do campo na mensagem.
 *
 * `validateMeta` **ainda não é chamada por ninguém**: é o utilitário que o Schema Extractor do compilador
 * (F06/F10) vai usar para emitir o erro de build `SAH400`. O tipo `GlobalMeta` augmentado em
 * `#/validation/v` cobre o editor; este módulo cobre o build (ver o limite da augmentation documentado lá:
 * o index signature `[k: string]: unknown` do Zod deixa passar qualquer chave desconhecida no tipo).
 *
 * Este módulo **não** usa `namespace` — a exceção de `typescript/no-namespace` do `.oxlintrc.json` vale só
 * para `src/validation/v.ts`, que precisa do merge valor+namespace por causa do bundler de declarações.
 */

/**
 * Chaves aceitas dentro de `.meta()`: as quatro nativas do Zod (`JSONSchemaMeta`) mais as duas do
 * augmentation do framework (REQ-016). Qualquer outra é erro de build.
 */
const RESERVED_META_KEYS: ReadonlySet<string> = new Set([
  'deprecated',
  'description',
  'examples',
  'id',
  'name',
  'title',
]);

/**
 * Wrappers que produzem um schema novo sem carregar o `.meta()` do schema interno — cada um guarda o
 * anterior em `def.innerType`, e é essa cadeia que `resolveMeta` percorre.
 *
 * `promise` não entra aqui: não é um wrapper de metadados de campo (e é legado no Zod 4), mas `validateMeta`
 * continua descendo por ele para não deixar um ramo do schema sem verificação.
 */
const WRAPPER_TYPES: ReadonlySet<string> = new Set([
  'catch',
  'default',
  'nonoptional',
  'nullable',
  'optional',
  'prefault',
  'readonly',
]);

/** Qualquer schema do Zod, inclusive os do core (`z.core`), que é o tipo comum a toda a árvore. */
type AnySchema = z.core.$ZodType;

/**
 * `schema._zod.def` visto como bag de propriedades.
 *
 * O `def` concreto muda a cada tipo de schema (`shape`, `element`, `innerType`, ...) e o tipo estático
 * comum (`$ZodTypeDef`) só declara `type`/`checks`/`error`. Percorrer a árvore genericamente exige ler
 * propriedades que não estão no tipo comum; `unknown` (e não `any`) mantém cada leitura obrigada a passar
 * por `isSchema`.
 */
function defOf(schema: AnySchema): Readonly<Record<string, unknown>> {
  return schema._zod.def as unknown as Readonly<Record<string, unknown>>;
}

/** Guard estrutural: qualquer schema do Zod 4 carrega a propriedade interna `_zod`. */
function isSchema(value: unknown): value is AnySchema {
  return typeof value === 'object' && value !== null && '_zod' in value;
}

/**
 * Metadados de `schema` fundidos com os de toda a cadeia de wrappers abaixo dele, de dentro para fora —
 * **o mais externo vence** em caso de chave repetida (REQ-018).
 *
 * `.optional()`, `.nullable()`, `.default()`, `.prefault()`, `.catch()`, `.nonoptional()` e `.readonly()`
 * criam instâncias novas, e o Zod registra metadados por instância: o `.meta()` do schema interno
 * simplesmente não aparece no wrapper. É por isso que ler `schema.meta()` direto não basta.
 *
 * ```ts
 * v.string().meta({description: 'Primeiro nome', name: 'fname'}).optional().meta({name: 'first_name'});
 * // resolveMeta -> {description: 'Primeiro nome', name: 'first_name'}
 * ```
 *
 * Clones de refinement (`.min()`, `.max()`) e recortes de objeto (`omit`/`pick`) não precisam de nada aqui:
 * o Zod já herda/preserva o registro nesses casos.
 *
 * O retorno é sempre um objeto novo (nunca o registrado no `globalRegistry`), e é `{}` quando não há
 * metadado nenhum na cadeia. `examples` sai tipado pelo `input` de `T`, como no `.meta()`.
 */
export function resolveMeta<T extends AnySchema>(schema: T): z.core.$replace<z.core.GlobalMeta, T> {
  const chain: AnySchema[] = [];

  for (let node: AnySchema | undefined = schema; node !== undefined;) {
    chain.push(node);

    const def = defOf(node);

    node = WRAPPER_TYPES.has(String(def.type)) && isSchema(def.innerType) ? def.innerType : undefined;
  }

  const resolved: Record<string, unknown> = {};

  // De dentro para fora: o `Object.assign` do wrapper mais externo é o último e sobrescreve os de baixo.
  for (const node of chain.reverse()) {
    Object.assign(resolved, z.globalRegistry.get(node));
  }

  return resolved as unknown as z.core.$replace<z.core.GlobalMeta, T>;
}

/**
 * Percorre `schema` recursivamente e lança se algum `.meta()` tiver chave fora do allowlist (REQ-017).
 *
 * A mensagem traz o caminho do campo, para o erro de build apontar o lugar exato:
 *
 * ```
 * [serverless-advanced-handlers] Unknown meta key "nmae" at UserEntity.shape.name
 * ```
 *
 * `path` é a raiz do caminho — o compilador passa o nome da classe (`'UserEntity'`); o default `'schema'`
 * serve para uso avulso. Cada nível acrescenta o segmento correspondente à forma do schema (`.shape.<key>`,
 * `.element`, `.options[0]`, ...). Wrappers (`.optional()`, `.default()`, ...) **não** acrescentam segmento:
 * são o mesmo campo lógico.
 *
 * Lança no primeiro problema encontrado (o compilador reporta um erro por vez) e não retorna nada quando
 * está tudo certo. Cada instância de schema é visitada uma única vez, o que dá o corte de ciclo necessário
 * para `z.lazy()` recursivo; num schema reaproveitado em dois pontos, o caminho reportado é o do primeiro.
 */
export function validateMeta(schema: AnySchema, path: string = 'schema'): void {
  validateNode(schema, path, new Set<AnySchema>());
}

function validateNode(schema: AnySchema, path: string, seen: Set<AnySchema>): void {
  if (seen.has(schema)) {
    return;
  }

  seen.add(schema);

  const meta: Readonly<Record<string, unknown>> | undefined = z.globalRegistry.get(schema);

  if (meta !== undefined) {
    for (const key of Object.keys(meta)) {
      if (!RESERVED_META_KEYS.has(key)) {
        throw new Error(`[serverless-advanced-handlers] Unknown meta key "${key}" at ${path}`);
      }
    }
  }

  const def = defOf(schema);
  const visit = (value: unknown, childPath: string): void => {
    if (isSchema(value)) {
      validateNode(value, childPath, seen);
    }
  };

  switch (String(def.type)) {
    case 'array':
      visit(def.element, `${path}.element`);
      break;

    case 'intersection':
      visit(def.left, `${path}.left`);
      visit(def.right, `${path}.right`);
      break;

    case 'lazy': {
      const {getter} = def;

      if (typeof getter === 'function') {
        visit((getter as () => unknown)(), path);
      }

      break;
    }

    case 'map':
    case 'record':
      visit(def.keyType, `${path}.keyType`);
      visit(def.valueType, `${path}.valueType`);
      break;

    case 'object': {
      const {shape} = def;

      if (typeof shape === 'object' && shape !== null) {
        for (const [key, value] of Object.entries(shape)) {
          visit(value, `${path}.shape.${key}`);
        }
      }

      visit(def.catchall, `${path}.catchall`);
      break;
    }

    case 'pipe':
      visit(def.in, `${path}.in`);
      visit(def.out, `${path}.out`);
      break;

    case 'set':
      visit(def.valueType, `${path}.valueType`);
      break;

    case 'tuple': {
      const {items} = def;

      if (Array.isArray(items)) {
        items.forEach((item, index) => visit(item, `${path}.items[${index}]`));
      }

      visit(def.rest, `${path}.rest`);
      break;
    }

    case 'union': {
      const {options} = def;

      if (Array.isArray(options)) {
        options.forEach((option, index) => visit(option, `${path}.options[${index}]`));
      }

      break;
    }

    default:
      // Wrappers e `promise` envolvem o mesmo campo lógico: descem sem acrescentar segmento ao caminho.
      if (WRAPPER_TYPES.has(String(def.type)) || def.type === 'promise') {
        visit(def.innerType, path);
      }

      break;
  }
}
