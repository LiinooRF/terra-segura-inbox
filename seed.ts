// Seed script para crear el admin inicial y agentes de prueba
// Ejecutar: npm run seed
//
// Requiere variables de entorno:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:8000",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function seed() {
  console.log("🌱 Creando agentes iniciales...");

  const adminPassword = await bcrypt.hash("admin123", 10);
  const agentePassword = await bcrypt.hash("agente123", 10);

  const agentes = [
    {
      nombre: "Administrador",
      email: "admin@terrasegura.com",
      password_hash: adminPassword,
      rol: "admin",
    },
    {
      nombre: "Carlos López",
      email: "agente1@terrasegura.com",
      password_hash: agentePassword,
      rol: "agente",
    },
    {
      nombre: "María García",
      email: "agente2@terrasegura.com",
      password_hash: agentePassword,
      rol: "agente",
    },
  ];

  for (const agente of agentes) {
    const { data: existing } = await supabase
      .from("agentes")
      .select("id")
      .eq("email", agente.email)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`  ⏭️  ${agente.email} ya existe, saltando...`);
      continue;
    }

    const { error } = await supabase.from("agentes").insert(agente);

    if (error) {
      console.error(`  ❌ Error creando ${agente.email}:`, error.message);
    } else {
      console.log(`  ✅ Creado: ${agente.email}`);
    }
  }

  console.log("\n📋 Credenciales:");
  console.log("  Admin:  admin@terrasegura.com / admin123");
  console.log("  Agente: agente1@terrasegura.com / agente123");
  console.log("  Agente: agente2@terrasegura.com / agente123");
  console.log("\n✨ Seed completado.");
}

seed().catch(console.error);
