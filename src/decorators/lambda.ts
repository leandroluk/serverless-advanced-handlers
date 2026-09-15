// Decorator `@LambdaConfig` (REQ-080).
//
// Declara a configuração da Lambda gerada para um controller (todos os métodos) ou para um método. Como os
// demais decorators públicos, é no-op em runtime: o planejador de funções do plugin lê as opções direto do
// código-fonte, por isso os valores precisam ser estaticamente analisáveis.

import {classOrMethodDecorator, type DualClassOrMethodDecorator} from '#/decorators/dual';

/**
 * Recurso de um statement IAM: ARN literal ou função intrínseca do CloudFormation, como
 * `{ 'Fn::GetAtt': ['UsersTable', 'Arn'] }` ou `{ 'Fn::Join': ['', [...]] }`.
 */
export type IamResource = string | Record<string, unknown>;

/** Statement IAM no formato de `iamRoleStatements` do Serverless Framework v3. */
export interface IamStatement {
  Sid?: string;
  Effect: 'Allow' | 'Deny';
  Action: string | readonly string[];
  Resource: IamResource | readonly IamResource[];
  Condition?: Record<string, unknown>;
}

/** Opções de `@LambdaConfig`. Todas são opcionais; o que não for informado herda do nível superior. */
export interface LambdaConfigOptions {
  /** Fixa a chave da função, para que ela sobreviva a renomeações de controller ou método (REQ-081). */
  name?: string;
  /** Memória da Lambda, em MB. */
  memorySize?: number;
  /** Timeout da Lambda, em segundos. */
  timeout?: number;
  /** Concorrência reservada da Lambda. */
  reservedConcurrency?: number;
  /** Variáveis de ambiente da Lambda. */
  environment?: Record<string, string>;
  /** Statements IAM adicionais da role da Lambda. */
  iamRoleStatements?: readonly IamStatement[];
  /** Descrição da Lambda. */
  description?: string;
  /** Tags da Lambda. */
  tags?: Record<string, string>;
}

/**
 * Configura a Lambda gerada para um controller ou para um método. No método, sobrescreve a configuração
 * do controller. No-op em runtime.
 */
export function LambdaConfig(options: LambdaConfigOptions): DualClassOrMethodDecorator;
export function LambdaConfig(): DualClassOrMethodDecorator {
  return classOrMethodDecorator();
}
