import { Entity, Property, OneToMany, Collection } from '@mikro-orm/core';
import { Unidad } from './Unidad';
import { Reservacion } from './Reservacion';

@Entity({ discriminatorValue: 'area_comun' })
export class AreaComun extends Unidad {
  @Property()
  capacidad!: number;

  @OneToMany(() => Reservacion, reservacion => reservacion.areaComun)
  reservaciones = new Collection<Reservacion>(this);
}
