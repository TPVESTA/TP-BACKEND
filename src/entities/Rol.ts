import { Entity, Property, PrimaryKey, ManyToMany, Collection } from "@mikro-orm/core";
import { User } from "./User";

@Entity({ tableName: "roles" })
export class Rol {

    @PrimaryKey()
    id!: number;

    @Property()
    nombre!: string;

    @Property()
    descripcion!: string;

    @ManyToMany(() => User, (user) => user.roles)
    users = new Collection<User>(this);

}
