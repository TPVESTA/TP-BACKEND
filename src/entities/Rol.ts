import { DomainValidationError } from '../errors/domain-validation.error';
import { Entity, Property, PrimaryKey, Enum, OneToMany, Collection, BeforeUpdate, EventArgs } from '@mikro-orm/core';
import { AmbitoRol } from './AmbitoRol';
import { Empleado } from './Empleado';
import { UsuarioRolPropiedad } from './UsuarioRolPropiedad';
import { RolPermiso } from './RolPermiso';

@Entity({ tableName: 'rol' })
export class Rol {
  @PrimaryKey()
  id!: number;

  @Property()
  nombre!: string;

  @Property({ type: 'string', nullable: true, unique: true })
  codigo: string | null = null;

  // Marca persistente: revocar permisos no debe reponerlos al reiniciar.
  @Property({ type: 'datetime', nullable: true })
  permisosInicializadosAt: Date | null = null;

  @Property({ type: 'datetime', nullable: true })
  bootstrapRealizadoAt: Date | null = null;

  @Property()
  descripcion!: string;

  @Enum(() => AmbitoRol)
  ambito!: AmbitoRol;

  @OneToMany(() => Empleado, empleado => empleado.rol)
  empleados = new Collection<Empleado>(this);

  @OneToMany(() => UsuarioRolPropiedad, asignacion => asignacion.rol)
  asignacionesPropiedad = new Collection<UsuarioRolPropiedad>(this);

  @OneToMany(() => RolPermiso, permiso => permiso.rol)
  permisos = new Collection<RolPermiso>(this);
  @BeforeUpdate()
  validarCambioAmbito({ changeSet }: EventArgs<Rol>): void {
    // Cambiar el ambito invalidaria asignaciones existentes, incluso historicas.
    if (changeSet && Object.prototype.hasOwnProperty.call(changeSet.payload, 'ambito')) {
      throw new DomainValidationError('El ambito de un rol existente no se puede cambiar; cree otro rol.');
    }
    if (changeSet && Object.prototype.hasOwnProperty.call(changeSet.payload, 'codigo')) {
      throw new DomainValidationError('El codigo interno de un rol existente no se puede cambiar.');
    }
  }
}
