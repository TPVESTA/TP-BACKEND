import { EntityClass, EntityManager, FilterQuery } from "@mikro-orm/core";
import bcrypt from "bcryptjs";
import { Administracion } from "../../entities/Administracion";
import { AdminEdificio } from "../../entities/AdminEdificio";
import { AmbitoUnidad } from "../../entities/AmbitoUnidad";
import { AreaComun } from "../../entities/AreaComun";
import { Edificio } from "../../entities/Edificio";
import { Empleado } from "../../entities/Empleado";
import { Incidencia } from "../../entities/Incidencia";
import { Localidad } from "../../entities/Localidad";
import { CodigoRol } from "../../entities/Permiso";
import { Propiedad } from "../../entities/Propiedad";
import { Reservacion } from "../../entities/Reservacion";
import { Rol } from "../../entities/Rol";
import { RolPermiso } from "../../entities/RolPermiso";
import { TipoUnidad } from "../../entities/TipoUnidad";
import { Unidad } from "../../entities/Unidad";
import { User } from "../../entities/User";
import { UsuarioRol } from "../../entities/UsuarioRol";
import { UsuarioRolPropiedad } from "../../entities/UsuarioRolPropiedad";
import { seedDefaultPermissions } from "../../services/authorization/permission-seed.service";

const buildings = [
  { nombre: "Edificio Parque Independencia", direccion: "Av. Pellegrini 1850" },
  { nombre: "Edificio Centro", direccion: "Balcarce 120" },
  { nombre: "Edificio Boulevard Oroño", direccion: "Bv. Oroño 1250" },
  { nombre: "Edificio Pichincha", direccion: "Güemes 2450" },
];

const tenants = [
  ["Lucía", "Fernández"],
  ["Mateo", "Gómez"],
  ["Sofía", "López"],
  ["Santiago", "Martínez"],
  ["Valentina", "Pérez"],
  ["Benjamín", "Rodríguez"],
  ["Camila", "García"],
  ["Tomás", "Sánchez"],
  ["Martina", "Romero"],
  ["Joaquín", "Díaz"],
];
const owners = [
  ["María", "González"],
  ["Carlos", "Torres"],
  ["Laura", "Acosta"],
  ["Diego", "Medina"],
  ["Patricia", "Herrera"],
];

/** Identificaciones ficticias de 11 dígitos con dígito verificador. */
function fiscalId(prefix: number, number: number): string {
  const base = `${prefix}${String(number).padStart(8, "0")}`;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const remainder =
    11 -
    ([...base].reduce((sum, digit, i) => sum + Number(digit) * weights[i], 0) %
      11);
  return `${base}${remainder === 11 ? 0 : remainder === 10 ? 9 : remainder}`;
}

/** Reutiliza registros; nunca reactiva bajas ni reemplaza datos existentes. */
async function ensure<T extends object>(
  em: EntityManager,
  entity: EntityClass<T>,
  where: FilterQuery<T>,
  create: () => T,
): Promise<T> {
  const existing = await em.findOne(entity, where, {
    filters: { softDelete: false },
  });
  if (existing) {
    if ("deletedAt" in existing && existing.deletedAt != null) {
      throw new Error(
        `El seed encontró un registro eliminado de ${entity.name}; resolvé la baja antes de continuar.`,
      );
    }
    return existing;
  }
  const record = create();
  await em.persistAndFlush(record);
  return record;
}

