import { TipoUnidad } from '../entities/TipoUnidad';
import { AmbitoUnidad } from '../entities/AmbitoUnidad';
import { DomainValidationError } from '../errors/domain-validation.error';

export function requireAmbitoUnidad(tipo: TipoUnidad, expected: AmbitoUnidad): void {
  if (tipo.ambito !== expected) {
    throw new DomainValidationError(`El tipo de unidad debe tener ámbito ${expected}. Clasifique el tipo o seleccione uno compatible.`);
  }
}
