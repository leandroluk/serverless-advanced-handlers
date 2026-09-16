// Metadados de `.meta()` (REQ-016..REQ-018): merge pela cadeia de wrappers e validação strict das chaves.
import {describe, expect, it} from 'vitest';
import * as z from 'zod';

import * as root from '#/index';
import {resolveMeta, validateMeta} from '#/validation/meta';
import {v} from '#/validation/v';

describe('resolveMeta (REQ-018)', () => {
  it('returns an empty object for a schema without metadata', () => {
    expect(resolveMeta(v.string())).toEqual({});
  });

  it('returns the own metadata of an unwrapped schema', () => {
    expect(resolveMeta(v.string().meta({name: 'first_name', description: 'Primeiro nome'}))).toEqual({
      name: 'first_name',
      description: 'Primeiro nome',
    });
  });

  it('does not expose the inner metadata through a wrapper without resolveMeta', () => {
    const schema = v.string().meta({name: 'first_name'}).optional();

    expect(schema.meta()).toBeUndefined();
    expect(resolveMeta(schema)).toEqual({name: 'first_name'});
  });

  it('merges metadata across three chained wrappers, outermost wins (AC-2)', () => {
    const schema = v
      .string()
      .meta({description: 'Primeiro nome', name: 'fname', title: 'Nome'})
      .optional()
      .meta({name: 'first_name'})
      .nullable()
      .meta({title: 'Nome do usuário'})
      .default(null)
      .meta({deprecated: true});

    expect(resolveMeta(schema)).toEqual({
      description: 'Primeiro nome',
      name: 'first_name',
      title: 'Nome do usuário',
      deprecated: true,
    });
  });

  it('walks every wrapper kind', () => {
    const wrapped = [
      v.string().meta({name: 'a'}).optional(),
      v.string().meta({name: 'a'}).nullable(),
      v.string().meta({name: 'a'}).default('x'),
      v.string().meta({name: 'a'}).prefault('x'),
      v.string().meta({name: 'a'}).catch('x'),
      v.string().meta({name: 'a'}).readonly(),
      v.string().meta({name: 'a'}).optional().nonoptional(),
    ];

    for (const schema of wrapped) {
      expect(resolveMeta(schema)).toEqual({name: 'a'});
    }
  });

  it('returns a fresh object, never the one stored in the global registry', () => {
    const inner = v.string().meta({name: 'first_name'});
    const resolved = resolveMeta(inner.optional());

    resolved.name = 'mutated';

    expect(inner.meta()).toEqual({name: 'first_name'});
    expect(resolveMeta(inner)).toEqual({name: 'first_name'});
  });

  it('works after .min()/.max(), which the Zod clone inherits natively (AC-3)', () => {
    const schema = v.string().meta({name: 'first_name', description: 'Primeiro nome'}).min(2).max(10);

    expect(resolveMeta(schema)).toEqual({name: 'first_name', description: 'Primeiro nome'});
  });

  it('works on a refinement clone that is then wrapped', () => {
    const schema = v.number().meta({name: 'age'}).min(18).optional().meta({description: 'Idade'});

    expect(resolveMeta(schema)).toEqual({name: 'age', description: 'Idade'});
  });

  it('works on an object field after omit/pick (AC-4)', () => {
    const User = v.object({
      firstName: v.string().meta({name: 'first_name'}),
      isActive: v.boolish().optional().meta({name: 'is_active'}),
      secret: v.string(),
    });

    const picked = User.pick({firstName: true, isActive: true});
    const omitted = User.omit({secret: true});

    expect(resolveMeta(picked.shape.firstName)).toEqual({name: 'first_name'});
    expect(resolveMeta(picked.shape.isActive)).toEqual({name: 'is_active'});
    expect(resolveMeta(omitted.shape.firstName)).toEqual({name: 'first_name'});
    expect(resolveMeta(omitted.shape.isActive)).toEqual({name: 'is_active'});
  });

  it('keeps the field metadata reachable after partial(), which adds an optional wrapper', () => {
    const User = v.object({firstName: v.string().meta({name: 'first_name'})});

    expect(resolveMeta(User.partial().shape.firstName)).toEqual({name: 'first_name'});
  });

  it('resolves metadata on the extensions', () => {
    const active = v
      .boolish()
      .optional()
      .meta({name: 'is_active', examples: [true]});

    expect(resolveMeta(active)).toEqual({name: 'is_active', examples: [true]});
  });

  it('does not leak metadata from a sibling schema', () => {
    const named = v.string().meta({name: 'first_name'});

    expect(resolveMeta(v.string().optional())).toEqual({});
    expect(resolveMeta(named)).toEqual({name: 'first_name'});
  });

  it('accepts a core schema built directly with zod', () => {
    expect(resolveMeta(z.string().meta({title: 'Título'}).optional())).toEqual({title: 'Título'});
  });
});

