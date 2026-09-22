export class AuthenticationError extends Error {
  constructor(message = 'Credenciales o token inválidos') {
    super(message);
    this.name = 'AuthenticationError';
  }
}
