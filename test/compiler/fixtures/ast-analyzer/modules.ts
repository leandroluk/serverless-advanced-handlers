// Cenários de leitura de decorator (`readDecoratorArgument`): com argumento, sem argumento, sem chamada
// e sem decorator nenhum.
import {Logger} from './barrel';
import {Injectable, Marker, Module} from './decorators';

@Module({imports: [], providers: [Logger]})
export class WithArgumentModule {}

@Injectable()
export class NoArgumentService {}

@Marker
export class MarkerService {}

export class PlainService {}
