-- AlterTable
ALTER TABLE "RecurringTransaction" ADD COLUMN IF NOT EXISTS "startsOn" DATE,
ADD COLUMN IF NOT EXISTS "endsOn" DATE;

UPDATE "RecurringTransaction" AS r
SET "startsOn" = make_date(
  EXTRACT(YEAR FROM r."createdAt")::int,
  EXTRACT(MONTH FROM r."createdAt")::int,
  LEAST(
    r."dayOfMonth",
    EXTRACT(
      DAY FROM (
        date_trunc('month', r."createdAt") + interval '1 month - 1 day'
      )
    )::int
  )
)
WHERE r."startsOn" IS NULL;

ALTER TABLE "RecurringTransaction" ALTER COLUMN "startsOn" SET NOT NULL;
