# Tasks: `Class()` Factory (F04)

**Pré-requisito:** [validation-engine](../validation-engine/tasks.md) T-001 concluída (precisa de `src/validation/v.ts` existir para a nota de integração de T-002).

**Ondas:** sequencial — T-002 depende de T-001 (mesmo arquivo, e reexport em `v.ts`).

**Gate comum a todas as tasks:** `pnpm check` (oxlint + tsc) além do gate específico.

**Commit:** um commit por task (Conventional Commits), com código, testes e atualização de `STATE.md`/`tasks.md` (Spec Gate).

**Fluxo por task:** subtasks PO → DEV → QA → PO → commit, cada persona em um agente próprio (ver CONVENTIONS.md).

**Restrição importante:** `src/class/types.ts` (tipos `AdvancedClass`, `AnyAdvancedClass`, `ClassFactory`, `InstanceSchemaFactory`, `AdvancedClassGuard`) **já é API pública travada** por `public-api-core` T-005 e coberta pelo snapshot de `public-api-surface` T-005 (`test/public-api.spec.ts`). Nenhuma task aqui pode alterar esse arquivo — a implementação usa esses tipos como estão. O marcador de classe (`Symbol.for('serverless-advanced-handlers.class')`) é detalhe de runtime, **não faz parte do shape público de `AdvancedClass`** (o protótipo do INSIGHT §7.2 declara `readonly [CLASS_MARK]: true` na interface, mas o tipo já commitado não tem esse campo — a implementação define o símbolo na classe internamente e usa cast, sem propagar pro tipo público).

---

## T-001: `Class()` + `isServerlessAdvancedHandlersClass`
- **REQ**: REQ-020, REQ-021, REQ-022, REQ-023, REQ-024, REQ-025
- **Graph node**: `src/class/class-factory.ts` (planejado)
- **What**:
  - `Class<S extends z.ZodObject>(source: S | AdvancedClass<S>): AdvancedClass<S>` — implementação de referência em [INSIGHT.md §7.2](../../../INSIGHT.md), linhas ~850–904, adaptada ao tipo já commitado (`AdvancedClass<S extends z.ZodObject = z.ZodObject>`, sem `[CLASS_MARK]` na interface — ver "Restrição importante").
  - `object`/`shape` estáticos; `schema` getter memoizado por subclasse (`WeakMap<constructor, codec>` — cada subclasse precisa do seu próprio `decode` porque `new Target(data)` depende de `this`).
  - `omit`/`pick`/`partial` reconstroem via `z.object(shape)` a partir do `shape` filtrado — **não herdam refinements** (documentar isso no JSDoc, é uma limitação conhecida do Zod nativo em objetos com refinements). `extend` delega pro `object.extend()` nativo.
  - `parse`/`safeParse` chamam `this.schema.parse`/`safeParse` — o `this` genérico garante que a subclasse chamadora recebe sua própria instância tipada (REQ-022).
  - `encode(value)` usa `z.encode(object, value)` — aceita instância (tem os campos) ou objeto plano, remove chaves desconhecidas.
  - `new Cls(data)` só faz `Object.assign(this, data)` — sem validação (REQ-024).
  - `isServerlessAdvancedHandlersClass(value)` — checa `typeof value === 'function' && (value as {[k: symbol]: unknown})[CLASS_MARK] === true`.
  - `Class(source)` aceita tanto um `ZodObject` quanto outra classe `Class()` — nesse segundo caso, usa `source.object` (não pode recriar a partir do zero, senão perde identidade do schema original).
- **Where**: `src/class/class-factory.ts`, `src/index.ts` (`export {Class, isServerlessAdvancedHandlersClass} from '#/class/class-factory'`), `test/class-factory.spec.ts`, `test/types/class-factory.test-d.ts`
- **Depends on**: nada (F01 concluída cobre os tipos)
- **[P]**: P1
- **Done when**:
  - `class Foo extends Class(v.object({name: v.string()})) {}` — `Foo.parse({name: 'x'})` retorna instância de `Foo` (não de `Base` genérico).
  - Duas subclasses diferentes de `Class()` do mesmo schema base têm `schema` codecs independentes (memoização por `this`, não vazamento entre subclasses — teste adversarial: `Foo.parse()` nunca retorna instância de `Bar`).
  - `Foo.omit({name: true})` e `Foo.pick({name: true})` funcionam mesmo se o schema original tiver `.refine()` (documentado como não herdado, mas não deve lançar erro em runtime — só perder o refinement).
  - `Foo.encode(new Foo({name: 'x', extra: 1}))` remove `extra`.
  - `new Foo({name: 'x'})` não lança mesmo com dado inválido (`{name: 123}`) — REQ-024 é literal, sem validação.
  - `isServerlessAdvancedHandlersClass(Foo)` é `true`; `isServerlessAdvancedHandlersClass(v.object({}))` e de uma classe comum são `false`.
  - `class Bar extends Class(Foo) {}` — `Bar.object === Foo.object` (mesma referência de schema, não um clone).
