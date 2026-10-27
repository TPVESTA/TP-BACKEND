import { EntityManager } from '@mikro-orm/core';
import { Rol } from '../entities/Rol';
import { User } from '../entities/User';
import { UsuarioRol } from '../entities/UsuarioRol';

const abierto = (now: Date) => ({ $or: [{ endAt: null }, { endAt: { $gt: now } }] });

// Reutiliza la asignación usuario–rol que no está finalizada. Si no existe, la crea
// con el inicio del primer vínculo y sin fecha de fin, para poder compartirla.
export const findOrCreateOpenUsuarioRol = async (
  em: EntityManager, usuario: User, rol: Rol, beginAt: Date, now: Date,
): Promise<UsuarioRol> => {
  const existing = await em.findOne(UsuarioRol, { usuario: usuario.id, rol: rol.id, ...abierto(now) });
  if (existing) {
    if (beginAt < existing.beginAt) existing.beginAt = beginAt;
    return existing;
  }
  const created = new UsuarioRol();
  created.usuario = usuario;
  created.rol = rol;
  created.beginAt = beginAt;
  created.endAt = null;
  em.persist(created);
  return created;
};
