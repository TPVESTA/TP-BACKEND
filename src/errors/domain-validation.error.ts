// Errores de datos o reglas del dominio cuyo mensaje puede mostrarse al cliente.
export class DomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainValidationError';
  }
}
