// Fixture do modo C (decorators TC39) de `@LambdaConfig`: compilada por test/lambda-config-modes.spec.ts com
// test/types/mode-c-lambda/tsconfig.json e deve passar sem erros.
import {LambdaConfig} from '#/index';

@LambdaConfig({
  name: 'users',
  memorySize: 512,
  timeout: 30,
  reservedConcurrency: 5,
  environment: {TABLE_NAME: 'users'},
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
  description: 'Usuários',
  tags: {team: 'platform'},
})
export class UsersController {
  @LambdaConfig({memorySize: 1024, timeout: 60})
  create(name: string): string {
    return name;
  }

  @LambdaConfig({})
  static list(this: typeof UsersController): string {
    return this.name;
  }

  // `this` explícito: exige que a assinatura TC39 seja genérica em `This`.
  @LambdaConfig({description: 'this explícito'})
  withThis(this: UsersController): string {
    return this.create('ana');
  }
}

@LambdaConfig({name: 'base'})
export abstract class BaseController {
  @LambdaConfig({description: 'abstrato'})
  describe(): string {
    return 'base';
  }
}

export class InvalidOptions {
  // @ts-expect-error memorySize precisa ser number
  @LambdaConfig({memorySize: '512'})
  run(): void {}
}
