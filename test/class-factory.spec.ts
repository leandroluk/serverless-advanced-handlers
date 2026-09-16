// Runtime de `Class()`, `isServerlessAdvancedHandlersClass()` e `instance()` (REQ-020..REQ-026).
import {describe, expect, it} from 'vitest';
import * as z from 'zod';

import {Class, instance, isServerlessAdvancedHandlersClass} from '#/class/class-factory';
import * as root from '#/index';
import * as vModule from '#/validation/v';
import {v} from '#/validation/v';

const userSchema = v.object({id: v.string(), name: v.string(), createdAt: v.datetime()});

class UserEntity extends Class(userSchema) {
  get displayName(): string {
    return `${this.name} <${this.id}>`;
  }
}

/** Subclasse de subclasse: `parse` continua devolvendo a folha da hierarquia. */
class AdminEntity extends UserEntity {
  get isAdmin(): boolean {
    return true;
  }
}

const raw = {id: '1', name: 'John', createdAt: '2024-03-01T12:00:00.000Z'};

describe('Class() — parse devolve instância da subclasse chamadora (REQ-020, REQ-022)', () => {
  it('devolve instância da classe, com getters próprios e campos decodificados', () => {
    const user = UserEntity.parse(raw);

    expect(user).toBeInstanceOf(UserEntity);
    expect(user.displayName).toBe('John <1>');
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.createdAt.toISOString()).toBe('2024-03-01T12:00:00.000Z');
  });

  it('devolve a folha da hierarquia, não a base intermediária', () => {
    const admin = AdminEntity.parse(raw);

    expect(admin).toBeInstanceOf(AdminEntity);
    expect(admin).toBeInstanceOf(UserEntity);
    expect(admin.isAdmin).toBe(true);
    expect(admin.displayName).toBe('John <1>');
    expect(UserEntity.parse(raw)).not.toBeInstanceOf(AdminEntity);
  });

  it('lança ZodError para entrada inválida', () => {
    expect(() => UserEntity.parse({id: 1, name: 'John', createdAt: raw.createdAt})).toThrow(z.ZodError);
    expect(() => UserEntity.parse(null)).toThrow(z.ZodError);
  });

  it('safeParse devolve instância no sucesso e não lança no erro', () => {
    const ok = UserEntity.safeParse(raw);
    const fail = UserEntity.safeParse({id: 1});

    expect(ok.success).toBe(true);
    expect(ok.data).toBeInstanceOf(UserEntity);
    expect(fail.success).toBe(false);
    expect(fail.error).toBeInstanceOf(z.ZodError);
  });

  it('descarta chaves desconhecidas do input na instância', () => {
    const user = UserEntity.parse({...raw, passwordHash: 'secret'});

    expect(user).not.toHaveProperty('passwordHash');
  });
});

describe('Class() — memoização do codec por subclasse (REQ-021, REQ-022)', () => {
  const BaseClass = Class(v.object({name: v.string()}));

  class Foo extends BaseClass {}
  class Bar extends BaseClass {}

  it('schema é memoizado: a mesma subclasse devolve sempre a mesma referência', () => {
    expect(Foo.schema).toBe(Foo.schema);
    expect(UserEntity.schema).toBe(UserEntity.schema);
  });

  it('subclasses irmãs do mesmo Class() têm codecs independentes', () => {
    expect(Foo.schema).not.toBe(Bar.schema);
    expect(Foo.schema).not.toBe(BaseClass.schema);
    expect(AdminEntity.schema).not.toBe(UserEntity.schema);
  });

  it('não vaza instâncias entre subclasses irmãs, em qualquer ordem de acesso', () => {
    // `Bar` é tocada primeiro de propósito: a memoização não pode depender da ordem de acesso.
    const bar = Bar.parse({name: 'a'});
    const foo = Foo.parse({name: 'a'});

    expect(bar).toBeInstanceOf(Bar);
    expect(bar).not.toBeInstanceOf(Foo);
    expect(foo).toBeInstanceOf(Foo);
    expect(foo).not.toBeInstanceOf(Bar);
    expect(BaseClass.parse({name: 'a'})).not.toBeInstanceOf(Foo);
  });

  it('cada chamada de Class() cria uma base própria', () => {
    const other = Class(v.object({name: v.string()}));

    expect(other).not.toBe(BaseClass);
    expect(other.schema).not.toBe(BaseClass.schema);
  });
});

