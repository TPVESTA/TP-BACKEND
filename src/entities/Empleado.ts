import { DomainValidationError } from '../errors/domain-validation.error';
import { Entity, PrimaryKey, Property, ManyToOne, Rel, BeforeCreate, BeforeUpdate, wrap } from '@mikro-orm/core';
import { Administracion } from './Administracion';
import { UsuarioRol } from './UsuarioRol';

import { AmbitoRol } from './AmbitoRol';

@Entity({ tableName: 'empleado' })
export class Empleado {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => UsuarioRol)
  usuarioRol!: Rel<UsuarioRol>;

  @ManyToOne(() => Administracion)
  administracion!: Rel<Administracion>;

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
    if (this.usuarioRol.rol.ambito !== AmbitoRol.ADMINISTRACION) {
      throw new DomainValidationError('El rol debe pertenecer al ambito ADMINISTRACION.');
    }
  }
}
