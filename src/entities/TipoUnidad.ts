import { Entity, PrimaryKey, Property, OneToMany, Collection } from '@mikro-orm/core';
import { Unidad } from './Unidad';

@Entity({ tableName: 'tipo_unidad' })
export class TipoUnidad {
  @PrimaryKey()
  id!: number;

  @Property()
  nombre!: string;

  @OneToMany(() => Unidad, unidad => unidad.tipoUnidad)
  unidades = new Collection<Unidad>(this);
}
