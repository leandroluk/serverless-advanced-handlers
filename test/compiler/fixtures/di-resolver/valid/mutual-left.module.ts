// Metade esquerda de um par de módulos que se importam mutuamente: legítimo (não é ciclo de DI), e a
// varredura precisa terminar. Os dois lados ficam em arquivos separados porque um decorator não pode
// referenciar uma classe declarada depois dele no mesmo arquivo.
import {Injectable, Module} from '#/decorators/di';
import {MutualRightModule, RightService} from './mutual-right.module';

@Injectable()
export class LeftService {
  constructor(readonly right: RightService) {}
}

@Module({
  imports: [MutualRightModule],
  providers: [LeftService],
  exports: [LeftService],
})
export class MutualLeftModule {}