- **Gate**: `pnpm vitest run test/class-factory.spec.ts && pnpm vitest run --typecheck test/types/class-factory.test-d.ts`
- **[x] Concluída.** Gate: 31/31 + 7/7 + `pnpm check`/`test` (660/660)/`build`. QA PASS (consumidor externo real, teste adversarial com ordem de acesso invertida entre subclasses, identidade de referência via `toBe`), PO ACCEPTED.
- **SPEC_DEVIATION (aceita, documentada, não corrigida):** `encode()` tem tipo travado `z.output<S> | z.input<S>`, mas a implementação literal (`z.encode(object, value)`, prescrita pela task) só funciona partindo do OUTPUT — um valor já no formato de transporte (ex.: `{createdAt: '2024-...'}` em campo `v.datetime()`) compila mas lança `ZodError` em runtime. É limitação real do `z.encode` nativo, não bug; documentada em JSDoc com o fluxo correto (`Cls.parse(raw).encode()`), testada explicitamente. "Tolerar" isso inventaria comportamento não pedido e teria ambiguidade quando input/output coincidem em shape.
- **Notas de execução:** `rebuild()` preserva `catchall` do schema original (`z.strictObject()` continua rejeitando chave extra depois de `omit()`/`pick()`) — bônus não pedido pelo AC mas coberto por teste.

## T-002: `instance()` + integração com `v`
- **REQ**: REQ-026
- **Graph node**: `src/class/class-factory.ts` (mesmo arquivo de T-001)
- **What**:
  - `instance<T extends AnyAdvancedClass>(cls: T): z.ZodCodec<T['object'], z.ZodType<InstanceType<T>>>` — retorna `cls.schema` (já é o codec certo; a assinatura só re-tipa pra deixar claro que o campo aninhado é instância, ver `InstanceSchemaFactory` em `src/class/types.ts`).
  - Adicionar `export {instance} from '#/class/class-factory';` em `src/validation/v.ts` (nota de integração deixada em `validation-engine/tasks.md`) — é assim que `v.instance(Cls)` passa a existir.
  - Atualizar `src/index.ts` se `instance` precisar de export nomeado adicional na raiz (confirmar se `export * as v from '#/validation/v'` já cobre, ou se falta um export direto).
- **Where**: `src/class/class-factory.ts`, `src/validation/v.ts`, `test/class-factory.spec.ts` (ampliar), `test/types/class-factory.test-d.ts` (ampliar)
- **Depends on**: T-001 (mesmo arquivo), validation-engine T-001 (`v.ts` precisa existir)
- **[P]**: P2
- **Done when**:
  - `class Order extends Class(v.object({owner: v.instance(User)})) {}` — `Order.parse(data).owner` é instância de `User` (não objeto plano), com tipo estático `User` (teste de tipo).
  - `Order.encode(order)` serializa `order.owner` corretamente via os codecs de `User` (não perde os campos do aninhado).
  - `v.instance` e `instance` (import direto de `class-factory`) são a mesma função (não duas implementações divergentes).
- **Gate**: `pnpm vitest run test/class-factory.spec.ts && pnpm vitest run --typecheck test/types/class-factory.test-d.ts`
- **[x] Concluída.** Gate: 47/47 + 12/12 + `pnpm check`/`lint:ci`/`test` (681/681)/`build`. QA PASS (consumidor isolado via `pnpm link:` fora do monorepo, testes adversariais de compartilhamento de codec/aninhamento em 2 níveis/propagação de erro), PO ACCEPTED.
- **SPEC_DEVIATION (aceita):** a nota de integração original (anterior à decisão 17 de F03) previa só `export {instance} from '#/class/class-factory'` em `v.ts` — isso não produz `v.instance()` porque `v` deixou de ser namespace sintetizado e virou `const` real. Fix: `instance` entra no objeto `extensions` (que compõe `v` via `Object.assign`), com o export nomeado mantido só por simetria (mesma função, não duplicação).
- **Notas de execução:** `root.instance` (export solto na raiz) permanece `undefined` de propósito — nenhum AC pede isso, e adicionar mudaria `ROOT_EXPORTS`/snapshot de public-api-surface (API travada) sem necessidade.

**F04 `class-factory` concluída (2/2).**
