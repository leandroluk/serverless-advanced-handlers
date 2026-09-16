// Metade direita do par de módulos mutuamente importados.
import {Injectable, Module} from '#/decorators/di';
import {MutualLeftModule} from './mutual-left.module';

@Injectable()
export class RightService {
  readonly name = 'right';
}

@Module({
  imports: [MutualLeftModule],
  providers: [RightService],
  exports: [RightService],
})
export class MutualRightModule {}
