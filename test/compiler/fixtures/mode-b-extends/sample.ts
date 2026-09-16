// Fixture do modo B herdado via `extends`: o tsconfig.json raiz desta pasta não declara nenhum dos dois flags,
// que vêm só de tsconfig.base.json — se o detector lesse o arquivo raiz em vez do tsconfig efetivo, daria 'C'.
export class SampleServiceBExtends {
  label(): string {
    return 'mode-b-extends';
  }
}
