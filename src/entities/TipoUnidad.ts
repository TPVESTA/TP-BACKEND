import { Entity, PrimaryKey, Property, OneToMany, Collection, Enum } from '@mikro-orm/core';
import { Unidad } from './Unidad';
import { AmbitoUnidad } from './enums';

@Entity({ tableName: 'tipo_unidad' })
export class TipoUnidad {
  @PrimaryKey()
  id!: number;

  @Property()
  nombre!: string;

  // NULL permite conservar los tipos anteriores hasta clasificarlos explícitamente.
  // La API exige un ámbito al crear nuevos tipos.
  @Enum({ items: () => AmbitoUnidad, nullable: true })
  ambito: AmbitoUnidad | null = null;

  @OneToMany(() => Unidad, unidad => unidad.tipoUnidad)
  unidades = new Collection<Unidad>(this);
}
