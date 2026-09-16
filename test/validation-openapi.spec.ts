// JSON Schema de transporte (REQ-019): target por `specVersion`, representação das extensões e aliases de campo.
import {describe, expect, it} from 'vitest';
import * as z from 'zod';

import * as root from '#/index';
import {toOpenapiSchema} from '#/validation/openapi';
import {v} from '#/validation/v';

/** `$schema` só existe no target 2020-12; as asserções de forma ficam mais legíveis sem ele. */
function withoutDialect(json: Record<string, unknown>): Record<string, unknown> {
  const {$schema: _dialect, ...rest} = json;

  return rest;
}

describe('toOpenapiSchema — specVersion (AC-1, AC-5)', () => {
  it('maps 3.1 to the draft-2020-12 dialect', () => {
    expect(toOpenapiSchema(v.string(), {specVersion: '3.1'})).toMatchObject({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'string',
    });
  });

  it('maps 3.0 to the openapi-3.0 dialect, which carries no $schema', () => {
    expect(toOpenapiSchema(v.string(), {specVersion: '3.0'})).toEqual({type: 'string'});
  });

  it('emits exclusiveMinimum as a number in 3.1 and as a boolean flag in 3.0 (AC-5)', () => {
    expect(withoutDialect(toOpenapiSchema(v.number().gt(5), {specVersion: '3.1'}))).toEqual({
      type: 'number',
      exclusiveMinimum: 5,
    });
    expect(toOpenapiSchema(v.number().gt(5), {specVersion: '3.0'})).toEqual({
      type: 'number',
      minimum: 5,
      exclusiveMinimum: true,
    });
  });

  it('emits nullable as a 3.0 keyword instead of a type union', () => {
    expect(toOpenapiSchema(v.string().nullable(), {specVersion: '3.0'})).toEqual({type: 'string', nullable: true});
    expect(withoutDialect(toOpenapiSchema(v.string().nullable(), {specVersion: '3.1'}))).toEqual({
      anyOf: [{type: 'string'}, {type: 'null'}],
    });
  });
});

describe('toOpenapiSchema — transport format (AC-2)', () => {
  it('documents the input side of a codec, not the decoded value', () => {
    // `v.duration()` entrega `number` ao handler, mas o que trafega é `'5m'` — `io: 'input'`.
    expect(withoutDialect(toOpenapiSchema(v.duration(), {specVersion: '3.1'})).oneOf).toBeDefined();
  });

  it('turns an unrepresentable type into {} instead of throwing (unrepresentable: any)', () => {
    const schema = v.object({token: v.custom<symbol>()});

    expect(() => toOpenapiSchema(schema, {specVersion: '3.1'})).not.toThrow();
    expect(withoutDialect(toOpenapiSchema(schema, {specVersion: '3.1'}))).toEqual({
      type: 'object',
      properties: {token: {}},
      required: ['token'],
    });
  });

  it('documents a schema with a default as optional in the input format', () => {
    const json = withoutDialect(toOpenapiSchema(v.object({page: v.number().default(1)}), {specVersion: '3.1'}));

    expect(json.required).toBeUndefined();
  });
});

