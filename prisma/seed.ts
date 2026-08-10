import "dotenv/config";
import bcrypt from "bcryptjs";
import { createPrismaClient } from "../src/lib/db";

const prisma = createPrismaClient();

const DEFAULT_CATEGORIES = [
  { name: "Salary", color: "#22c55e", type: "INCOME" as const },
  { name: "Freelance", color: "#10b981", type: "INCOME" as const },
  { name: "Other Income", color: "#14b8a6", type: "INCOME" as const },
  { name: "Food", color: "#ef4444", type: "EXPENSE" as const },
  { name: "Rent", color: "#f97316", type: "EXPENSE" as const },
  { name: "Transport", color: "#eab308", type: "EXPENSE" as const },
  { name: "Utilities", color: "#a855f7", type: "EXPENSE" as const },
  { name: "Other Expense", color: "#64748b", type: "EXPENSE" as const },
];

async function main() {
  const email = "demo@pedemeia.dev";
  const passwordHash = await bcrypt.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Demo User",
      passwordHash,
    },
  });

  const existingCategories = await prisma.category.count({
    where: { userId: user.id },
  });

  if (existingCategories === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((category) => ({
        ...category,
        userId: user.id,
      })),
    });
  }

  console.log("Seed complete.");
  console.log("Demo login: demo@pedemeia.dev / password123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
