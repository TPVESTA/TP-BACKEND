import { Entity, PrimaryKey, Property, Filter, ManyToMany, Collection } from '@mikro-orm/core';
import { User } from './User';
import { Edificio } from './Edificio';

@Filter({ name: 'softDelete', cond: { deleteTimestamp: null }, default: true })
@Entity({ tableName: 'administraciones' })
export class Administracion {
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
  email!: string;

  @Property()
  direccion!: string;

  @ManyToMany(() => User, (user) => user.administracion, { owner: true, pivotTable: 'empleado' })
  usuarios = new Collection<User>(this);

  @ManyToMany(() => Edificio, (edificio) => edificio.administracion, { owner: true, pivotTable: 'admin_edificio' })
  edificios = new Collection<Edificio>(this);

  constructor(cuit: string, nombre: string, email: string, direccion: string) {
    this.cuit = cuit;
    this.nombre = nombre;
    this.email = email;
    this.direccion = direccion;
    this.creationTimestamp = new Date();
  }
}
