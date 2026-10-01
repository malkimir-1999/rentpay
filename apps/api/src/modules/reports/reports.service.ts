import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma.service';
import type { Actor } from '../identity/auth.types';

type UtilizationInput = { from: string; to: string };

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async utilization(actor: Actor, input: UtilizationInput) {
    const businessId = this.businessId(actor);
    const { from, to, hoursInRange } = this.range(input);
    const rows = await this.prisma.$queryRaw<Array<{ id: string; make: string; model: string; registrationNumber: string; category: string | null; bookedHours: number }>>(Prisma.sql`
      SELECT v."id", v."make", v."model", v."registrationNumber", v."category",
        COALESCE(SUM(EXTRACT(EPOCH FROM (LEAST(r."expectedReturnAt", ${to}) - GREATEST(r."startAt", ${from}))) / 3600), 0)::float8 AS "bookedHours"
      FROM "Vehicle" v
      LEFT JOIN "Rental" r ON r."vehicleId" = v."id" AND r."businessId" = v."businessId"
        AND r."status" IN ('BOOKED', 'ACTIVE', 'RETURNED', 'CLOSED')
        AND r."startAt" < ${to} AND r."expectedReturnAt" > ${from}
      WHERE v."businessId" = ${businessId} AND v."archivedAt" IS NULL
      GROUP BY v."id", v."make", v."model", v."registrationNumber", v."category"
      ORDER BY v."make", v."model", v."registrationNumber"
    `);
    const vehicles = rows.map((row) => ({ ...row, bookedHours: Math.round(row.bookedHours * 100) / 100, utilizationPercent: hoursInRange ? Math.round(Math.min(100, row.bookedHours / hoursInRange * 10000)) / 100 : 0 }));
    const bookedHours = vehicles.reduce((total, vehicle) => total + vehicle.bookedHours, 0);
    const fleetHours = vehicles.length * hoursInRange;
    return { from, to, vehicleCount: vehicles.length, fleetUtilizationPercent: fleetHours ? Math.round(bookedHours / fleetHours * 10000) / 100 : 0, bookedHours: Math.round(bookedHours * 100) / 100, availableHours: Math.max(0, Math.round((fleetHours - bookedHours) * 100) / 100), vehicles };
  }

  async utilizationCsv(actor: Actor, input: UtilizationInput) {
    const report = await this.utilization(actor, input);
    const values = [
      ['Vehicle', 'Registration', 'Category', 'Booked hours', 'Utilization percent'],
      ...report.vehicles.map((vehicle) => [`${vehicle.make} ${vehicle.model}`, vehicle.registrationNumber, vehicle.category ?? '', String(vehicle.bookedHours), String(vehicle.utilizationPercent)]),
    ];
    return values.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\r\n');
  }

  private range(input: UtilizationInput) {
    const from = new Date(input.from);
    const to = new Date(input.to);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || to <= from) throw new BadRequestException('Choose a report end time after its start time.');
    const hoursInRange = (to.getTime() - from.getTime()) / 3600000;
    if (hoursInRange > 366 * 24) throw new BadRequestException('Reports can cover up to 366 days at a time.');
    return { from, to, hoursInRange };
  }

  private businessId(actor: Actor) {
    if (!actor.businessId) throw new ConflictException('Choose an active business workspace.');
    return actor.businessId;
  }
}
