/**
 * Runtime de `Class(source)` e `isServerlessAdvancedHandlersClass(value)` (REQ-020..REQ-025).
 *
 * Os tipos públicos (`AdvancedClass`, `ClassFactory`, `AdvancedClassGuard`) vivem em `#/class/types` e são API
 * travada pelo snapshot de `test/public-api.spec.ts`. Este módulo **só implementa as funções**: as duas são
 * anotadas com o alias correspondente, de modo que qualquer divergência em relação ao contrato vira erro de
 * compilação aqui, e não uma mudança silenciosa da superfície pública.
 *
 * O marcador de classe (`CLASS_MARK`) é **detalhe de runtime** e de propósito não aparece em `AdvancedClass`:
 * ele é definido como estático da classe gerada e lido por cast dentro do guard.
 */

import * as z from 'zod';

import type {AdvancedClass, AdvancedClassGuard, ClassFactory} from '#/class/types';

/**
 * Marcador das classes criadas por `Class()` (REQ-025).
 *
 * `Symbol.for` (registro global do processo) e não `Symbol()`: se duas cópias do pacote coexistirem no mesmo
 * processo (bundle da Lambda + dependência transitiva), as classes de uma precisam ser reconhecidas pela outra.
 *
 * Estáticos são herdados pela cadeia de protótipos do construtor, então toda subclasse de uma classe `Class()`
 * também carrega o marcador — é o que faz o guard valer para subclasses sem nenhum registro extra.
 */
const CLASS_MARK: unique symbol = Symbol.for('serverless-advanced-handlers.class');

/** Shape de `ZodObject` tipado sem `any` (o `$ZodLooseShape` do Zod é `Record<string, any>`). */
type Shape = Record<string, z.ZodType>;

/** Construtor concreto da subclasse chamadora, usado pelo `decode` do codec. */
type Instantiable = new (data: unknown) => object;

/**
 * Lê o marcador de um valor qualquer sem `any`.
 *
 * O cast parte de `unknown` (e não do `Function` já estreitado pelo `typeof`), porque `Function` não tem index
 * signature de símbolo e a conversão direta seria rejeitada por falta de sobreposição.
 */
function markOf(value: unknown): unknown {
  return (value as {[key: symbol]: unknown} | null | undefined)?.[CLASS_MARK];
}

export const isServerlessAdvancedHandlersClass: AdvancedClassGuard = (value): value is AdvancedClass =>
  typeof value === 'function' && markOf(value) === true;

/** Entradas do shape de um `ZodObject`, tipadas sem `any`. */
function entriesOf(object: z.ZodObject): [string, z.ZodType][] {
  return Object.entries(object.shape);
}

/**
 * Reconstrói um `ZodObject` a partir de um shape derivado, preservando o `catchall` do original — é ele que
 * carrega o comportamento de `z.strictObject()` (catchall `never`) e de `z.looseObject()` (catchall `unknown`).
 *
 * É o que permite `omit`/`pick`/`partial` funcionarem sobre schemas com `.refine()`/`.superRefine()`: o método
 * nativo do Zod lança `".omit() cannot be used on object schemas containing refinements"`. O preço é conhecido e
 * documentado: **os refinements não são herdados** pelo schema reconstruído e precisam ser reaplicados no schema
 * composto. `extend` não passa por aqui — delega ao `object.extend()` nativo, que preserva os refinements.
 */
function rebuild(object: z.ZodObject, shape: Shape): z.ZodObject {
  const {catchall} = object._zod.def;
  const next = z.object(shape);

  return catchall ? (next.catchall(catchall) as unknown as z.ZodObject) : next;
}

