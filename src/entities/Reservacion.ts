import { Entity, PrimaryKey, Property, ManyToOne, Rel } from '@mikro-orm/core';
import { User } from './User';
import { AreaComun } from './AreaComun';

@Entity({ tableName: 'reservacion' })
export class Reservacion {
  @PrimaryKey()
  id!: number;

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Property()
  fechaReservacion!: Date;

  @Property()
  estado!: string;

  @Property({ type: 'text' })
  descripcion!: string;

  @ManyToOne(() => User)
  usuario!: Rel<User>;

  @ManyToOne(() => AreaComun)
  areaComun!: Rel<AreaComun>;
}
