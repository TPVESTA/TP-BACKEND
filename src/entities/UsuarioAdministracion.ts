import { Entity, PrimaryKey, ManyToOne, Property, Rel } from '@mikro-orm/core';
import { User } from './User';
import { Administracion } from './Administracion';

// Vínculo de gestión: no concede permisos ni reemplaza las asignaciones de roles.
@Entity({ tableName: 'usuario_administracion' })
export class UsuarioAdministracion {
  @PrimaryKey() id!: number;
  @ManyToOne(() => User) usuario!: Rel<User>;
  @ManyToOne(() => Administracion) administracion!: Rel<Administracion>;
  @Property() beginAt: Date = new Date();
  @Property({ type: 'datetime', nullable: true }) endAt: Date | null = null;
}