describe('validateMeta (REQ-017)', () => {
  it('accepts every reserved key (AC-5)', () => {
    const schema = v.object({
      firstName: v.string().meta({
        name: 'first_name',
        examples: ['John'],
        id: 'FirstName',
        title: 'Nome',
        description: 'Primeiro nome',
        deprecated: false,
      }),
    });

    expect(() => validateMeta(schema, 'UserEntity')).not.toThrow();
  });

  it('accepts a schema without any metadata', () => {
    expect(() => validateMeta(v.object({id: v.uuid(), tags: v.array(v.string())}))).not.toThrow();
  });

  it('rejects an unknown key with the field path in the message (AC-6)', () => {
    // Nota: `nmae` não é erro de tipo — o index signature `[k: string]: unknown` do Zod deixa passar
    // qualquer chave. É exatamente esse buraco que `validateMeta` fecha em tempo de build.
    const UserEntity = v.object({name: v.string().meta({nmae: 'first_name'})});

    expect(() => validateMeta(UserEntity, 'UserEntity')).toThrow(
      '[serverless-advanced-handlers] Unknown meta key "nmae" at UserEntity.shape.name'
    );
  });

  it('uses "schema" as the default root of the path', () => {
    const schema = v.object({name: v.string().meta({nmae: 'x'})});

    expect(() => validateMeta(schema)).toThrow('Unknown meta key "nmae" at schema.shape.name');
  });

  it('reports the unknown key of the root schema itself', () => {
    const schema = v.object({}).meta({unknownKey: 1});

    expect(() => validateMeta(schema, 'UserEntity')).toThrow('Unknown meta key "unknownKey" at UserEntity');
  });

  it('finds the unknown key under wrappers, which do not add a path segment', () => {
    const UserEntity = v.object({isActive: v.boolish().meta({alias: 'is_active'}).optional().default(false)});

    expect(() => validateMeta(UserEntity, 'UserEntity')).toThrow(
      'Unknown meta key "alias" at UserEntity.shape.isActive'
    );
  });

  it('finds the unknown key on the wrapper itself', () => {
    const UserEntity = v.object({isActive: v.boolish().optional().meta({alias: 'is_active'})});

    expect(() => validateMeta(UserEntity, 'UserEntity')).toThrow(
      'Unknown meta key "alias" at UserEntity.shape.isActive'
    );
  });

  it('descends into nested objects and arrays', () => {
    const UserEntity = v.object({
      addresses: v.array(v.object({zipCode: v.string().meta({nmae: 'zip_code'})})),
    });

    expect(() => validateMeta(UserEntity, 'UserEntity')).toThrow(
      'Unknown meta key "nmae" at UserEntity.shape.addresses.element.shape.zipCode'
    );
  });

  it('descends into unions, records and tuples', () => {
    const union = v.union([v.string(), v.number().meta({bad: 1})]);
    const record = v.record(v.string(), v.number().meta({bad: 1}));
    const tuple = v.tuple([v.string(), v.number().meta({bad: 1})]);

    expect(() => validateMeta(union, 'Root')).toThrow('Unknown meta key "bad" at Root.options[1]');
    expect(() => validateMeta(record, 'Root')).toThrow('Unknown meta key "bad" at Root.valueType');
    expect(() => validateMeta(tuple, 'Root')).toThrow('Unknown meta key "bad" at Root.items[1]');
  });

  it('accepts a recursive schema without looping forever', () => {
    type Node = {name: string; children: Node[]};

    const NodeSchema: z.ZodType<Node> = v.lazy(() =>
      v.object({
        name: v.string().meta({name: 'node_name'}),
        children: v.array(NodeSchema),
      })
    );

    expect(() => validateMeta(NodeSchema, 'NodeEntity')).not.toThrow();
  });

  it('accepts the extensions, whose internals carry no metadata', () => {
    const Query = v.object({
      active: v.boolish(),
      roles: v.delimited(v.enum(['admin', 'editor'])),
      ttl: v.duration(),
      createdAt: v.timestamp(),
      avatar: v.file({maxSize: '1MB'}),
    });

    expect(() => validateMeta(Query, 'SearchUserQuery')).not.toThrow();
  });
});

describe('package root (REQ-017, REQ-018)', () => {
  it('reexports resolveMeta and validateMeta (AC-8)', () => {
    expect(root.resolveMeta).toBe(resolveMeta);
    expect(root.validateMeta).toBe(validateMeta);
  });
});
