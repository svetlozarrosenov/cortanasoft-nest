-- Почивка „от–до" на смяната (HH:mm). NULL = почивката от HR настройките.
ALTER TABLE "work_shifts" ADD COLUMN "breakStart" TEXT, ADD COLUMN "breakEnd" TEXT;
