import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import DatabaseManager from '../database/DatabaseManager';
import { User } from '../entities/User';
import { AuthenticationError } from '../errors/authentication.error';
import { DomainValidationError } from '../errors/domain-validation.error';

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  cuil: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  fechaNacimiento: Date;
  password: string;
  estado: boolean;
}

interface AuthResponse {
  user: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    telefono: string;
    fechaNacimiento: Date;
    estado: boolean;
  };
  token: string;
}

const dbManager = DatabaseManager.getInstance();

// Obtener la clave secreta del JWT
const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está definido en las variables de entorno');
  }
  return secret;
};

// Obtener el tiempo de expiración del JWT
const getJWTExpiresIn = (): string => {
  return process.env.JWT_EXPIRES_IN || '1h';
};

// Generar un token JWT
export const generateToken = (userId: number): string => {
  const payload = { userId };
  const secret = getJWTSecret();
  const expiresIn = getJWTExpiresIn();
  
  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
};

// Verificar un token JWT
export const verifyToken = (token: string): { userId: number } => {
  const secret = getJWTSecret();
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || typeof decoded.userId !== 'number'
      || !Number.isSafeInteger(decoded.userId) || decoded.userId <= 0
      || typeof decoded.exp !== 'number') {
      throw new AuthenticationError('Token inválido');
    }
    return { userId: decoded.userId };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof AuthenticationError) {
      throw new AuthenticationError('Token inválido o vencido');
    }
    throw error;
  }
};

// Encriptar contraseña
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Comparar contraseñas
export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

// Registrar un nuevo usuario
export const register = async (userData: RegisterData): Promise<AuthResponse> => {
  const orm = dbManager.getORM();
  const em = orm.em.fork();

  // Verificar si el email ya existe
  const existingUser = await em.findOne(User, { email: userData.email }, { filters: { softDelete: false } });
  if (existingUser) {
    if (existingUser.deletedAt !== null) {
        throw new DomainValidationError('El email ya está registrado en un usuario eliminado');
      }
    
    throw new DomainValidationError('El email ya está registrado');
  }

  // Encriptar la contraseña
  const hashedPassword = await hashPassword(userData.password);

  // Crear nuevo usuario
  const newUser = new User(userData.nombre, userData.apellido, userData.email, userData.fechaNacimiento, hashedPassword, userData.estado);
  newUser.cuil = userData.cuil;
  newUser.telefono = userData.telefono;

  // Asegurar que los timestamps estén establecidos
  newUser.createdAt = new Date();
  newUser.updatedAt = new Date();

  // Persistir en la base de datos
  await em.persistAndFlush(newUser);

  // Generar token
  const token = generateToken(newUser.id);

  return {
    user: {
      id: newUser.id,
      nombre: newUser.nombre,
      apellido: newUser.apellido,
      email: newUser.email,
      telefono: newUser.telefono,
      fechaNacimiento: newUser.fechaNacimiento,
      estado: newUser.estado
    },
    token
  };
};

// Iniciar sesión
export const login = async (loginData: LoginData): Promise<AuthResponse> => {
  // Validaciones básicas
  if (!loginData.email || !loginData.password) {
    throw new AuthenticationError('Email y contraseña son requeridos');
  }

  const orm = dbManager.getORM();
  const em = orm.em.fork();

  // Buscar usuario por email
  const user = await em.findOne(User, { email: loginData.email });
  if (!user || !user.estado || user.deletedAt != null) {
    throw new AuthenticationError('Credenciales inválidas');
  }

  // Verificar contraseña
  const isPasswordValid = await comparePassword(loginData.password, user.password);
  if (!isPasswordValid) {
    throw new AuthenticationError('Credenciales inválidas');
  }

  // Generar token
  const token = generateToken(user.id);

  return {
    user: {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      telefono: user.telefono,
      fechaNacimiento: user.fechaNacimiento,
      estado: user.estado
    },
    token
  };
};

// Obtener usuario por ID (para el middleware)
export const getUserByIdForAuth = async (id: number): Promise<User | null> => {
  const orm = dbManager.getORM();
  const em = orm.em.fork();
  return await em.findOne(User, { id });
};