describe('Class() — omit/pick/partial reconstroem o schema (REQ-021)', () => {
  const refinedSchema = v.object({name: v.string(), age: v.number()}).refine(value => value.age >= 18, 'adult only');

  class Person extends Class(refinedSchema) {}

  it('o Zod nativo lança nesses schemas — é o motivo da reconstrução', () => {
    expect(() => refinedSchema.omit({age: true})).toThrow(/refinements/);
    expect(() => refinedSchema.pick({name: true})).toThrow(/refinements/);
    expect(() => refinedSchema.partial()).toThrow(/refinements/);
  });

  it('omit remove as chaves da máscara sem lançar', () => {
    const omitted = Person.omit({age: true});

    expect(Object.keys(omitted.shape)).toEqual(['name']);
    expect(omitted.parse({name: 'John'})).toEqual({name: 'John'});
  });

  it('pick mantém só as chaves da máscara sem lançar', () => {
    const picked = Person.pick({name: true});

    expect(Object.keys(picked.shape)).toEqual(['name']);
    expect(picked.parse({name: 'John'})).toEqual({name: 'John'});
  });

  it('partial torna todos os campos opcionais', () => {
    const partial = Person.partial();

    expect(Object.keys(partial.shape)).toEqual(['name', 'age']);
    expect(partial.parse({})).toEqual({});
    expect(partial.parse({name: 'John'})).toEqual({name: 'John'});
    expect(() => partial.parse({age: 'x'})).toThrow(z.ZodError);
  });

  it('o schema composto não herda o refinement, mas a classe original continua refinando', () => {
    expect(Person.pick({age: true}).parse({age: 5})).toEqual({age: 5});
    expect(Person.partial().parse({name: 'John', age: 5})).toEqual({name: 'John', age: 5});
    expect(() => Person.parse({name: 'John', age: 5})).toThrow(z.ZodError);
  });

  it('preserva o catchall do original (strict continua strict)', () => {
    class StrictEntity extends Class(z.strictObject({a: z.string(), b: z.string()})) {}

    const omitted = StrictEntity.omit({b: true});

    expect(omitted.parse({a: 'x'})).toEqual({a: 'x'});
    expect(() => omitted.parse({a: 'x', extra: 1})).toThrow(z.ZodError);
  });

  it('extend delega ao object.extend() nativo e preserva o refinement', () => {
    const extended = Person.extend({email: v.string()});

    expect(Object.keys(extended.shape)).toEqual(['name', 'age', 'email']);
    expect(extended.parse({name: 'John', age: 30, email: 'john@email.com'})).toEqual({
      name: 'John',
      age: 30,
      email: 'john@email.com',
    });
    expect(extended.safeParse({name: 'John', age: 5, email: 'john@email.com'}).success).toBe(false);
  });

  it('os schemas compostos servem de fonte para novas classes', () => {
    class CreateUserBody extends Class(UserEntity.omit({id: true, createdAt: true})) {}

    const body = CreateUserBody.parse({name: 'John', id: 'ignored'});

    expect(body).toBeInstanceOf(CreateUserBody);
    expect(body).toEqual({name: 'John'});
  });
});

describe('Class() — encode (REQ-023)', () => {
  it('aceita instância e aplica os codecs do schema', () => {
    const user = UserEntity.parse(raw);

    expect(UserEntity.encode(user)).toEqual(raw);
  });

  it('aceita objeto plano, sem precisar de instância', () => {
    expect(UserEntity.encode({id: '1', name: 'John', createdAt: new Date(raw.createdAt)})).toEqual(raw);
  });

  it('remove chaves desconhecidas, venham de instância ou de objeto plano', () => {
    const decoded = {id: '1', name: 'John', createdAt: new Date(raw.createdAt)};
    const dirty = new UserEntity({...decoded, passwordHash: 'secret'} as never);

    expect(UserEntity.encode(dirty)).toEqual(raw);
    expect(UserEntity.encode({...decoded, passwordHash: 'secret'} as never)).toEqual(raw);
  });

  it('lança para valores fora do schema', () => {
    expect(() => UserEntity.encode({id: 1} as never)).toThrow(z.ZodError);
  });

  it('parte do lado output: valor ainda no formato de transporte é rejeitado (limitação documentada)', () => {
    // O tipo público declara `z.output<S> | z.input<S>`, mas `z.encode` só aceita o lado output. Para dados crus
    // o caminho é `Cls.parse(raw)` antes do `encode`.
    expect(() => UserEntity.encode(raw)).toThrow(z.ZodError);
    expect(UserEntity.encode(UserEntity.parse(raw))).toEqual(raw);
  });
});

