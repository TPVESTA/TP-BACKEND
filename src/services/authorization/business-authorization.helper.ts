import { AmbitoRol } from '../../entities/AmbitoRol';
import { AccionPermiso, SeccionPermiso } from '../../entities/Permiso';
import { AuthorizationError } from '../../errors/authorization.error';
import { DomainValidationError } from '../../errors/domain-validation.error';
import { AuthorizationContext, matchingGrants } from './authorization.service';
import { EntityId, parseId } from '../service.helper';

export const requireBusinessAuthorization = (context: AuthorizationContext): AuthorizationContext => {
  if (!context || !Array.isArray(context.grants) || !context.usuarioId) {
    throw new AuthorizationError('Se requiere el contexto del usuario autenticado.');
  }
  return context;
};

// El origen queda fijado al crear el registro: otra propiedad del mismo edificio
// no reemplaza automáticamente una asignación que ya terminó.
export const selectOriginProperty = (
  context: AuthorizationContext, seccion: SeccionPermiso, edificioId: number, requestedId?: EntityId
): number => {
  const ids = [...new Set(matchingGrants(context, seccion, AccionPermiso.CREAR, { edificioId })
    .filter(grant => grant.ambito === AmbitoRol.PROPIEDAD && grant.propiedadId !== undefined)
    .map(grant => grant.propiedadId!))];
  if (requestedId !== undefined) {
    const id = parseId(requestedId);
    if (!ids.includes(id)) throw new AuthorizationError('La propiedad no habilita esta operación en el edificio.');
    return id;
  }
  if (ids.length === 0) throw new AuthorizationError('No tiene permiso para crear en este edificio.');
  if (ids.length > 1) throw new DomainValidationError('Indique propiedadId para seleccionar el contexto de la operación.');
  return ids[0];
};
