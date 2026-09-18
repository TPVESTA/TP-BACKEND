import { Entity, PrimaryKey, Property, ManyToOne, Rel, BeforeCreate, BeforeUpdate, wrap } from '@mikro-orm/core';
import { User } from './User';
import { Rol } from './Rol';
import { Propiedad } from './Propiedad';

import { AmbitoRol } from './AmbitoRol';

@Entity({ tableName: 'usuario_rol_propiedad' })
export class UsuarioRolPropiedad {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => User)
  usuario!: Rel<User>;

  @ManyToOne(() => Rol)
  rol!: Rel<Rol>;

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
      throw new Error('La fecha de fin no puede ser anterior a la fecha de inicio.');
    }
    // Las referencias obtenidas con getReference pueden no tener el ambito cargado.
    if (!wrap(this.rol).isInitialized()) {
      await wrap(this.rol).init();
    }
    if (this.rol.ambito !== AmbitoRol.PROPIEDAD) {
      throw new Error('El rol debe pertenecer al ambito PROPIEDAD.');
    }
  }
}
