import { Entity, PrimaryKey, Property, Filter, ManyToMany, Collection } from '@mikro-orm/core';
import { Rol } from './Rol';  

@Filter({ name: 'softDelete', cond: { deletedAt: null }, default: true })
@Entity({ tableName: 'users' })
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

  @Property({ fieldName: 'deleted_at', nullable: true })
  deletedAt: Date | null = null;
  
  @Property()
  estado!: boolean;

  @ManyToMany(() => Rol, (rol) => rol.users, { owner: true, pivotTable: 'user_roles' })
  roles = new Collection<Rol>(this);

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