describe('Class() — construtor não valida (REQ-024)', () => {
  it('atribui os dados silenciosamente, mesmo inválidos', () => {
    const bogus = new UserEntity({id: 123, name: null, createdAt: 'nope'} as never);

    expect(bogus).toBeInstanceOf(UserEntity);
    expect(bogus).toMatchObject({id: 123, name: null, createdAt: 'nope'});
  });

  it('aceita construção sem dados', () => {
    expect(new UserEntity(undefined as never)).toBeInstanceOf(UserEntity);
    expect({...new UserEntity(undefined as never)}).toEqual({});
  });
});

describe('isServerlessAdvancedHandlersClass (REQ-025)', () => {
  class Composed extends Class(UserEntity) {}
  class Plain {}

  it('é true para Class() e para toda a cadeia de subclasses', () => {
    expect(isServerlessAdvancedHandlersClass(Class(v.object({})))).toBe(true);
    expect(isServerlessAdvancedHandlersClass(UserEntity)).toBe(true);
    expect(isServerlessAdvancedHandlersClass(AdminEntity)).toBe(true);
    expect(isServerlessAdvancedHandlersClass(Composed)).toBe(true);
  });

  it('é false para schemas, classes comuns, instâncias e valores quaisquer', () => {
    const values = [
      v.object({}),
      v.string(),
      Plain,
      UserEntity.parse(raw),
      UserEntity.object,
      (): void => {},
      {},
      [],
      null,
      undefined,
      'UserEntity',
      0,
    ];

    expect(values.map(value => isServerlessAdvancedHandlersClass(value))).toEqual(values.map(() => false));
  });

  it('usa o registro global de símbolos, para reconhecer classes de outra cópia do pacote', () => {
    const fromAnotherCopy = Object.assign(function (): void {}, {
      [Symbol.for('serverless-advanced-handlers.class')]: true,
    });

    expect(isServerlessAdvancedHandlersClass(fromAnotherCopy)).toBe(true);
  });
});

describe('Class(OutraClasse) reaproveita o schema da fonte (REQ-020)', () => {
  class Composed extends Class(UserEntity) {}

  it('usa a mesma referência de ZodObject, sem reconstruir', () => {
    expect(Composed.object).toBe(UserEntity.object);
    expect(Composed.object).toBe(userSchema);
    expect(Composed.shape).toBe(userSchema.shape);
  });

  it('gera uma hierarquia independente da fonte', () => {
    const composed = Composed.parse(raw);

    expect(composed).toBeInstanceOf(Composed);
    expect(composed).not.toBeInstanceOf(UserEntity);
    expect(Composed.schema).not.toBe(UserEntity.schema);
  });

  it('aceita ZodObject e classe Class() de forma intercambiável', () => {
    expect(Class(userSchema).object).toBe(userSchema);
    expect(Class(UserEntity).object).toBe(userSchema);
  });
});

