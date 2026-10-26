import { Entity, PrimaryKey, Property, ManyToOne, Rel, BeforeCreate, BeforeUpdate, wrap } from '@mikro-orm/core';
import { User } from './User';
import { Rol } from './Rol';
import { AmbitoRol } from './AmbitoRol';
import { DomainValidationError } from '../errors/domain-validation.error';

// Registra asignaciones; la autorización por rol se implementará por separado.
@Entity({ tableName: 'usuario_rol' })
export class UsuarioRol {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => User)
  usuario!: Rel<User>;

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
    if (!wrap(this.rol).isInitialized()) await wrap(this.rol).init();
    if (this.rol.ambito !== AmbitoRol.GLOBAL) {
      throw new DomainValidationError('El rol debe pertenecer al ambito GLOBAL.');
    }
  }
}
