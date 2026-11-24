import { AmbitoRol } from '../entities/AmbitoRol';
import { Edificio } from '../entities/Edificio';
import { Notificacion, PrioridadNotificacion } from '../entities/Notificacion';
import { AccionPermiso, CodigoRol } from '../entities/Permiso';
import { Reunion } from '../entities/Reunion';
import { Rol } from '../entities/Rol';
import { AuthorizationError } from '../errors/authorization.error';
import { DomainValidationError } from '../errors/domain-validation.error';
import { AuthorizationContext } from './authorization/authorization.service';
import { buildingWhere, requireBuildingMutation } from './authorization/structure-authorization.helper';
import { isSystemAdminRole } from './authorization/system-admin.helper';
import { EntityId, getEntityManager, parseId, requireEntity } from './service.helper';

export interface CreateReunionData {
  asunto: string;
  minuta: string;
  fecha: string;
  hora: string;
  edificioId: EntityId;
}

export type UpdateReunionData = Partial<CreateReunionData>;

const edificioActivoEnAmbito = (context: AuthorizationContext, action: AccionPermiso) => ({
  $and: [{ deletedAt: null }, buildingWhere<Edificio>(context, action)],
});

export const getAllReuniones = async (context: AuthorizationContext): Promise<Reunion[]> => {
  const edificio = edificioActivoEnAmbito(context, AccionPermiso.LEER);
  return getEntityManager().find(Reunion, { edificio }, { populate: ['edificio'] });
};

export const getReunionById = async (id: EntityId, context: AuthorizationContext): Promise<Reunion | null> => {
  const edificio = edificioActivoEnAmbito(context, AccionPermiso.LEER);
  return getEntityManager().findOne(Reunion, { id: parseId(id), edificio }, { populate: ['edificio'] });
};

export const createReunion = async (data: CreateReunionData, context: AuthorizationContext): Promise<Reunion> => {
  const edificioId = parseId(data.edificioId);
  const canCreate = context.grants.some(grant =>
    isSystemAdminRole({ ambito: grant.ambito, codigo: grant.rolCodigo }) ||
    (grant.ambito === AmbitoRol.ADMINISTRACION && grant.rolCodigo === CodigoRol.ADMINISTRATIVO &&
      grant.edificioIds.includes(edificioId)),
  );
  if (!canCreate) throw new AuthorizationError('Solo los administradores del edificio o del sistema pueden crear reuniones.');

  const muestraHasta = new Date(`${data.fecha}T${data.hora}-03:00`);
  if (!(muestraHasta > context.now)) {
    throw new DomainValidationError('La fecha y hora de la reunión deben ser posteriores al momento de creación.');
  }

  const em = getEntityManager();
  const reunion = new Reunion();
  reunion.edificio = await requireEntity(em, Edificio, edificioId, 'Edificio');
  reunion.asunto = data.asunto;
  reunion.minuta = data.minuta;
  reunion.fecha = data.fecha;
  reunion.hora = data.hora;

  const propietario = await em.findOneOrFail(Rol, { codigo: CodigoRol.PROPIETARIO, ambito: AmbitoRol.PROPIEDAD });
  const notificacion = new Notificacion();
  notificacion.edificio = reunion.edificio;
  notificacion.roles.add(propietario);
  notificacion.titulo = reunion.asunto;
  notificacion.descripcion = `Reunión programada para el ${reunion.fecha.split('-').reverse().join('/')} a las ${reunion.hora.slice(0, 5)}.`;
  notificacion.muestraDesde = context.now;
  notificacion.muestraHasta = muestraHasta;
  notificacion.prioridad = PrioridadNotificacion.MEDIA;

  await em.persistAndFlush([reunion, notificacion]);
  return reunion;
};

export const updateReunion = async (
  id: EntityId, data: UpdateReunionData, context: AuthorizationContext,
): Promise<Reunion | null> => {
  const edificio = edificioActivoEnAmbito(context, AccionPermiso.EDITAR);
  const em = getEntityManager();
  const reunion = await em.findOne(Reunion, { id: parseId(id), edificio }, { populate: ['edificio'] });
  if (!reunion) return null;

  if (data.edificioId !== undefined) {
    requireBuildingMutation(context, AccionPermiso.EDITAR, parseId(data.edificioId));
    reunion.edificio = await requireEntity(em, Edificio, data.edificioId, 'Edificio');
  }
  if (data.asunto !== undefined) reunion.asunto = data.asunto;
  if (data.minuta !== undefined) reunion.minuta = data.minuta;
  if (data.fecha !== undefined) reunion.fecha = data.fecha;
  if (data.hora !== undefined) reunion.hora = data.hora;
  await em.flush();
  return reunion;
};

export const deleteReunion = async (id: EntityId, context: AuthorizationContext): Promise<Reunion | null> => {
  const edificio = edificioActivoEnAmbito(context, AccionPermiso.BORRAR);
  const em = getEntityManager();
  const reunion = await em.findOne(Reunion, { id: parseId(id), edificio }, { populate: ['edificio'] });
  if (!reunion) return null;
  await em.removeAndFlush(reunion);
  return reunion;
};
