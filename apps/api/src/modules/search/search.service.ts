import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma.service';
import type { Actor } from '../identity/auth.types';

export type SearchInput = { query: string };
export type SearchResult = { id: string; type: 'Vehicle' | 'Customer' | 'Reservation' | 'Rental'; title: string; detail: string; status?: string; href: string };

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(actor: Actor, input: SearchInput) {
    const businessId = actor.businessId;
    const query = input.query.trim();
    if (!businessId || query.length < 2) return { results: [] as SearchResult[] };
    const tokens = query.split(/\s+/).filter(Boolean).slice(0, 8);
    const contains = (token: string) => ({ contains: token, mode: 'insensitive' as const });
    const permissions = new Set(actor.permissions);
    const [vehicles, customers, reservations, rentals] = await Promise.all([
      permissions.has('vehicle.view') ? this.prisma.vehicle.findMany({
        where: { businessId, archivedAt: null, AND: tokens.map((token) => ({ OR: [{ make: contains(token) }, { model: contains(token) }, { registrationNumber: contains(token) }, { variant: contains(token) }] })) },
        select: { id: true, make: true, model: true, registrationNumber: true, condition: true }, orderBy: [{ make: 'asc' }, { model: 'asc' }], take: 5,
      }) : [],
      permissions.has('customer.view') ? this.prisma.customer.findMany({
        where: { businessId, archivedAt: null, AND: tokens.map((token) => ({ OR: [{ fullName: contains(token) }, { phone: contains(token) }, { email: contains(token) }] })) },
        select: { id: true, fullName: true, phone: true, email: true, status: true }, orderBy: { fullName: 'asc' }, take: 5,
      }) : [],
      permissions.has('reservation.view') ? this.prisma.reservation.findMany({
        where: { businessId, AND: tokens.map((token) => ({ OR: [{ customerName: contains(token) }, { customerPhone: contains(token) }, { vehicle: { make: contains(token) } }, { vehicle: { model: contains(token) } }, { vehicle: { registrationNumber: contains(token) } }] })) },
        select: { id: true, status: true, startAt: true, customerName: true, vehicle: { select: { make: true, model: true, registrationNumber: true } } }, orderBy: { startAt: 'desc' }, take: 5,
      }) : [],
      permissions.has('rental.view') ? this.prisma.rental.findMany({
        where: { businessId, AND: tokens.map((token) => ({ OR: [{ customerName: contains(token) }, { customerPhone: contains(token) }, { vehicle: { make: contains(token) } }, { vehicle: { model: contains(token) } }, { vehicle: { registrationNumber: contains(token) } }] })) },
        select: { id: true, status: true, expectedReturnAt: true, customerName: true, vehicle: { select: { make: true, model: true, registrationNumber: true } } }, orderBy: { expectedReturnAt: 'desc' }, take: 5,
      }) : [],
    ]);

    const results: SearchResult[] = [
      ...vehicles.map((item) => ({ id: item.id, type: 'Vehicle' as const, title: `${item.make} ${item.model}`, detail: `${item.registrationNumber} · ${item.condition}`, status: item.condition, href: '/app/fleet' })),
      ...customers.map((item) => ({ id: item.id, type: 'Customer' as const, title: item.fullName, detail: item.phone, status: item.status, href: '/app/customers' })),
      ...reservations.map((item) => ({ id: item.id, type: 'Reservation' as const, title: item.customerName, detail: `${item.vehicle.make} ${item.vehicle.model} · ${item.vehicle.registrationNumber} · ${item.startAt.toISOString()}`, status: item.status, href: '/app/reservations' })),
      ...rentals.map((item) => ({ id: item.id, type: 'Rental' as const, title: item.customerName, detail: `${item.vehicle.make} ${item.vehicle.model} · ${item.vehicle.registrationNumber} · returns ${item.expectedReturnAt.toISOString()}`, status: item.status, href: '/app/rentals' })),
    ];
    return { results: results.slice(0, 20) };
  }
}
