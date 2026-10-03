-- Поддръжка: редакция на собствено съобщение / описание — кога е редактирано.
ALTER TABLE "support_ticket_messages" ADD COLUMN "editedAt" TIMESTAMP(3);
ALTER TABLE "support_tickets" ADD COLUMN "editedAt" TIMESTAMP(3);
