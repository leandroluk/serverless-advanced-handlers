// Tipagem da implementação real de `Class()`, `isServerlessAdvancedHandlersClass()` e `instance()` (REQ-020..REQ-026).
//
// `advanced-class.test-d.ts` cobre o contrato a partir dos aliases de `#/class/types` (declarações puras); aqui
// as funções concretas de `#/class/class-factory` são exercitadas, para garantir que a implementação satisfaz o
// contrato travado e que a inferência sobrevive ao `extends` real.
import {describe, expectTypeOf, it} from 'vitest';
import * as z from 'zod';

import {Class, instance, isServerlessAdvancedHandlersClass} from '#/class/class-factory';
import type {
  AdvancedClass,
  AdvancedClassGuard,
  AnyAdvancedClass,
  ClassFactory,
  InstanceSchemaFactory,
} from '#/class/types';
import {v} from '#/validation/v';

const userSchema = v.object({id: v.string(), name: v.string(), createdAt: v.datetime()});
type UserSchema = typeof userSchema;

class UserEntity extends Class(userSchema) {
  get displayName(): string {
    return `${this.name} <${this.id}>`;
  }
}

class AdminEntity extends UserEntity {
  get isAdmin(): boolean {
    return true;
  }
}

class CreateUserBody extends Class(UserEntity.omit({id: true, createdAt: true})) {}

class CreateUserResponse extends Class(UserEntity) {}

class OrderEntity extends Class(v.object({code: v.string(), owner: v.instance(UserEntity)})) {}

declare class PlainClass {
  name: string;
}

declare const unknownValue: unknown;

describe('Class', () => {
  it('implementa exatamente a assinatura travada em #/class/types (REQ-020)', () => {
    expectTypeOf(Class).toEqualTypeOf<ClassFactory>();
    expectTypeOf(Class(userSchema)).toEqualTypeOf<AdvancedClass<UserSchema>>();
    expectTypeOf(Class(UserEntity)).toEqualTypeOf<AdvancedClass<UserSchema>>();
    expectTypeOf<typeof UserEntity>().toExtend<AnyAdvancedClass>();
    expectTypeOf<typeof AdminEntity>().toExtend<AnyAdvancedClass>();
    // @ts-expect-error a fonte precisa ser um ZodObject
    Class(v.string());
    // @ts-expect-error classe comum não é uma classe Class()
    Class(PlainClass);
  });

  it('expõe os estáticos do contrato na subclasse (REQ-021)', () => {
    expectTypeOf(UserEntity.object).toEqualTypeOf<UserSchema>();
    expectTypeOf(UserEntity.shape).toEqualTypeOf<UserSchema['shape']>();
    expectTypeOf(UserEntity.schema).toEqualTypeOf<z.ZodCodec<UserSchema, z.ZodType<z.output<UserSchema>>>>();
    expectTypeOf(UserEntity.omit).toEqualTypeOf<UserSchema['omit']>();
    expectTypeOf(UserEntity.pick).toEqualTypeOf<UserSchema['pick']>();
    expectTypeOf(UserEntity.partial).toEqualTypeOf<UserSchema['partial']>();
    expectTypeOf(UserEntity.extend).toEqualTypeOf<UserSchema['extend']>();
    expectTypeOf(UserEntity.partial()).toEqualTypeOf<ReturnType<UserSchema['partial']>>();
    // @ts-expect-error a máscara só aceita chaves do schema
    UserEntity.omit({unknown: true});
    // @ts-expect-error idem para pick
    UserEntity.pick({unknown: true});
  });

  it('parse e safeParse devolvem a instância da subclasse chamadora (REQ-022)', () => {
    const user = UserEntity.parse({});
    expectTypeOf(user).toEqualTypeOf<UserEntity>();
    expectTypeOf(user.displayName).toEqualTypeOf<string>();
    expectTypeOf(user.createdAt).toEqualTypeOf<Date>();
    expectTypeOf(UserEntity.safeParse({})).toEqualTypeOf<z.ZodSafeParseResult<UserEntity>>();

    const admin = AdminEntity.parse({});
    expectTypeOf(admin).toEqualTypeOf<AdminEntity>();
    expectTypeOf(admin.isAdmin).toEqualTypeOf<boolean>();
    expectTypeOf(AdminEntity.safeParse({})).toEqualTypeOf<z.ZodSafeParseResult<AdminEntity>>();

    const detachedParse = UserEntity.parse;
    // @ts-expect-error `parse` depende de `this`: chamado solto, não há subclasse para instanciar
    detachedParse({});
  });

  it('propaga a composição de schemas para a subclasse (REQ-020, REQ-021)', () => {
    const body = CreateUserBody.parse({});
    expectTypeOf(body).toEqualTypeOf<CreateUserBody>();
    expectTypeOf(body).toEqualTypeOf<{name: string}>();
    expectTypeOf(body).not.toHaveProperty('id');
    expectTypeOf(CreateUserResponse.object).toEqualTypeOf<UserSchema>();
    expectTypeOf(CreateUserResponse.parse({})).toEqualTypeOf<CreateUserResponse>();
    // @ts-expect-error `id` foi omitido do schema composto
    expectTypeOf(body.id).toBeString();
  });

  it('encode devolve o formato de transporte (REQ-023)', () => {
    expectTypeOf(UserEntity.encode).parameter(0).toEqualTypeOf<z.output<UserSchema> | z.input<UserSchema>>();
    expectTypeOf(UserEntity.encode(UserEntity.parse({}))).toEqualTypeOf<z.input<UserSchema>>();
    expectTypeOf(UserEntity.encode({id: '1', name: 'John', createdAt: new Date()}).createdAt).toEqualTypeOf<
      string | Date
    >();
    // @ts-expect-error `id` precisa ser string
    UserEntity.encode({id: 1, name: 'John', createdAt: new Date()});
  });

  it('o construtor recebe os campos do schema e não valida (REQ-024)', () => {
    expectTypeOf(UserEntity).constructorParameters.toEqualTypeOf<[z.output<UserSchema>]>();
    expectTypeOf(new UserEntity({id: '1', name: 'John', createdAt: new Date()})).toEqualTypeOf<UserEntity>();
    // @ts-expect-error o construtor não valida em runtime, mas continua tipado pelo output do schema
    new UserEntity({id: 1, name: 'John', createdAt: new Date()});
    // @ts-expect-error campo desconhecido não faz parte do output do schema
    new UserEntity({id: '1', name: 'John', createdAt: new Date(), passwordHash: 'secret'});
  });
});

