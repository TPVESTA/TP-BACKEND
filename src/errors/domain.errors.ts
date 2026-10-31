export class AuthenticationError extends Error {
  constructor(message = 'Credenciales o token inválidos') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

// Errores de datos o reglas del dominio cuyo mensaje puede mostrarse al cliente.
export class DomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainValidationError';
  }
}

// Conflictos de negocio recuperables por el cliente (HTTP 409).
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
