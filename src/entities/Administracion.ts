import { Entity, PrimaryKey, Property, Filter, ManyToOne, OneToMany, Collection, Rel } from '@mikro-orm/core';
import { Empleado } from './Empleado';
import { AdminEdificio } from './AdminEdificio';
import { Localidad } from './Localidad';

@Filter({ name: 'softDelete', cond: { deletedAt: null }, default: true })
@Entity({ tableName: 'administracion' })
export class Administracion {
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
  email!: string;

  @Property()
  direccion!: string;

  @ManyToOne(() => Localidad)
  localidad!: Rel<Localidad>;

  @OneToMany(() => Empleado, empleado => empleado.administracion)
  empleados = new Collection<Empleado>(this);

  @OneToMany(() => AdminEdificio, gestion => gestion.administracion)
  gestionesEdificios = new Collection<AdminEdificio>(this);

  constructor(cuit: string, nombre: string, email: string, direccion: string) {
    this.cuit = cuit;
    this.nombre = nombre;
    this.email = email;
    this.direccion = direccion;
    this.createdAt = new Date();
  }
}
