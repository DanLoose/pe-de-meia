import { execSync } from "node:child_process";

export default async function globalSetup() {
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: process.env,
  });
  execSync("npm run db:seed", {
    stdio: "inherit",
    env: process.env,
  });
}
