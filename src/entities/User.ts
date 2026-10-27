import { Entity, PrimaryKey, Property, Filter, OneToMany, Collection } from '@mikro-orm/core';
import { UsuarioRol } from './UsuarioRol';
import { Incidencia } from './Incidencia';
import { Reservacion } from './Reservacion';

@Filter({ name: 'softDelete', cond: { deletedAt: null }, default: true })
@Entity({ tableName: 'user' })
export class User {
  @PrimaryKey()
  id!: number;

  @Property()
  cuil!: string;

  @Property()
  nombre!: string;

  @Property()
  apellido!: string;

  @Property({ unique: true })
  email!: string;

  @Property()
  fechaNacimiento!: Date;

  @Property({ hidden: true }) // Revisar
  password!: string;

  @Property({ fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Property({ fieldName: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date | null = null;
  
  @Property()
  estado!: boolean;

  @OneToMany(() => UsuarioRol, asignacion => asignacion.usuario)
  roles = new Collection<UsuarioRol>(this);

  @OneToMany(() => Incidencia, incidencia => incidencia.usuario)
  incidencias = new Collection<Incidencia>(this);

  @OneToMany(() => Reservacion, reservacion => reservacion.usuario)
  reservaciones = new Collection<Reservacion>(this);

  constructor(nombre: string, apellido: string, email: string, fechaNacimiento: Date, password: string, estado: boolean) {
    this.nombre = nombre;
    this.apellido = apellido;
    this.email = email;
    this.fechaNacimiento = fechaNacimiento;
    this.password = password;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.estado = estado; // Revisar si se debe inicializar o siempre se envia el estado como paramatro
  }
}
