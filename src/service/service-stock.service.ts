import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class ServiceStockService {
  /**
   * Издава частите на заявката от склада. Извиква се при преход → DELIVERED.
   * Mirror на orders.confirm pattern: SERIAL → mark SOLD, BATCH → decrement.
   * Само parts със source = STOCK влизат в склада.
   */
  async deductPartsForOrder(
    tx: Prisma.TransactionClient,
    serviceOrderId: string,
    companyId: string,
  ) {
    const parts = await tx.serviceOrderPart.findMany({
      where: { serviceOrderId, source: 'STOCK' },
      include: { product: true },
    });

    for (const part of parts) {
      const product = part.product;
      if (!product || product.type === 'SERVICE' || !product.trackInventory) {
        continue;
      }

      // SERIAL продукти
      if (product.type === 'SERIAL') {
        if (!part.inventorySerialId) {
          throw new BadRequestException(
            `За "${product.name}" е нужен сериен номер преди да предадете заявката`,
          );
        }

        const serial = await tx.inventorySerial.findFirst({
          where: { id: part.inventorySerialId, companyId, productId: part.productId },
        });

        if (!serial) {
          throw new BadRequestException(
            `Серийният номер за "${product.name}" не е намерен`,
          );
        }

        if (serial.status !== 'IN_STOCK') {
          throw new BadRequestException(
            `Серийният номер ${serial.serialNumber} вече не е наличен`,
          );
        }

        await tx.inventorySerial.update({
          where: { id: part.inventorySerialId },
          data: { status: 'SOLD' },
        });

        continue;
      }

      // BATCH продукти
      const quantity = Number(part.quantity);

      if (part.inventoryBatchId) {
        const batch = await tx.inventoryBatch.findUnique({
          where: { id: part.inventoryBatchId },
        });
        if (!batch) {
          throw new BadRequestException(
            `Партидата за "${product.name}" не е намерена`,
          );
        }
        if (Number(batch.quantity) < quantity) {
          throw new BadRequestException(
            `Недостатъчна наличност за "${product.name}" — ${Number(batch.quantity)} налични, ${quantity} необходими`,
          );
        }
        await tx.inventoryBatch.update({
          where: { id: part.inventoryBatchId },
          data: { quantity: { decrement: quantity } },
        });
      } else {
        // FIFO от наличните партиди
        const batches = await tx.inventoryBatch.findMany({
          where: {
            companyId,
            productId: part.productId,
            quantity: { gt: 0 },
          },
          orderBy: { createdAt: 'asc' },
        });

        const totalAvailable = batches.reduce(
          (sum, b) => sum + Number(b.quantity),
          0,
        );

        if (totalAvailable < quantity) {
          throw new BadRequestException(
            `Недостатъчна наличност за "${product.name}" — ${totalAvailable} налични, ${quantity} необходими`,
          );
        }

        let remaining = quantity;
        for (const batch of batches) {
          if (remaining <= 0) break;
          const take = Math.min(remaining, Number(batch.quantity));
          await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: { quantity: { decrement: take } },
          });
          remaining -= take;
        }
      }
    }
  }
}
