// Parâmetros de construtor cobrindo cada caso de `resolveTypeToClass`/`resolveIdentifierToClass`:
// classe via barrel, interface, type alias, primitivo, genérico e união.
import {Alpha} from './arrays';
import {Logger} from './barrel';
import {CONFIG_TOKEN, type Config, type ConfigAlias} from './contracts';
import {Inject, Injectable} from './decorators';

@Injectable()
export class Consumer {
  constructor(
    readonly logger: Logger,
    readonly config: Config,
    readonly alias: ConfigAlias,
    readonly name: string,
    readonly pending: Promise<Logger>,
    readonly either: Logger | Alpha
  ) {}
}

@Injectable()
export class TokenConsumer {
  constructor(@Inject(CONFIG_TOKEN) readonly config: Config) {}
}
