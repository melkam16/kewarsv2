import 'dotenv/config';
import bcrypt from 'bcrypt';
import prisma from './prisma.js';

async function main() {
  const email = "admin@kewars.org";
  const password = "adminpassword123";
  const name = "System Administrator";
  
  console.log(`Creating/updating admin user: ${email}...`);
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Upsert the user
  const user = await prisma.users.upsert({
    where: { email },
    update: {
      name,
      password: hashedPassword,
      role: 'admin',
      enabled: true
    },
    create: {
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      enabled: true
    }
  });
  
  console.log(`User created/updated with ID: ${user.id}`);
  
  // Create the admin role in user_roles
  await prisma.user_roles.upsert({
    where: {
      user_id_role: {
        user_id: user.id,
        role: 'admin'
      }
    },
    create: {
      user_id: user.id,
      role: 'admin'
    },
    update: {}
  });
  
  console.log("Admin user successfully registered with 'admin' role in user_roles.");
}

main()
  .catch((err) => {
    console.error("Error creating admin:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