describe('instance', () => {
  it('implementa exatamente a assinatura travada em #/class/types (REQ-026)', () => {
    expectTypeOf(instance).toEqualTypeOf<InstanceSchemaFactory>();
    expectTypeOf(v.instance).toEqualTypeOf<InstanceSchemaFactory>();
    expectTypeOf(instance).toEqualTypeOf<typeof v.instance>();
    expectTypeOf(instance(UserEntity)).toEqualTypeOf<z.ZodCodec<UserSchema, z.ZodType<UserEntity>>>();
    expectTypeOf(instance(AdminEntity)).toEqualTypeOf<z.ZodCodec<UserSchema, z.ZodType<AdminEntity>>>();
    // @ts-expect-error um ZodObject cru não é uma classe Class()
    instance(userSchema);
    // @ts-expect-error classe comum não é uma classe Class()
    instance(PlainClass);
    // @ts-expect-error uma instância não é a classe
    instance(UserEntity.parse({}));
  });

  it('tipa o campo aninhado como o codec da classe referenciada (REQ-026)', () => {
    expectTypeOf(OrderEntity.shape.owner).toEqualTypeOf<z.ZodCodec<UserSchema, z.ZodType<UserEntity>>>();
    expectTypeOf<z.output<typeof OrderEntity.shape.owner>>().toEqualTypeOf<UserEntity>();
    // É exatamente o que `instance` acrescenta: o mesmo codec de `UserEntity.schema` (`z.output<UserSchema>`, um
    // objeto plano sem os membros da classe) re-tipado para a instância.
    expectTypeOf<z.output<typeof OrderEntity.shape.owner>>().not.toEqualTypeOf<z.output<UserSchema>>();
    expectTypeOf<z.output<typeof UserEntity.schema>>().toEqualTypeOf<z.output<UserSchema>>();
    expectTypeOf<z.input<typeof OrderEntity.shape.owner>>().toEqualTypeOf<z.input<UserSchema>>();
  });

  it('parse devolve o campo aninhado como instância, não como objeto plano (REQ-026)', () => {
    const order = OrderEntity.parse({});

    expectTypeOf(order).toEqualTypeOf<OrderEntity>();
    expectTypeOf(order.owner).toEqualTypeOf<UserEntity>();
    expectTypeOf(order.owner.displayName).toEqualTypeOf<string>();
    expectTypeOf(order.owner.createdAt).toEqualTypeOf<Date>();
    expectTypeOf(OrderEntity.safeParse({})).toEqualTypeOf<z.ZodSafeParseResult<OrderEntity>>();
    // @ts-expect-error o aninhado é instância de UserEntity, não um objeto plano estrutural qualquer
    expectTypeOf(order.owner).toEqualTypeOf<z.input<UserSchema>>();
  });

  it('encode devolve o aninhado no formato de transporte (REQ-023, REQ-026)', () => {
    const encoded = OrderEntity.encode(OrderEntity.parse({}));

    expectTypeOf(encoded).toEqualTypeOf<z.input<typeof OrderEntity.object>>();
    expectTypeOf(encoded.owner).toEqualTypeOf<z.input<UserSchema>>();
    expectTypeOf(encoded.owner.createdAt).toEqualTypeOf<string | Date>();
    expectTypeOf(encoded.owner).not.toEqualTypeOf<UserEntity>();
  });

  it('o construtor recebe a instância aninhada (REQ-024, REQ-026)', () => {
    expectTypeOf(OrderEntity).constructorParameters.toEqualTypeOf<[{code: string; owner: UserEntity}]>();
    // @ts-expect-error o campo aninhado é tipado como instância, um objeto plano não basta
    new OrderEntity({code: 'A-1', owner: {id: '1', name: 'John', createdAt: new Date()}});
  });
});

describe('isServerlessAdvancedHandlersClass', () => {
  it('implementa o guard travado e estreita unknown (REQ-025)', () => {
    expectTypeOf(isServerlessAdvancedHandlersClass).toEqualTypeOf<AdvancedClassGuard>();
    expectTypeOf(isServerlessAdvancedHandlersClass).guards.toEqualTypeOf<AdvancedClass>();

    if (isServerlessAdvancedHandlersClass(unknownValue)) {
      expectTypeOf(unknownValue).toEqualTypeOf<AdvancedClass>();
      expectTypeOf(unknownValue.object).toEqualTypeOf<z.ZodObject>();
      expectTypeOf(unknownValue.encode).parameter(0).toEqualTypeOf<Record<string, unknown>>();
    }

    // @ts-expect-error o guard recebe um argumento
    isServerlessAdvancedHandlersClass();
  });
});
