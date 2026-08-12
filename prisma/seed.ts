import "dotenv/config";
import bcrypt from "bcryptjs";
import { createPrismaClient } from "../src/lib/db";
import {
  DEFAULT_CATEGORIES,
  LEGACY_CATEGORY_NAME_MAP,
} from "../src/lib/default-categories";

const prisma = createPrismaClient();

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
  } else {
    for (const [legacyName, localizedName] of Object.entries(
      LEGACY_CATEGORY_NAME_MAP,
    )) {
      await prisma.category.updateMany({
        where: { userId: user.id, name: legacyName },
        data: { name: localizedName },
      });
    }

    for (const category of DEFAULT_CATEGORIES) {
      await prisma.category.updateMany({
        where: { userId: user.id, name: category.name, type: category.type },
        data: { ledgerColumn: category.ledgerColumn },
      });
    }
  }

  const testCategories = await prisma.category.findMany({
    where: {
      userId: user.id,
      OR: [{ name: { startsWith: "US12" } }, { name: { startsWith: "E2E" } }],
    },
    select: { id: true },
  });

  if (testCategories.length > 0) {
    const ids = testCategories.map((category) => category.id);
    await prisma.transaction.deleteMany({
      where: { categoryId: { in: ids } },
    });
    await prisma.category.deleteMany({
      where: { id: { in: ids } },
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