describe('toOpenapiSchema — extension overrides (AC-3)', () => {
  it('documents v.boolish() as a plain boolean, not the internal union', () => {
    expect(withoutDialect(toOpenapiSchema(v.boolish(), {specVersion: '3.1'}))).toEqual({type: 'boolean'});
  });

  it('documents a customized v.boolish() the same way', () => {
    const schema = v.boolish({truthy: ['sim'], falsy: ['nao']});

    expect(withoutDialect(toOpenapiSchema(schema, {specVersion: '3.1'}))).toEqual({type: 'boolean'});
  });

  it('documents v.duration() as the oneOf of REQ-013', () => {
    expect(withoutDialect(toOpenapiSchema(v.duration(), {specVersion: '3.1'}))).toEqual({
      oneOf: [
        {type: 'string', examples: ['5m', '1d']},
        {type: 'integer', minimum: 0},
      ],
    });
  });

  it('documents v.datetime() as a date-time string', () => {
    expect(withoutDialect(toOpenapiSchema(v.datetime(), {specVersion: '3.1'}))).toEqual({
      type: 'string',
      format: 'date-time',
    });
  });

  it('documents v.timestamp() through its default wrapper', () => {
    expect(withoutDialect(toOpenapiSchema(v.timestamp(), {specVersion: '3.1'}))).toEqual({
      type: 'string',
      format: 'date-time',
    });
  });

  it('documents v.file() with format binary', () => {
    expect(withoutDialect(toOpenapiSchema(v.file(), {specVersion: '3.1'}))).toMatchObject({format: 'binary'});
  });

  it('keeps the size and mimetype constraints of v.file()', () => {
    const json = withoutDialect(
      toOpenapiSchema(v.file({maxSize: '2MB', mimetypes: ['image/png']}), {specVersion: '3.1'})
    );

    expect(json).toMatchObject({format: 'binary', maxLength: 2 * 1024 * 1024, contentMediaType: 'image/png'});
  });

  it('applies the override through the clone created by .meta()', () => {
    // `.meta()` não muta o schema: devolve um clone. Sem subir a cadeia de `parent`, voltaria a union crua.
    expect(withoutDialect(toOpenapiSchema(v.boolish().meta({name: 'flag'}), {specVersion: '3.1'}))).toEqual({
      type: 'boolean',
    });
    expect(withoutDialect(toOpenapiSchema(v.datetime().describe('quando'), {specVersion: '3.1'}))).toEqual({
      type: 'string',
      format: 'date-time',
      description: 'quando',
    });
  });

  it('keeps the annotations of the schema it replaces', () => {
    const schema = v.boolish().meta({description: 'Aceita os termos', title: 'Aceite', deprecated: true});

    expect(withoutDialect(toOpenapiSchema(schema, {specVersion: '3.1'}))).toEqual({
      type: 'boolean',
      description: 'Aceita os termos',
      title: 'Aceite',
      deprecated: true,
    });
  });

  it('applies the override inside wrappers, arrays and objects', () => {
    expect(withoutDialect(toOpenapiSchema(v.array(v.boolish()), {specVersion: '3.1'}))).toEqual({
      type: 'array',
      items: {type: 'boolean'},
    });
    expect(withoutDialect(toOpenapiSchema(v.object({flag: v.boolish().optional()}), {specVersion: '3.1'}))).toEqual({
      type: 'object',
      properties: {flag: {type: 'boolean'}},
    });
  });

  it('applies the override inside an extracted $def', () => {
    const json = withoutDialect(
      toOpenapiSchema(v.object({ttl: v.duration().meta({id: 'Duration'})}), {specVersion: '3.1'})
    );

    expect(json.properties).toEqual({ttl: {$ref: '#/$defs/Duration'}});
    expect(json.$defs).toEqual({
      Duration: {
        oneOf: [
          {type: 'string', examples: ['5m', '1d']},
          {type: 'integer', minimum: 0},
        ],
      },
    });
  });

  it('leaves v.delimited() with its native representation (no override registered)', () => {
    expect(withoutDialect(toOpenapiSchema(v.delimited(v.string()), {specVersion: '3.1'}))).toEqual({
      anyOf: [{type: 'string'}, {type: 'array', items: {type: 'string'}}],
    });
  });
});

describe('toOpenapiSchema — transport aliases (AC-4, AC-9)', () => {
  it('renames a property to its meta name and keeps required in sync (AC-9)', () => {
    const schema = v.object({firstName: v.string().meta({name: 'first_name'}), age: v.number()});

    expect(withoutDialect(toOpenapiSchema(schema, {specVersion: '3.1'}))).toEqual({
      type: 'object',
      properties: {first_name: {type: 'string'}, age: {type: 'number'}},
      required: ['first_name', 'age'],
    });
  });

  it('preserves the declaration order of the shape when renaming', () => {
    const schema = v.object({
      firstName: v.string().meta({name: 'first_name'}),
      age: v.number(),
      lastName: v.string().meta({name: 'last_name'}),
    });
    const {properties} = toOpenapiSchema(schema, {specVersion: '3.1'});

    expect(Object.keys(properties ?? {})).toEqual(['first_name', 'age', 'last_name']);
  });

  it('never leaks the framework "name" key into the generated schema', () => {
    const json = withoutDialect(
      toOpenapiSchema(v.object({firstName: v.string().meta({name: 'first_name'})}), {
        specVersion: '3.1',
      })
    );

    expect(JSON.stringify(json)).not.toContain('"name"');
    expect(toOpenapiSchema(v.string().meta({name: 'anything'}), {specVersion: '3.0'})).toEqual({type: 'string'});
  });

  it('resolves the name behind wrappers, in both orders (AC-4)', () => {
    const inner = v.object({a: v.string().meta({name: 'a_x'}).optional()});
    const outer = v.object({a: v.string().optional().meta({name: 'a_x'})});

    for (const schema of [inner, outer]) {
      expect(withoutDialect(toOpenapiSchema(schema, {specVersion: '3.1'}))).toEqual({
        type: 'object',
        properties: {a_x: {type: 'string'}},
      });
    }
  });

  it('resolves the name through a chain of wrappers, outermost winning', () => {
    const schema = v.object({
      value: v.string().meta({name: 'ignored'}).optional().meta({name: 'kept'}).nullable(),
    });

    expect(Object.keys(toOpenapiSchema(schema, {specVersion: '3.1'}).properties ?? {})).toEqual(['kept']);
  });

  it('resolves the name after .min()/.max() applied on top of .meta() (AC-6)', () => {
    const schema = v.object({
      firstName: v.string().meta({name: 'first_name'}).min(2).max(30),
      score: v.number().meta({name: 'total_score'}).min(0),
    });

    expect(withoutDialect(toOpenapiSchema(schema, {specVersion: '3.1'}))).toEqual({
      type: 'object',
      properties: {
        first_name: {type: 'string', minLength: 2, maxLength: 30},
        total_score: {type: 'number', minimum: 0},
      },
      required: ['first_name', 'total_score'],
    });
  });

  it('renames the extension properties as well', () => {
    const schema = v.object({
      isActive: v.boolish().meta({name: 'is_active'}),
      createdAt: v.datetime().meta({name: 'created_at'}),
      ttl: v.duration().meta({name: 'ttl_ms'}),
    });
    const {properties} = toOpenapiSchema(schema, {specVersion: '3.1'});

    expect(Object.keys(properties ?? {})).toEqual(['is_active', 'created_at', 'ttl_ms']);
    expect(properties?.is_active).toEqual({type: 'boolean'});
    expect(properties?.created_at).toEqual({type: 'string', format: 'date-time'});
  });

  it('renames nested objects, arrays of objects and extracted $defs', () => {
    const address = v.object({zipCode: v.string().meta({name: 'zip_code'})});
    const schema = v.object({
      homeAddress: address.meta({name: 'home_address'}),
      otherAddresses: v.array(v.object({zipCode: v.string().meta({name: 'zip_code'})})).meta({name: 'other_addresses'}),
    });

    expect(withoutDialect(toOpenapiSchema(schema, {specVersion: '3.1'}))).toEqual({
      type: 'object',
      properties: {
        home_address: {type: 'object', properties: {zip_code: {type: 'string'}}, required: ['zip_code']},
        other_addresses: {
          type: 'array',
          items: {type: 'object', properties: {zip_code: {type: 'string'}}, required: ['zip_code']},
        },
      },
      required: ['home_address', 'other_addresses'],
    });
  });

  it('ignores an empty name and keeps the TypeScript key', () => {
    const schema = v.object({firstName: v.string().meta({name: ''})});

    expect(Object.keys(toOpenapiSchema(schema, {specVersion: '3.1'}).properties ?? {})).toEqual(['firstName']);
  });

  it('throws when two fields collide on the same transport name', () => {
    const duplicated = v.object({
      firstName: v.string().meta({name: 'first_name'}),
      legacyFirstName: v.string().meta({name: 'first_name'}),
    });
    const shadowing = v.object({firstName: v.string().meta({name: 'age'}), age: v.number()});

    expect(() => toOpenapiSchema(duplicated, {specVersion: '3.1'})).toThrow(
      '[serverless-advanced-handlers] Duplicate transport name "first_name" in object schema'
    );
    expect(() => toOpenapiSchema(shadowing, {specVersion: '3.1'})).toThrow('Duplicate transport name "age"');
  });
});

