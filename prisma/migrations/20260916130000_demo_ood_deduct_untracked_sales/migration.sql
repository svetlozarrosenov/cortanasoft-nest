-- Демо ООД (cmn9f44mt0004n4pge2mzh17e): продажби на продукти с изключено
-- „Следи наличността" не изписваха склада (флагът вече значи само известие
-- за ниска наличност). Тук се прави това, което confirm() е трябвало да
-- направи: FEFO/FIFO изписване от партидите на локацията на реда (или на
-- поръчката), запис на разпределенията, а при недостиг редът става
-- backorder (stockDeducted=false → „Очакват изписване").
-- Нарочно само за тази компания; другите фирми с такива редове нямат
-- наличност за изписване и се оставят както са.
DO $$
DECLARE
  c_company CONSTANT text := 'cmn9f44mt0004n4pge2mzh17e';
  r record;
  b record;
  available numeric;
  remaining numeric;
  take numeric;
BEGIN
  FOR r IN
    SELECT oi.id, oi."productId", oi.quantity,
           COALESCE(oi."locationId", o."locationId") AS loc
    FROM order_items oi
    JOIN orders o ON o.id = oi."orderId"
    JOIN products p ON p.id = oi."productId"
    WHERE o."companyId" = c_company
      AND o.status NOT IN ('DRAFT', 'PENDING', 'CANCELLED')
      AND p.type IN ('PRODUCT', 'BATCH')
      AND p."trackInventory" = false
      AND oi."directDelivery" = false
      AND oi."stockDeducted" = true
      AND oi."inventoryBatchId" IS NULL
      AND oi."inventorySerialId" IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM order_item_batch_allocations a WHERE a."orderItemId" = oi.id
      )
    ORDER BY o."orderDate", o."createdAt", oi.id
  LOOP
    SELECT COALESCE(SUM(quantity), 0) INTO available
    FROM inventory_batches
    WHERE "companyId" = c_company AND "productId" = r."productId"
      AND quantity > 0
      AND (r.loc IS NULL OR "locationId" = r.loc);

    IF available < r.quantity THEN
      -- Недостиг: backorder, чака доставка в „Очакват изписване"
      UPDATE order_items SET "stockDeducted" = false WHERE id = r.id;
      CONTINUE;
    END IF;

    remaining := r.quantity;
    FOR b IN
      SELECT id, "batchNumber", quantity
      FROM inventory_batches
      WHERE "companyId" = c_company AND "productId" = r."productId"
        AND quantity > 0
        AND (r.loc IS NULL OR "locationId" = r.loc)
      ORDER BY "expiryDate" ASC NULLS LAST, "createdAt" ASC
      FOR UPDATE
    LOOP
      EXIT WHEN remaining <= 0;
      take := LEAST(b.quantity, remaining);
      UPDATE inventory_batches
      SET quantity = quantity - take, "updatedAt" = now()
      WHERE id = b.id;
      INSERT INTO order_item_batch_allocations
        (id, "orderItemId", "inventoryBatchId", "batchNumber", quantity, "createdAt")
      VALUES
        ('mig' || substr(md5(r.id || b.id), 1, 22), r.id, b.id, b."batchNumber", take, now());
      remaining := remaining - take;
    END LOOP;
  END LOOP;
END $$;