export async function seedRosario(entityManager: EntityManager) {
  return entityManager.transactional(async (em) => {
    // Borra primero los registros dependientes para respetar las claves foráneas.
    // DELETE permite revertir la limpieza si falla la carga (a diferencia de TRUNCATE).
    for (const entity of [
      Reservacion,
      Incidencia,
      UsuarioRolPropiedad,
      Empleado,
      UsuarioRol,
      AdminEdificio,
      RolPermiso,
      Unidad,
      Edificio,
      Administracion,
      Localidad,
      TipoUnidad,
      Rol,
      User,
    ]) {
      await em.nativeDelete<object>(entity, {}, { filters: false });
    }
    em.clear();

    // El seed asigna explícitamente su sysadmin, sin consumir el bootstrap de la API.
    await seedDefaultPermissions(em, "");
    const roles = new Map<CodigoRol, Rol>();
    for (const codigo of Object.values(CodigoRol)) {
      roles.set(codigo, await em.findOneOrFail(Rol, { codigo }));
    }
    const now = new Date();
    const active = {
      beginAt: { $lte: now },
      $or: [{ endAt: null }, { endAt: { $gt: now } }],
    };
    const openRoles = new Map<string, UsuarioRol>();
    const assignRole = async (usuario: User, rol: Rol): Promise<UsuarioRol> => {
      const key = `${usuario.id}:${rol.id}`;
      const cached = openRoles.get(key);
      if (cached) return cached;
      const created = await ensure(
        em,
        UsuarioRol,
        { usuario: usuario.id, rol: rol.id, $or: [{ endAt: null }, { endAt: { $gt: now } }] },
        () => Object.assign(new UsuarioRol(), { usuario, rol, beginAt: now }),
      );
      openRoles.set(key, created);
      return created;
    };
    const localidad = await ensure(
      em,
      Localidad,
      { nombre: "Rosario", provincia: "Santa Fe" },
      () =>
        Object.assign(new Localidad(), {
          nombre: "Rosario",
          provincia: "Santa Fe",
        }),
    );
    const administracion = await ensure(
      em,
      Administracion,
      { cuit: fiscalId(30, 71990000) },
      () =>
        Object.assign(
          new Administracion(
            fiscalId(30, 71990000),
            "Administración Rosario Centro",
            "administracion@rosario.example",
            "San Lorenzo 1450",
          ),
          { localidad },
        ),
    );
    const departamento = await ensure(
      em,
      TipoUnidad,
      { nombre: "Departamento", ambito: AmbitoUnidad.PRIVADO },
      () =>
        Object.assign(new TipoUnidad(), {
          nombre: "Departamento",
          ambito: AmbitoUnidad.PRIVADO,
        }),
    );
    const sum = await ensure(
      em,
      TipoUnidad,
      { nombre: "SUM", ambito: AmbitoUnidad.COMUN },
      () =>
        Object.assign(new TipoUnidad(), {
          nombre: "SUM",
          ambito: AmbitoUnidad.COMUN,
        }),
    );
    const terraza = await ensure(
      em,
      TipoUnidad,
      { nombre: "Terraza con parrillero", ambito: AmbitoUnidad.COMUN },
      () =>
        Object.assign(new TipoUnidad(), {
          nombre: "Terraza con parrillero",
          ambito: AmbitoUnidad.COMUN,
        }),
    );

    const propiedades: Propiedad[] = [];
    for (const [buildingIndex, definition] of buildings.entries()) {
      const cuit = fiscalId(30, 71990001 + buildingIndex);
      const edificio = await ensure(em, Edificio, { cuit }, () =>
        Object.assign(
          new Edificio(cuit, definition.nombre, definition.direccion),
          { localidad },
        ),
      );
      await ensure(
        em,
        AdminEdificio,
        { edificio: edificio.id, administracion: administracion.id, ...active },
        () =>
          Object.assign(new AdminEdificio(), {
            edificio,
            administracion,
            beginAt: now,
          }),
      );
      for (let unitIndex = 0; unitIndex < 10; unitIndex++) {
        const piso = Math.floor(unitIndex / 2) + 1;
        const letra = unitIndex % 2 === 0 ? "A" : "B";
        const nroUnidad = `${piso}${letra}`;
        propiedades.push(
          await ensure(
            em,
            Propiedad,
            { edificio: edificio.id, nroUnidad },
            () =>
              Object.assign(new Propiedad(), {
                nroUnidad,
                edificio,
                tipoUnidad: departamento,
                mtCuadrados: letra === "A" ? 65 : 80,
                habitaciones: letra === "A" ? 2 : 3,
                copropiedad: 10,
                descripcion: `Departamento ${nroUnidad}, piso ${piso}, ${definition.nombre}.`,
              }),
          ),
        );
      }
      for (const area of [
        {
          nroUnidad: "SUM",
          tipoUnidad: sum,
          mtCuadrados: 100,
          capacidad: 40,
          descripcion: "Salón de usos múltiples con cocina y baños.",
        },
        {
          nroUnidad: "TERRAZA",
          tipoUnidad: terraza,
          mtCuadrados: 120,
          capacidad: 25,
          descripcion: "Terraza de uso común con parrillero y mesas.",
        },
      ]) {
        await ensure(
          em,
          AreaComun,
          { edificio: edificio.id, nroUnidad: area.nroUnidad },
          () => Object.assign(new AreaComun(), area, { edificio }),
        );
      }
    }

    async function user(
      nombre: string,
      apellido: string,
      alias: string,
      index: number,
    ): Promise<User> {
      const email = `${alias}@rosario.example`;
      let account = await em.findOne(
        User,
        { email },
        { filters: { softDelete: false } },
      );
      if (account && (account.deletedAt !== null || !account.estado)) {
        throw new Error(
          `La cuenta ${email} está eliminada o deshabilitada; el seed no la reactiva.`,
        );
      }
      if (!account) {
        account = new User(
          nombre,
          apellido,
          email,
          new Date(Date.UTC(1980 + index, index % 12, 15)),
          await bcrypt.hash("ROOT123", 12),
          true,
        );
        account.cuil = fiscalId(20, 30000000 + index);
        account.telefono = `341555${String(index).padStart(4, "0")}`;
        await em.persistAndFlush(account);
      }
      return account;
    }

    const inquilinos: User[] = [];
    for (const [i, [nombre, apellido]] of tenants.entries()) {
      inquilinos.push(await user(nombre, apellido, `inquilino${i + 1}`, i + 1));
    }
    const propietarios: User[] = [];
    for (const [i, [nombre, apellido]] of owners.entries()) {
      propietarios.push(
        await user(nombre, apellido, `propietario${i + 1}`, i + 11),
      );
    }
    // Todos los departamentos tienen propietario; cada propietario posee ocho.
    for (const [i, propiedad] of propiedades.entries()) {
      const usuario = propietarios[i % propietarios.length];
      const rol = roles.get(CodigoRol.PROPIETARIO)!;
      const usuarioRol = await assignRole(usuario, rol);
      await ensure(
        em,
        UsuarioRolPropiedad,
        { usuarioRol: usuarioRol.id, propiedad: propiedad.id, ...active },
        () =>
          Object.assign(new UsuarioRolPropiedad(), {
            usuarioRol,
            propiedad,
            beginAt: now,
          }),
      );
    }
    // Distribuye los diez inquilinos entre los cuatro edificios; los demás departamentos quedan vacantes.
    for (const [i, usuario] of inquilinos.entries()) {
      const propiedad =
        propiedades[
          (i % buildings.length) * 10 + Math.floor(i / buildings.length)
        ];
      const rol = roles.get(CodigoRol.RESIDENTE)!;
      const usuarioRol = await assignRole(usuario, rol);
      await ensure(
        em,
        UsuarioRolPropiedad,
        { usuarioRol: usuarioRol.id, propiedad: propiedad.id, ...active },
        () =>
          Object.assign(new UsuarioRolPropiedad(), {
            usuarioRol,
            propiedad,
            beginAt: now,
          }),
      );
    }
    for (const employee of [
      {
        nombre: "Florencia",
        apellido: "Castro",
        alias: "administrativo",
        index: 16,
        codigo: CodigoRol.ADMINISTRATIVO,
      },
      {
        nombre: "Pablo",
        apellido: "Ruiz",
        alias: "mantenimiento",
        index: 17,
        codigo: CodigoRol.MANTENIMIENTO,
      },
    ]) {
      const usuario = await user(
        employee.nombre,
        employee.apellido,
        employee.alias,
        employee.index,
      );
      const rol = roles.get(employee.codigo)!;
      const usuarioRol = await assignRole(usuario, rol);
      await ensure(
        em,
        Empleado,
        { usuarioRol: usuarioRol.id, administracion: administracion.id, ...active },
        () =>
          Object.assign(new Empleado(), {
            usuarioRol,
            administracion,
            beginAt: now,
          }),
      );
    }
    const sysadmin = await user("Nicolás", "Administrador", "sysadmin", 18);
    await assignRole(sysadmin, roles.get(CodigoRol.SUPERADMIN)!);

    return {
      edificios: buildings.length,
      propiedades: propiedades.length,
      espaciosComunes: buildings.length * 2,
      inquilinos: inquilinos.length,
      propietarios: propietarios.length,
      empleados: 2,
      sysadmins: 1,
    };
  });
}
