// Camada do meio da cadeia de 3 módulos; `UsersService` é `Scope.REQUEST` (REQ-031).
import {Injectable, Module} from '#/decorators/di';
import {Scope} from '#/di/providers';
import {Database, DatabaseModule} from './database.module';

@Injectable()
export class UsersRepository {
  constructor(readonly database: Database) {}
}

@Injectable({scope: Scope.REQUEST})
export class UsersService {
  constructor(readonly repository: UsersRepository) {}
}

@Module({
  imports: [DatabaseModule],
  providers: [UsersRepository, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