describe('instance() — campo aninhado tipado como instância (REQ-026)', () => {
  class OrderEntity extends Class(v.object({code: v.string(), owner: v.instance(UserEntity)})) {
    get label(): string {
      return `${this.code}: ${this.owner.displayName}`;
    }
  }

  const rawOrder = {code: 'A-1', owner: raw};

  it('v.instance e o import direto são a mesma função, não duas implementações', () => {
    expect(v.instance).toBe(instance);
    expect(vModule.instance).toBe(instance);
    expect(typeof v.instance).toBe('function');
  });

  it('devolve o próprio codec memoizado da classe, sem construir um novo', () => {
    expect(instance(UserEntity)).toBe(UserEntity.schema);
    expect(instance(UserEntity)).toBe(instance(UserEntity));
    expect(instance(AdminEntity)).not.toBe(instance(UserEntity));
  });

  it('expõe o codec da classe aninhada no shape do schema composto', () => {
    expect(OrderEntity.shape.owner).toBe(UserEntity.schema);
  });

  it('parse devolve instância real da classe aninhada, com campos decodificados', () => {
    const order = OrderEntity.parse(rawOrder);

    expect(order).toBeInstanceOf(OrderEntity);
    expect(order.owner).toBeInstanceOf(UserEntity);
    expect(order.owner).not.toEqual({...raw});
    expect(order.owner.createdAt).toBeInstanceOf(Date);
    expect(order.owner.displayName).toBe('John <1>');
    expect(order.label).toBe('A-1: John <1>');
  });

  it('cada parse constrói uma instância aninhada nova', () => {
    expect(OrderEntity.parse(rawOrder).owner).not.toBe(OrderEntity.parse(rawOrder).owner);
  });

  it('respeita a subclasse referenciada, não a base da hierarquia', () => {
    class AdminOrder extends Class(v.object({owner: v.instance(AdminEntity)})) {}

    const admin = AdminOrder.parse({owner: raw}).owner;

    expect(admin).toBeInstanceOf(AdminEntity);
    expect(admin.isAdmin).toBe(true);
    expect(OrderEntity.parse(rawOrder).owner).not.toBeInstanceOf(AdminEntity);
  });

  it('propaga a validação do schema aninhado', () => {
    expect(() => OrderEntity.parse({code: 'A-1', owner: {...raw, id: 1}})).toThrow(z.ZodError);
    expect(() => OrderEntity.parse({code: 'A-1', owner: null})).toThrow(z.ZodError);
    expect(OrderEntity.safeParse({code: 'A-1', owner: {}}).success).toBe(false);
  });

  it('descarta chaves desconhecidas do objeto aninhado', () => {
    const order = OrderEntity.parse({code: 'A-1', owner: {...raw, passwordHash: 'secret'}});

    expect(order.owner).not.toHaveProperty('passwordHash');
  });

  it('encode serializa o aninhado pelos codecs da classe referenciada (REQ-023)', () => {
    const order = OrderEntity.parse(rawOrder);
    const encoded = OrderEntity.encode(order);

    expect(encoded).toEqual(rawOrder);
    expect(encoded.owner).toEqual(raw);
    expect(encoded.owner.createdAt).toBe(raw.createdAt);
    expect(encoded.owner).not.toBeInstanceOf(UserEntity);
  });

  it('encode aceita objeto plano no lugar da instância aninhada', () => {
    const encoded = OrderEntity.encode({
      code: 'A-1',
      owner: {id: '1', name: 'John', createdAt: new Date(raw.createdAt)},
    });

    expect(encoded).toEqual(rawOrder);
  });

  it('encode remove chaves desconhecidas do aninhado', () => {
    const order = OrderEntity.parse(rawOrder);

    Object.assign(order.owner, {passwordHash: 'secret'});

    expect(OrderEntity.encode(order)).toEqual(rawOrder);
  });

  it('compõe com os combinadores do Zod (array, optional, nullable)', () => {
    class Team extends Class(
      v.object({members: v.array(v.instance(UserEntity)), lead: v.instance(UserEntity).optional()})
    ) {}

    const team = Team.parse({members: [raw, {...raw, id: '2'}]});

    expect(team.members).toHaveLength(2);
    expect(team.members.every(member => member instanceof UserEntity)).toBe(true);
    expect(team.lead).toBeUndefined();
    expect(Team.parse({members: [], lead: raw}).lead).toBeInstanceOf(UserEntity);
    expect(Team.encode(Team.parse({members: [raw]}))).toEqual({members: [raw]});
  });

  it('aninha em mais de um nível, ida e volta', () => {
    class Invoice extends Class(v.object({total: v.number(), order: v.instance(OrderEntity)})) {}

    const rawInvoice = {total: 10, order: rawOrder};
    const invoice = Invoice.parse(rawInvoice);

    expect(invoice).toBeInstanceOf(Invoice);
    expect(invoice.order).toBeInstanceOf(OrderEntity);
    expect(invoice.order.owner).toBeInstanceOf(UserEntity);
    expect(invoice.order.label).toBe('A-1: John <1>');
    expect(Invoice.encode(invoice)).toEqual(rawInvoice);
  });

  it('dois campos da mesma classe compartilham o codec, sem vazar instância', () => {
    class Transfer extends Class(v.object({from: v.instance(UserEntity), to: v.instance(UserEntity)})) {}

    const transfer = Transfer.parse({from: raw, to: {...raw, id: '2', name: 'Jane'}});

    expect(Transfer.shape.from).toBe(Transfer.shape.to);
    expect(transfer.from).toBeInstanceOf(UserEntity);
    expect(transfer.to).toBeInstanceOf(UserEntity);
    expect(transfer.from).not.toBe(transfer.to);
    expect(transfer.to.displayName).toBe('Jane <2>');
  });

  it('aceita uma classe composta por Class(OutraClasse)', () => {
    class Composed extends Class(UserEntity) {}
    class Wrapper extends Class(v.object({owner: v.instance(Composed)})) {}

    const owner = Wrapper.parse({owner: raw}).owner;

    expect(owner).toBeInstanceOf(Composed);
    expect(owner).not.toBeInstanceOf(UserEntity);
  });
});

describe('superfície pública', () => {
  it('reexporta Class e isServerlessAdvancedHandlersClass na raiz', () => {
    expect(root.Class).toBe(Class);
    expect(root.isServerlessAdvancedHandlersClass).toBe(isServerlessAdvancedHandlersClass);
  });

  it('expõe instance em v, alcançável pela raiz (REQ-026)', () => {
    expect(root.v.instance).toBe(instance);
  });
});
