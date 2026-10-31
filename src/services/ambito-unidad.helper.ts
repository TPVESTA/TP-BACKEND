import { TipoUnidad } from '../entities/TipoUnidad';
import { AmbitoUnidad } from '../entities/enums';
import { DomainValidationError } from '../errors/domain.errors';

export function requireAmbitoUnidad(tipo: TipoUnidad, expected: AmbitoUnidad): void {
  if (tipo.ambito !== expected) {
    throw new DomainValidationError(`El tipo de unidad debe tener ámbito ${expected}. Clasifique el tipo o seleccione uno compatible.`);
  }
}
