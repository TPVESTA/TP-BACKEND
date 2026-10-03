import { Entity, PrimaryKey, Property, ManyToOne, Rel, Enum } from '@mikro-orm/core';
import { EstadoIncidencia } from './EstadoIncidencia';
import { User } from './User';
import { Unidad } from './Unidad';

@Entity({ tableName: 'incidencia' })
export class Incidencia {
  @PrimaryKey()
  id!: number;

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  closedAt: Date | null = null;

  @Enum({ items: () => EstadoIncidencia, default: EstadoIncidencia.REPORTADO })
  estado: EstadoIncidencia = EstadoIncidencia.REPORTADO;

  @Property({ type: 'text' })
  descripcion!: string;

  @ManyToOne(() => User)
  usuario!: Rel<User>;

  @ManyToOne(() => Unidad)
  unidad!: Rel<Unidad>;
}
