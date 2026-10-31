import { Entity, PrimaryKey, Property, ManyToOne, Rel, Enum, Filter } from '@mikro-orm/core';
import { EstadoReservacion } from './enums';
import { User } from './User';
import { AreaComun } from './AreaComun';
import { Propiedad } from './Propiedad';

@Filter({ name: 'softDelete', cond: { deletedAt: null }, default: true })
@Entity({ tableName: 'reservacion' })
export class Reservacion {
  @PrimaryKey()
  id!: number;

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  deletedAt: Date | null = null;

  @Property()
  fechaReservacion!: Date;

  @Enum({ items: () => EstadoReservacion, default: EstadoReservacion.RESERVADO })
  estado: EstadoReservacion = EstadoReservacion.RESERVADO;

  @Property({ type: 'text' })
  descripcion!: string;

  @ManyToOne(() => User)
  usuario!: Rel<User>;

  @ManyToOne(() => AreaComun)
  areaComun!: Rel<AreaComun>;

  // Conserva el contexto en que se creó, aunque después cambien las asignaciones.
  @ManyToOne(() => Propiedad, { nullable: true })
  propiedadOrigen: Rel<Propiedad> | null = null;
}
