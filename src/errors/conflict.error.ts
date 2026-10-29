// Conflictos de negocio recuperables por el cliente (HTTP 409).
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
