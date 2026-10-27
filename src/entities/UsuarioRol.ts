import { Entity, PrimaryKey, Property, ManyToOne, OneToMany, Collection, Rel, BeforeCreate, BeforeUpdate } from '@mikro-orm/core';
import { User } from './User';
import { Rol } from './Rol';
import { Empleado } from './Empleado';
import { UsuarioRolPropiedad } from './UsuarioRolPropiedad';
import { DomainValidationError } from '../errors/domain-validation.error';

// Asignación usuario–rol de cualquier ámbito. Administración y propiedad agregan
// su contexto en empleado y usuario_rol_propiedad. El alta pública solo admite GLOBAL.
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

  @OneToMany(() => Empleado, empleado => empleado.usuarioRol)
  empleos = new Collection<Empleado>(this);

  @OneToMany(() => UsuarioRolPropiedad, asignacion => asignacion.usuarioRol)
  propiedades = new Collection<UsuarioRolPropiedad>(this);

  @BeforeCreate()
  @BeforeUpdate()
  validar(): void {
    if (this.endAt !== null && this.endAt < this.beginAt) {
      throw new DomainValidationError('La fecha de fin no puede ser anterior a la fecha de inicio.');
    }
  }
}
