import { Incidencia } from '../entities/Incidencia';
import { Reservacion } from '../entities/Reservacion';
import { Unidad } from '../entities/Unidad';
import { AreaComun } from '../entities/AreaComun';
import { Propiedad } from '../entities/Propiedad';
import { User } from '../entities/User';
import type { ReservaOcupacion, ReservacionVisible } from '../services/reservacion.service';

// Una lista explícita evita exponer datos personales o colecciones de relaciones
// si MikroORM carga más campos que los necesarios para esta respuesta.
const author = (user: User) => ({ id: user.id, nombre: user.nombre, apellido: user.apellido });

const unit = (entity: Unidad) => ({
  id: entity.id,
  nroUnidad: entity.nroUnidad,
  mtCuadrados: entity.mtCuadrados,
  descripcion: entity.descripcion,
  edificio: entity.edificio ? {
    id: entity.edificio.id,
    nombre: entity.edificio.nombre,
    direccion: entity.edificio.direccion,
  } : undefined,
  tipoUnidad: entity.tipoUnidad ? {
    id: entity.tipoUnidad.id,
    nombre: entity.tipoUnidad.nombre,
    ambito: entity.tipoUnidad.ambito,
  } : undefined,
  ...(entity instanceof AreaComun ? { capacidad: entity.capacidad } : {}),
  ...(entity instanceof Propiedad ? { copropiedad: entity.copropiedad, habitaciones: entity.habitaciones } : {}),
});

export const serializeReservacion = (entity: ReservacionVisible) => {
  if (!('usuario' in entity)) return entity as ReservaOcupacion;
  return {
    id: entity.id,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    fechaReservacion: entity.fechaReservacion,
    estado: entity.estado,
    descripcion: entity.descripcion,
    usuario: author(entity.usuario),
    areaComun: unit(entity.areaComun),
    propiedadOrigen: entity.propiedadOrigen ? { id: entity.propiedadOrigen.id } : null,
  };
};

export const serializeIncidencia = (entity: Incidencia) => ({
  id: entity.id,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
  closedAt: entity.closedAt,
  estado: entity.estado,
  descripcion: entity.descripcion,
  usuario: author(entity.usuario),
  unidad: unit(entity.unidad),
  propiedadOrigen: entity.propiedadOrigen ? { id: entity.propiedadOrigen.id } : null,
});
