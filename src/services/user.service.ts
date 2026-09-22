import { DomainValidationError } from '../errors/domain-validation.error';
import DatabaseManager from '../database/DatabaseManager';
import { User } from '../entities/User';
import { hashPassword } from './auth.service';
import { EntityId, parseId } from './service.helper';

export interface CreateUserData {
  cuil: string;
  nombre: string;
  apellido: string;
  email: string;
  fechaNacimiento: Date;
  password: string;
  estado: boolean;
}

export interface UpdateUserData {
  cuil?: string;
  fechaNacimiento?: Date;
  nombre?: string;
  apellido?: string;
  email?: string;
  password?: string;
  estado?: boolean;
}

const dbManager = DatabaseManager.getInstance();

export const getAllUsers = async (): Promise<User[]> => {
  const orm = dbManager.getORM();
  const em = orm.em.fork();
  // Por defecto, el filtro softDelete está activo y excluye registros con deletedAt != null
  return await em.find(User, {});
};

export const getUserById = async (id: EntityId): Promise<User | null> => {
  const orm = dbManager.getORM();
  const em = orm.em.fork();
  return await em.findOne(User, { id: parseId(id) });
};

export const createUser = async (userData: CreateUserData): Promise<User> => {
  const orm = dbManager.getORM();
  const em = orm.em.fork();

  const existingUser = await em.findOne(User, { email: userData.email }, { filters: { softDelete: false } });
  
  if (existingUser) {
    if (existingUser.deletedAt !== null) {
      throw new DomainValidationError("El email ya está registrado en un usuario eliminado");
    }

    throw new DomainValidationError("El email ya está registrado");
  }

  // Encriptar la contraseña
  const hashedPassword = await hashPassword(userData.password);

  // Crear nuevo usuario
  const newUser = new User(userData.nombre, userData.apellido, userData.email, userData.fechaNacimiento, hashedPassword, userData.estado);
  newUser.cuil = userData.cuil;

  // Asegurar que los timestamps estén establecidos
  newUser.createdAt = new Date();
  newUser.updatedAt = new Date();

  // Persistir en la base de datos
  await em.persistAndFlush(newUser);

  return newUser;
};

export const updateUser = async (id: EntityId, userData: UpdateUserData): Promise<User | null> => {
  const orm = dbManager.getORM();
  const em = orm.em.fork();
  
  const user = await em.findOne(User, { id: parseId(id) });
  if (!user) {
    return null;
  }
  
  // Actualizar los campos proporcionados
  if (userData.cuil !== undefined) user.cuil = userData.cuil;
  if (userData.apellido !== undefined) user.apellido = userData.apellido;
  if (userData.fechaNacimiento !== undefined) user.fechaNacimiento = userData.fechaNacimiento;
  if (userData.estado !== undefined) user.estado = userData.estado;
  if (userData.nombre !== undefined) {
    user.nombre = userData.nombre;
  }
  if (userData.email !== undefined) {
    // Verificar si el nuevo email ya existe (excepto el usuario actual)
    const existingUser = await em.findOne(User, { email: userData.email, id: { $ne: parseId(id) } }, { filters: { softDelete: false } });
    
    if (existingUser) {
      if (existingUser.deletedAt !== null) {
        throw new DomainValidationError('El email ya está registrado en un usuario eliminado');
      }

      throw new DomainValidationError('El email ya está registrado');
    }
    
    user.email = userData.email;
  }
  
  if (userData.password !== undefined) {
    // Encriptar la nueva contraseña
    const hashedPassword = await hashPassword(userData.password);
    user.password = hashedPassword;
  }
  
  user.updatedAt = new Date();
  
  await em.persistAndFlush(user);
  return user;
};

export const deleteUser = async (id: EntityId): Promise<User | null> => {
  const orm = dbManager.getORM();
  const em = orm.em.fork();
  
  // Incluir también los borrados para poder retornar 404 si no existe en absoluto
  const user = await em.findOne(User, { id: parseId(id) }, { filters: { softDelete: false } });
  if (!user) {
    return null;
  }
  
  // Borrado lógico
  user.deletedAt = user.deletedAt ?? new Date();
  user.updatedAt = new Date();
  await em.persistAndFlush(user);
  return user;
};
