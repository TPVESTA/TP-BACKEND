import { DomainValidationError } from '../errors/domain.errors';
import { Entity, Property, OneToMany, Collection, BeforeCreate, BeforeUpdate } from '@mikro-orm/core';
import { Unidad } from './Unidad';
import { UsuarioRolPropiedad } from './UsuarioRolPropiedad';

@Entity({ discriminatorValue: 'propiedad' })
export class Propiedad extends Unidad {
  @Property({ type: 'decimal', precision: 7, scale: 4, runtimeType: 'number' })
  copropiedad!: number;

  @Property()
  habitaciones!: number;

  @OneToMany(() => UsuarioRolPropiedad, asignacion => asignacion.propiedad)
  usuariosRoles = new Collection<UsuarioRolPropiedad>(this);

  @BeforeCreate()
  @BeforeUpdate()
  validarCopropiedad(): void {
    if (!Number.isFinite(this.copropiedad) || this.copropiedad < 0 || this.copropiedad > 100) {
      throw new DomainValidationError('La copropiedad debe ser un porcentaje entre 0 y 100.');
    }
  }
}
