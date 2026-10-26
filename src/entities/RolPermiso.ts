import { Entity, Enum, ManyToOne, PrimaryKey, Property, Rel, Unique } from '@mikro-orm/core';
import { Rol } from './Rol';
import { AccionPermiso, SeccionPermiso } from './Permiso';

@Entity({ tableName: 'rol_permiso' })
@Unique({ properties: ['rol', 'seccion'] })
export class RolPermiso {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Rol)
  rol!: Rel<Rol>;

  @Enum(() => SeccionPermiso)
  seccion!: SeccionPermiso;

  @Property()
  crear: boolean = false;

  @Property()
  leer: boolean = false;

  @Property()
  editar: boolean = false;

  @Property()
  borrar: boolean = false;

  @Property({ type: 'json' })
  acciones: AccionPermiso[] = [];
}