export const Class: ClassFactory = <S extends z.ZodObject>(source: S | AdvancedClass<S>): AdvancedClass<S> => {
  // Outra classe `Class()` como fonte reaproveita o mesmo `ZodObject` (REQ-020): recriar a partir do shape perderia
  // a identidade do schema original (`Bar.object === Foo.object`) e, com ela, refinements e metadados registrados.
  const object = (isServerlessAdvancedHandlersClass(source) ? source.object : source) as z.ZodObject;

  // Um codec por subclasse: `decode` faz `new Target(data)` e `Target` é a subclasse chamadora, não a base.
  const codecs = new WeakMap<object, z.ZodType<object>>();

  class Base {
    static readonly [CLASS_MARK] = true;
    static readonly object = object;
    static readonly shape = object.shape;

    /**
     * Codec `objeto → instância`, memoizado por subclasse.
     *
     * A chave do `WeakMap` é o `this` do acesso (a subclasse chamadora), então `Foo.schema` e `Bar.schema` são
     * codecs distintos mesmo derivando do mesmo `Class()` — e `Foo.parse()` nunca devolve instância de `Bar`.
     */
    static get schema(): z.ZodType<object> {
      const cached = codecs.get(this);

      if (cached) {
        return cached;
      }

      const Target = this as unknown as Instantiable;
      const codec: z.ZodType<object> = z.codec(
        object,
        z.custom<object>(value => typeof value === 'object' && value !== null),
        {
          decode: (data): object => new Target(data),
          // Aceita instância ou objeto plano: o spread copia as próprias chaves e o `object` do outro lado do
          // codec cuida de descartar o que não faz parte do schema.
          encode: (value): z.core.output<z.ZodObject> => ({...value}),
        }
      );

      codecs.set(this, codec);

      return codec;
    }

    /** Reconstrói o schema sem as chaves da máscara. **Não herda refinements** — veja `rebuild`. */
    static omit(mask: Record<string, true | undefined>): z.ZodObject {
      return rebuild(object, Object.fromEntries(entriesOf(object).filter(([key]) => !mask[key])));
    }

    /** Reconstrói o schema só com as chaves da máscara. **Não herda refinements** — veja `rebuild`. */
    static pick(mask: Record<string, true | undefined>): z.ZodObject {
      return rebuild(object, Object.fromEntries(entriesOf(object).filter(([key]) => mask[key])));
    }

    /** Reconstrói o schema com todos os campos opcionais. **Não herda refinements** — veja `rebuild`. */
    static partial(): z.ZodObject {
      return rebuild(object, Object.fromEntries(entriesOf(object).map(([key, field]) => [key, field.optional()])));
    }

    /** Delega ao `object.extend()` nativo, que preserva os refinements do schema original. */
    static extend(shape: Shape): z.ZodObject {
      return object.extend(shape);
    }

    /** Valida e devolve instância da subclasse chamadora (REQ-022). */
    static parse(input: unknown): object {
      return this.schema.parse(input);
    }

    /** Valida sem lançar e devolve instância da subclasse chamadora (REQ-022). */
    static safeParse(input: unknown): z.ZodSafeParseResult<object> {
      return this.schema.safeParse(input);
    }

    /**
     * Serializa para o formato de transporte (REQ-023): aplica os codecs do schema (ex.: `Date` → ISO) e descarta
     * chaves desconhecidas. Aceita instância ou objeto plano, porque o `ZodObject` lê as chaves de qualquer objeto.
     *
     * **Limitação conhecida:** `z.encode` parte do lado **output** do schema. O tipo público declara
     * `z.output<S> | z.input<S>`, mas um valor já no formato de transporte em um campo cujo input difere do output
     * (`v.datetime()`, `v.boolish()`, ...) é rejeitado em runtime — a união do tipo cobre o caso de campos cujo
     * input e output coincidem (a maioria) e de classes aninhadas. Para valores crus, decodifique antes
     * (`Cls.parse(raw)`) e só então chame `encode`.
     */
    static encode(value: unknown): unknown {
      return z.encode(object, value as z.core.output<z.ZodObject>);
    }

    /**
     * **Não valida** (REQ-024): confia no tipo e faz `Object.assign`. Para validar, use `Cls.parse()`.
     *
     * Campos declarados na subclasse com `target: ES2022+` são reinicializados com `undefined` **depois** deste
     * construtor e apagam o valor atribuído; declare-os com `declare name: string`.
     */
    constructor(data?: object) {
      if (data) {
        Object.assign(this, data);
      }
    }
  }

  return Base as unknown as AdvancedClass<S>;
};