describe('toOpenapiSchema — schemas without any override (AC-8)', () => {
  it('generates the plain JSON Schema of the Zod primitives', () => {
    expect(withoutDialect(toOpenapiSchema(v.string(), {specVersion: '3.1'}))).toEqual({type: 'string'});
    expect(withoutDialect(toOpenapiSchema(v.number(), {specVersion: '3.1'}))).toEqual({type: 'number'});
    expect(withoutDialect(toOpenapiSchema(v.string().email().min(3), {specVersion: '3.1'}))).toEqual({
      type: 'string',
      format: 'email',
      pattern: expect.any(String),
      minLength: 3,
    });
  });

  it('matches z.toJSONSchema for an untouched object schema', () => {
    const schema = z.object({id: z.string(), tags: z.array(z.string()), active: z.boolean().optional()});

    expect(toOpenapiSchema(schema, {specVersion: '3.1'})).toEqual(
      z.toJSONSchema(schema, {io: 'input', target: 'draft-2020-12', unrepresentable: 'any'})
    );
  });

  it('keeps the native metadata of a schema without aliases', () => {
    const schema = v.object({id: v.string().meta({title: 'Id', description: 'Identificador', deprecated: true})});

    expect(withoutDialect(toOpenapiSchema(schema, {specVersion: '3.1'}))).toEqual({
      type: 'object',
      properties: {id: {type: 'string', title: 'Id', description: 'Identificador', deprecated: true}},
      required: ['id'],
    });
  });
});

describe('toOpenapiSchema — signature and package root (AC-7)', () => {
  it('accepts a z.ZodType and returns a JSON Schema object', () => {
    const json: z.core.JSONSchema.BaseSchema = toOpenapiSchema(v.string(), {specVersion: '3.1'});

    expect(json).toBeTypeOf('object');
    expect(toOpenapiSchema.length).toBe(2);
  });

  it('rejects an invalid specVersion at compile time', () => {
    // @ts-expect-error `specVersion` só aceita '3.0' e '3.1'.
    expect(() => toOpenapiSchema(v.string(), {specVersion: '3.2'})).not.toThrow();
    // @ts-expect-error `opts` é obrigatório.
    expect(() => toOpenapiSchema(v.string())).toThrow(TypeError);
    // @ts-expect-error o primeiro argumento é um schema do Zod.
    expect(() => toOpenapiSchema({}, {specVersion: '3.1'})).toThrow(Error);
  });

  it('is reexported from the package root', () => {
    expect(root.toOpenapiSchema).toBe(toOpenapiSchema);
  });
});
