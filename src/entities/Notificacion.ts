import { Collection, Entity, Enum, ManyToMany, ManyToOne, PrimaryKey, Property, Rel } from '@mikro-orm/core';
import { Edificio } from './Edificio';
import { Rol } from './Rol';

export enum PrioridadNotificacion {
  BAJA = 'baja',
  MEDIA = 'media',
  ALTA = 'alta',
}

@Entity({ tableName: 'notificacion' })
export class Notificacion {
  @PrimaryKey()
  id!: number;

  @Property({ length: 255 })
  titulo!: string;

  @Property({ type: 'text' })
  descripcion!: string;

  @Property({ type: 'datetime', length: 3 })
  muestraDesde!: Date;

  @Property({ type: 'datetime', length: 3 })
  muestraHasta!: Date;

  @Enum(() => PrioridadNotificacion)
  prioridad!: PrioridadNotificacion;

  @ManyToOne(() => Edificio)
  edificio!: Rel<Edificio>;

  @ManyToMany({ entity: () => Rol, pivotTable: 'notificacion_rol' })
  roles = new Collection<Rol>(this);
}
