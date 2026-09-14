import {describe, expectTypeOf, it} from 'vitest';
import * as z from 'zod';

import type {
  AdvancedClass,
  AdvancedClassGuard,
  AnyAdvancedClass,
  ClassFactory,
  InstanceSchemaFactory,
} from '#/class/types';

// As implementações só existem na F04: aqui bastam as assinaturas.
declare const Class: ClassFactory;
declare const instance: InstanceSchemaFactory;
declare const isServerlessAdvancedHandlersClass: AdvancedClassGuard;

/** Codec com input (`string`) diferente do output (`Date`), para distinguir `z.input` de `z.output`. */
declare const isoDate: z.ZodCodec<z.ZodISODateTime, z.ZodDate>;

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  createdAt: isoDate,
});
type UserSchema = typeof userSchema;

declare class UserEntity extends Class(userSchema) {
  get displayName(): string;
}

/** Subclasse de subclasse: `this` continua sendo a classe chamadora. */
declare class AdminEntity extends UserEntity {
  get isAdmin(): boolean;
}

declare abstract class AbstractEntity extends Class(userSchema) {}

declare class CreateUserBody extends Class(UserEntity.omit({id: true, createdAt: true})) {}

declare class CreateUserResponse extends Class(UserEntity) {}

const customerSchema = z.object({name: z.string(), email: z.string()});
type CustomerSchema = typeof customerSchema;

declare class Customer extends Class(customerSchema) {
  get displayName(): string;
}

const orderSchema = z.object({id: z.string(), placedAt: isoDate, owner: instance(Customer)});
type OrderSchema = typeof orderSchema;

declare class Order extends Class(orderSchema) {}

declare class PlainClass {
  name: string;
}

declare abstract class PlainAbstract {
  name: string;
}

declare const rawObject: z.ZodObject<{id: z.ZodString}>;

declare const unknownValue: unknown;

