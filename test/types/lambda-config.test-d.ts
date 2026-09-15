// Testes de tipo de `@LambdaConfig` no modo B (tsconfig do repositório).
import {describe, expectTypeOf, test} from 'vitest';
import type {DualClassOrMethodDecorator} from '#/decorators/dual';
import {LambdaConfig, type IamResource, type IamStatement, type LambdaConfigOptions} from '#/index';

const fullOptions = {
  name: 'users-create',
  memorySize: 512,
  timeout: 30,
  reservedConcurrency: 5,
  environment: {TABLE_NAME: 'users', STAGE: 'dev'},
  iamRoleStatements: [
    {Effect: 'Allow', Action: 'sqs:SendMessage', Resource: 'arn:aws:sqs:us-east-1:123456789012:queue'},
    {
      Sid: 'UsersTable',
      Effect: 'Allow',
      Action: ['dynamodb:GetItem', 'dynamodb:PutItem'],
      Resource: [{'Fn::GetAtt': ['UsersTable', 'Arn']}, 'arn:aws:dynamodb:us-east-1:123456789012:table/audit'],
    },
    {
      Effect: 'Deny',
      Action: 's3:DeleteObject',
      Resource: {'Fn::Join': ['', ['arn:aws:s3:::', {Ref: 'UploadsBucket'}, '/*']]},
      Condition: {Bool: {'aws:SecureTransport': 'false'}},
    },
  ],
  description: 'Cria usuários',
  tags: {team: 'platform'},
} as const satisfies LambdaConfigOptions;

describe('LambdaConfig', () => {
  test('recebe LambdaConfigOptions e retorna decorator dual de classe ou método', () => {
    expectTypeOf(LambdaConfig).parameters.toEqualTypeOf<[options: LambdaConfigOptions]>();
    expectTypeOf(LambdaConfig).returns.toEqualTypeOf<DualClassOrMethodDecorator>();
  });

  test('LambdaConfigOptions tem apenas campos opcionais com os tipos esperados', () => {
    expectTypeOf<LambdaConfigOptions>().toEqualTypeOf<{
      name?: string;
      memorySize?: number;
      timeout?: number;
      reservedConcurrency?: number;
      environment?: Record<string, string>;
      iamRoleStatements?: readonly IamStatement[];
      description?: string;
      tags?: Record<string, string>;
    }>();
    expectTypeOf<{}>().toExtend<LambdaConfigOptions>();
  });

  test('IamStatement espelha iamRoleStatements do Serverless Framework v3', () => {
    expectTypeOf<IamStatement>().toEqualTypeOf<{
      Sid?: string;
      Effect: 'Allow' | 'Deny';
      Action: string | readonly string[];
      Resource: IamResource | readonly IamResource[];
      Condition?: Record<string, unknown>;
    }>();
    expectTypeOf<IamResource>().toEqualTypeOf<string | Record<string, unknown>>();
  });
});

describe('aplicação no modo B', () => {
  test('em controller e em método, com opções completas e mínimas', () => {
    @LambdaConfig(fullOptions)
    class UsersController {
      @LambdaConfig({memorySize: 1024, timeout: 60})
      create(name: string): string {
        return name;
      }

      @LambdaConfig({})
      @LambdaConfig({
        iamRoleStatements: [{Effect: 'Allow', Action: '*', Resource: {'Fn::GetAtt': ['UsersTable', 'Arn']}}],
      })
      static list(this: typeof UsersController): string {
        return this.name;
      }
    }

    @LambdaConfig({name: 'base'})
    abstract class BaseController {
      @LambdaConfig({description: 'abstrato'})
      describe(): string {
        return 'base';
      }
    }

    expectTypeOf(new UsersController().create('ana')).toEqualTypeOf<string>();
    expectTypeOf<BaseController['describe']>().returns.toEqualTypeOf<string>();
  });

  test('opções inválidas geram erro', () => {
    // @ts-expect-error campo desconhecido em LambdaConfigOptions
    LambdaConfig({memory: 512});

    // @ts-expect-error memorySize precisa ser number
    LambdaConfig({memorySize: '512'});

    // @ts-expect-error Effect aceita apenas 'Allow' ou 'Deny'
    LambdaConfig({iamRoleStatements: [{Effect: 'Maybe', Action: 's3:GetObject', Resource: '*'}]});

    // @ts-expect-error valores de environment precisam ser string
    LambdaConfig({environment: {PORT: 3000}});

    // @ts-expect-error statement sem Effect
    LambdaConfig({iamRoleStatements: [{Action: 's3:GetObject', Resource: '*'}]});

    // @ts-expect-error LambdaConfig exige o objeto de opções
    LambdaConfig();

    // @ts-expect-error statement sem Resource
    LambdaConfig({iamRoleStatements: [{Effect: 'Allow', Action: 's3:GetObject'}]});

    // @ts-expect-error tags precisam ter valores string
    LambdaConfig({tags: {version: 2}});

    expectTypeOf<{memorySize: string}>().not.toExtend<LambdaConfigOptions>();
    expectTypeOf<{Effect: 'Maybe'; Action: string; Resource: string}>().not.toExtend<IamStatement>();
  });

  test('opções inválidas também falham na sintaxe de decorator', () => {
    // @ts-expect-error campo desconhecido em LambdaConfigOptions
    @LambdaConfig({unknownOption: true})
    class InvalidController {
      // @ts-expect-error timeout precisa ser number
      @LambdaConfig({timeout: '30'})
      run(): void {}
    }

    expectTypeOf<InvalidController['run']>().returns.toBeVoid();
  });
});
