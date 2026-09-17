import { Entity, PrimaryKey, Property, Filter, ManyToMany, Collection } from '@mikro-orm/core';
import { Administracion } from './Administracion';

@Filter({ name: 'softDelete', cond: { deleteTimestamp: null }, default: true })
@Entity({ tableName: 'edificios' })
export class Edificio {
  @PrimaryKey()
  id!: number;

  @Property()
  cuit!: string;

  @Property()
  nombre!: string;

  @Property({ fieldName: 'creation_timestamp' })
  creationTimestamp: Date = new Date();

  @Property({ fieldName: 'delete_timestamp', nullable: true })
  deleteTimestamp: Date | null = null;

  @Property()
  direccion!: string;

  @ManyToMany(() => Administracion, (administracion) => administracion.edificios)
  administracion = new Collection<Administracion>(this);

  constructor(cuit: string, nombre: string, direccion: string) {
    this.cuit = cuit;
    this.nombre = nombre;
    this.direccion = direccion;
    this.creationTimestamp = new Date();
  }
}