describe('AdvancedClass', () => {
  it('expõe construtor e estáticos do contrato (REQ-021)', () => {
    expectTypeOf(UserEntity).constructorParameters.toEqualTypeOf<[z.output<UserSchema>]>();
    expectTypeOf(UserEntity).instance.toEqualTypeOf<UserEntity>();
    expectTypeOf(UserEntity.object).toEqualTypeOf<UserSchema>();
    expectTypeOf(UserEntity.shape).toEqualTypeOf<UserSchema['shape']>();
    expectTypeOf(UserEntity.schema).toEqualTypeOf<z.ZodCodec<UserSchema, z.ZodType<z.output<UserSchema>>>>();
    expectTypeOf(UserEntity.omit).toEqualTypeOf<UserSchema['omit']>();
    expectTypeOf(UserEntity.pick).toEqualTypeOf<UserSchema['pick']>();
    expectTypeOf(UserEntity.partial).toEqualTypeOf<UserSchema['partial']>();
    expectTypeOf(UserEntity.extend).toEqualTypeOf<UserSchema['extend']>();
    expectTypeOf<typeof UserEntity>().toExtend<AdvancedClass<UserSchema>>();
  });

  it('schema é tipado como campos, não como instância (Q1)', () => {
    expectTypeOf<z.output<(typeof UserEntity)['schema']>>().toEqualTypeOf<z.output<UserSchema>>();
    expectTypeOf<z.output<(typeof UserEntity)['schema']>>().not.toHaveProperty('displayName');
  });

  it('parse e safeParse retornam a instância da subclasse chamadora (REQ-022)', () => {
    const user = UserEntity.parse({});
    expectTypeOf(user).toEqualTypeOf<UserEntity>();
    expectTypeOf(user.displayName).toEqualTypeOf<string>();
    expectTypeOf(user.createdAt).toEqualTypeOf<Date>();

    const result = UserEntity.safeParse({});
    expectTypeOf(result).toEqualTypeOf<z.ZodSafeParseResult<UserEntity>>();
    expectTypeOf<Extract<typeof result, {success: true}>['data']['displayName']>().toEqualTypeOf<string>();

    const admin = AdminEntity.parse({});
    expectTypeOf(admin).toEqualTypeOf<AdminEntity>();
    expectTypeOf(admin.isAdmin).toEqualTypeOf<boolean>();
    expectTypeOf(admin.displayName).toEqualTypeOf<string>();
    expectTypeOf(AdminEntity.safeParse({})).toEqualTypeOf<z.ZodSafeParseResult<AdminEntity>>();
    expectTypeOf(AbstractEntity.parse({})).toEqualTypeOf<AbstractEntity>();

    const detachedParse = UserEntity.parse;
    // @ts-expect-error `parse` depende de `this`: chamado solto, não há subclasse para instanciar
    detachedParse({});
  });

  it('subclasse de Class(UserEntity.omit(...)) não tem o campo omitido (REQ-020, REQ-021)', () => {
    const body = CreateUserBody.parse({});
    expectTypeOf(body).toEqualTypeOf<CreateUserBody>();
    expectTypeOf(body).toEqualTypeOf<{name: string; email: string}>();
    expectTypeOf(body).not.toHaveProperty('id');
    // @ts-expect-error `id` foi omitido do schema composto
    expectTypeOf(body.id).toBeString();
    // @ts-expect-error getters de `UserEntity` não fazem parte do schema composto
    expectTypeOf(body.displayName).toBeString();
    // @ts-expect-error a máscara só aceita chaves do schema
    UserEntity.omit({unknown: true});
  });

  it('Class() aceita ZodObject ou outra classe Class() como fonte (REQ-020)', () => {
    expectTypeOf(CreateUserResponse.object).toEqualTypeOf<UserSchema>();
    expectTypeOf(CreateUserResponse.parse({})).toEqualTypeOf<CreateUserResponse>();
    expectTypeOf(Class(userSchema)).toEqualTypeOf<AdvancedClass<UserSchema>>();
    expectTypeOf(Class(UserEntity)).toEqualTypeOf<AdvancedClass<UserSchema>>();
    // @ts-expect-error a fonte precisa ser um ZodObject
    Class(z.string());
    // @ts-expect-error classe comum não é fonte válida
    Class(PlainClass);
  });

  it('encode aceita instância ou objeto plano e devolve o input (REQ-023)', () => {
    const user = UserEntity.parse({});
    expectTypeOf(UserEntity.encode).parameter(0).toEqualTypeOf<z.output<UserSchema> | z.input<UserSchema>>();
    expectTypeOf(UserEntity.encode(user)).toEqualTypeOf<z.input<UserSchema>>();
    expectTypeOf(UserEntity.encode(user).createdAt).toEqualTypeOf<string>();
    expectTypeOf(
      UserEntity.encode({id: '1', name: 'John', email: 'john@email.com', createdAt: '2024-01-01T00:00:00.000Z'})
    ).toEqualTypeOf<z.input<UserSchema>>();
    expectTypeOf(
      UserEntity.encode({id: '1', name: 'John', email: 'john@email.com', createdAt: new Date()})
    ).toEqualTypeOf<z.input<UserSchema>>();
    // @ts-expect-error `id` precisa ser string
    UserEntity.encode({id: 1, name: 'John', email: 'john@email.com', createdAt: new Date()});
  });
});

