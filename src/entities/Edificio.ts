import { Entity, PrimaryKey, Property, Filter, ManyToOne, OneToMany, Rel, Collection } from '@mikro-orm/core';
import { AdminEdificio } from './AdminEdificio';
import { Localidad } from './Localidad';
import { Unidad } from './Unidad';

@Filter({ name: 'softDelete', cond: { deletedAt: null }, default: true })
@Entity({ tableName: 'edificio' })
export class Edificio {
  @PrimaryKey()
  id!: number;

  @Property()
  cuit!: string;

  @Property()
  nombre!: string;

  @Property({ fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ fieldName: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date | null = null;

  @Property()
  direccion!: string;

  @ManyToOne(() => Localidad)
  localidad!: Rel<Localidad>;

  @OneToMany(() => Unidad, unidad => unidad.edificio)
  unidades = new Collection<Unidad>(this);

  @OneToMany(() => AdminEdificio, gestion => gestion.edificio)
  administraciones = new Collection<AdminEdificio>(this);

  constructor(cuit: string, nombre: string, direccion: string) {
    this.cuit = cuit;
    this.nombre = nombre;
    this.direccion = direccion;
    this.createdAt = new Date();
  }
}
