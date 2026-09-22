import { DomainValidationError } from '../errors/domain-validation.error';
import { Entity, PrimaryKey, Property, ManyToOne, Rel, BeforeCreate, BeforeUpdate, wrap } from '@mikro-orm/core';
import { User } from './User';
import { Administracion } from './Administracion';
import { Rol } from './Rol';

import { AmbitoRol } from './AmbitoRol';

@Entity({ tableName: 'empleado' })
export class Empleado {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => User)
  usuario!: Rel<User>;

  @ManyToOne(() => Administracion)
  administracion!: Rel<Administracion>;

  @ManyToOne(() => Rol)
  rol!: Rel<Rol>;

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
    // Las referencias obtenidas con getReference pueden no tener el ambito cargado.
    if (!wrap(this.rol).isInitialized()) {
      await wrap(this.rol).init();
    }
    if (this.rol.ambito !== AmbitoRol.ADMINISTRACION) {
      throw new DomainValidationError('El rol debe pertenecer al ambito ADMINISTRACION.');
    }
  }
}
