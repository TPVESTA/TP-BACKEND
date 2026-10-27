import { DomainValidationError } from '../errors/domain-validation.error';
import { Entity, PrimaryKey, Property, ManyToOne, Rel, BeforeCreate, BeforeUpdate, wrap } from '@mikro-orm/core';
import { UsuarioRol } from './UsuarioRol';
import { Propiedad } from './Propiedad';

import { AmbitoRol } from './AmbitoRol';

@Entity({ tableName: 'usuario_rol_propiedad' })
export class UsuarioRolPropiedad {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => UsuarioRol)
  usuarioRol!: Rel<UsuarioRol>;

  @ManyToOne(() => Propiedad)
  propiedad!: Rel<Propiedad>;

  @Property()
  beginAt: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  endAt: Date | null = null;
  @BeforeCreate()
  @BeforeUpdate()
  async validar(): Promise<void> {
    if (this.endAt !== null && this.endAt < this.beginAt) {
      throw new DomainValidationError('La fecha de fin no puede ser anterior a la fecha de inicio.');
    }
    // Las referencias obtenidas con getReference pueden no tener el rol cargado.
    if (!wrap(this.usuarioRol).isInitialized()) {
      await wrap(this.usuarioRol).init();
    }
    if (!wrap(this.usuarioRol.rol).isInitialized()) {
      await wrap(this.usuarioRol.rol).init();
    }
    if (this.usuarioRol.rol.ambito !== AmbitoRol.PROPIEDAD) {
      throw new DomainValidationError('El rol debe pertenecer al ambito PROPIEDAD.');
    }
  }
}
