-- Присъствия от графика (opt-in на фирма, по подразбиране изключено).
ALTER TABLE "hr_settings" ADD COLUMN "autoAttendanceFromSchedule" BOOLEAN NOT NULL DEFAULT false;
