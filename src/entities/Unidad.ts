import { Entity, PrimaryKey, Property, ManyToOne, OneToMany, Collection, Rel } from '@mikro-orm/core';
import type { Edificio } from './Edificio';
import type { TipoUnidad } from './TipoUnidad';
import type { Incidencia } from './Incidencia';

@Entity({ tableName: 'unidad', abstract: true, discriminatorColumn: 'clase',
  discriminatorMap: { propiedad: 'Propiedad', area_comun: 'AreaComun' } })
export abstract class Unidad {
  @PrimaryKey()
  id!: number;

  @Property()
  nroUnidad!: string;

  @Property({ type: 'decimal', precision: 12, scale: 2, runtimeType: 'number' })
  mtCuadrados!: number;

  @Property({ type: 'text' })
  descripcion!: string;

  @ManyToOne({ entity: 'Edificio' })
  edificio!: Rel<Edificio>;

  @ManyToOne({ entity: 'TipoUnidad' })
  tipoUnidad!: Rel<TipoUnidad>;

  @OneToMany({ entity: 'Incidencia', mappedBy: 'unidad' })
  incidencias = new Collection<Incidencia>(this);
}
