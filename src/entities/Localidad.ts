import { Entity, PrimaryKey, Property, OneToMany, Collection } from '@mikro-orm/core';
import { Administracion } from './Administracion';
import { Edificio } from './Edificio';

@Entity({ tableName: 'localidad' })
export class Localidad {
  @PrimaryKey()
  id!: number;

  @Property()
  nombre!: string;

  @Property()
  provincia!: string;

  @OneToMany(() => Edificio, edificio => edificio.localidad)
  edificios = new Collection<Edificio>(this);

  @OneToMany(() => Administracion, administracion => administracion.localidad)
  administraciones = new Collection<Administracion>(this);
}
