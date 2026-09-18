import { Entity, PrimaryKey, Property, ManyToOne, Rel, BeforeCreate, BeforeUpdate } from '@mikro-orm/core';
import { Administracion } from './Administracion';
import { Edificio } from './Edificio';

@Entity({ tableName: 'admin_edificio' })
export class AdminEdificio {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Administracion)
  administracion!: Rel<Administracion>;

  @ManyToOne(() => Edificio)
  edificio!: Rel<Edificio>;

  @Property()
  beginAt: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  endAt: Date | null = null;
  @BeforeCreate()
  @BeforeUpdate()
  async validar(): Promise<void> {
    if (this.endAt !== null && this.endAt < this.beginAt) {
      throw new Error('La fecha de fin no puede ser anterior a la fecha de inicio.');
    }
  }
}