describe('instance', () => {
  it('tipa o campo aninhado como instância da classe (REQ-026)', () => {
    expectTypeOf(instance(Customer)).toEqualTypeOf<z.ZodCodec<CustomerSchema, z.ZodType<Customer>>>();

    const order = Order.parse({});
    expectTypeOf(order).toEqualTypeOf<Order>();
    expectTypeOf(order.owner).toEqualTypeOf<Customer>();
    expectTypeOf(order.owner.displayName).toEqualTypeOf<string>();
    expectTypeOf(order.placedAt).toEqualTypeOf<Date>();
  });

  it('encode aceita a instância e o objeto plano com classe aninhada (REQ-023, REQ-026)', () => {
    const order = Order.parse({});
    expectTypeOf(Order.encode(order)).toEqualTypeOf<z.input<OrderSchema>>();
    expectTypeOf(Order.encode(order).owner).toEqualTypeOf<z.input<CustomerSchema>>();
    expectTypeOf(
      Order.encode({id: '1', placedAt: '2024-01-01T00:00:00.000Z', owner: {name: 'John', email: 'john@email.com'}})
    ).toEqualTypeOf<z.input<OrderSchema>>();

    // objeto plano com instância aninhada (com getter), com a data já decodificada ou ainda em string
    const customer = Customer.parse({});
    expectTypeOf(Order.encode({id: '1', placedAt: new Date(), owner: customer})).toEqualTypeOf<z.input<OrderSchema>>();
    expectTypeOf(Order.encode({id: '1', placedAt: '2024-01-01T00:00:00.000Z', owner: customer})).toEqualTypeOf<
      z.input<OrderSchema>
    >();
    // @ts-expect-error o campo aninhado continua tipado pelo schema de `Customer`
    Order.encode({id: '1', placedAt: '2024-01-01T00:00:00.000Z', owner: {name: 'John'}});
  });

  it('aceita classes Class() e subclasses, e rejeita o que não é classe Class()', () => {
    expectTypeOf<typeof UserEntity>().toExtend<AnyAdvancedClass>();
    expectTypeOf<typeof CreateUserBody>().toExtend<AnyAdvancedClass>();
    expectTypeOf<typeof AdminEntity>().toExtend<AnyAdvancedClass>();
    expectTypeOf<typeof AbstractEntity>().toExtend<AnyAdvancedClass>();
    expectTypeOf(instance(AdminEntity)).toEqualTypeOf<z.ZodCodec<UserSchema, z.ZodType<AdminEntity>>>();
    expectTypeOf(instance(AbstractEntity)).toEqualTypeOf<z.ZodCodec<UserSchema, z.ZodType<AbstractEntity>>>();
    // `AdvancedClass` sem argumento não é supertipo de classes concretas (construtor contravariante): daí `AnyAdvancedClass`
    expectTypeOf<typeof UserEntity>().not.toExtend<AdvancedClass>();
    // `AnyAdvancedClass` não é permissivo demais: construtor sem os estáticos, ou estáticos sem construtor, não bastam
    expectTypeOf<typeof PlainClass>().not.toExtend<AnyAdvancedClass>();
    expectTypeOf<typeof PlainAbstract>().not.toExtend<AnyAdvancedClass>();
    expectTypeOf<typeof rawObject>().not.toExtend<AnyAdvancedClass>();
    expectTypeOf<AdvancedClass<UserSchema>>().toExtend<AnyAdvancedClass>();
    expectTypeOf<AdvancedClass>().toExtend<AnyAdvancedClass>();
    expectTypeOf(instance(UserEntity)).toEqualTypeOf<z.ZodCodec<UserSchema, z.ZodType<UserEntity>>>();
    expectTypeOf<ReturnType<typeof instance<typeof UserEntity>>>().toEqualTypeOf<
      z.ZodCodec<UserSchema, z.ZodType<UserEntity>>
    >();
    // @ts-expect-error ZodObject puro não é classe
    instance(customerSchema);
    // @ts-expect-error classe comum não é classe Class()
    instance(PlainClass);
  });
});

describe('isServerlessAdvancedHandlersClass', () => {
  it('estreita unknown para AdvancedClass (REQ-025)', () => {
    expectTypeOf(isServerlessAdvancedHandlersClass).guards.toEqualTypeOf<AdvancedClass>();
    if (isServerlessAdvancedHandlersClass(unknownValue)) {
      expectTypeOf(unknownValue).toEqualTypeOf<AdvancedClass>();
      expectTypeOf(unknownValue.object).toEqualTypeOf<z.ZodObject>();
    }
  });
});
