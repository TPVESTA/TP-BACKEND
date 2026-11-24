import { Entity, ManyToOne, PrimaryKey, Property, Rel } from '@mikro-orm/core';
import { Edificio } from './Edificio';

@Entity({ tableName: 'reunion' })
export class Reunion {
  @PrimaryKey()
  id!: number;

  @Property({ length: 255 })
  asunto!: string;

  @Property({ type: 'text' })
  minuta!: string;

  @Property({ type: 'date' })
  fecha!: string;

  @Property({ type: 'time' })
  hora!: string;

  @ManyToOne(() => Edificio)
  edificio!: Rel<Edificio>;
}
