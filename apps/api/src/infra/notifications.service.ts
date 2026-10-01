import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { PrismaService } from './prisma.service';
import { appLogger } from './app.logger';
export type Channel = 'IN_APP' | 'EMAIL' | 'WHATSAPP' | 'SMS';
export type EventName = 'PASSWORD_RESET' | 'EMAIL_VERIFICATION' | 'INVITATION' | 'SUBSCRIPTION_REVIEW' | 'CONTACT_DEMO' | 'RENTAL_EXTENSION_REQUEST' | 'RENTAL_EXTENSION_REVIEW';
export type Notice = { event: EventName; channel: Channel; recipient: string; subject: string; text: string; businessId?: string };
export interface ChannelProvider { readonly channel: Channel; deliver(message: Notice): Promise<void>; }
export const developmentMailbox: Notice[] = [];
export class EmailChannelProvider implements ChannelProvider {
 readonly channel = 'EMAIL' as const;
 async deliver(message: Notice) {
  if (process.env.NODE_ENV !== 'production' && (!process.env.SMTP_HOST || !process.env.SMTP_USER)) { developmentMailbox.push(message); return; }
  const port = Number(process.env.SMTP_PORT ?? 587);
  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } });
  await transport.sendMail({ from: process.env.SMTP_FROM, to: message.recipient, subject: message.subject, text: message.text });
 }
}
export class DatabaseInAppProvider implements ChannelProvider {
 readonly channel = 'IN_APP' as const;
 async deliver(_message: Notice) {}
}
@Injectable()
export class NotificationsService {
 private readonly providers: ChannelProvider[];
 constructor(private readonly prisma: PrismaService) { this.providers = [new EmailChannelProvider(), new DatabaseInAppProvider()]; }
 async dispatch(message: Notice) {
  const record = await this.prisma.notification.create({ data: { businessId: message.businessId, recipientUserId: message.channel === 'IN_APP' ? message.recipient : undefined, event: message.event, channel: message.channel, status: 'QUEUED', title: message.channel === 'IN_APP' ? message.subject : undefined, message: message.channel === 'IN_APP' ? message.text : undefined } });
  const provider = this.providers.find((candidate) => candidate.channel === message.channel);
  if (!provider) return { status: 'QUEUED' as const };
  try {
   await provider.deliver(message);
   await this.prisma.notification.update({ where: { id: record.id }, data: { status: 'DELIVERED' } });
   return { status: 'DELIVERED' as const };
  } catch (error) {
   await this.prisma.notification.update({ where: { id: record.id }, data: { status: 'FAILED' } });
   appLogger.error({ event: 'notification_delivery_failed', notificationId: record.id, notificationEvent: message.event, channel: message.channel });
   throw error;
  }
 }

 async listFor(actor: { userId: string; accountType: string; businessId?: string }) {
  if (actor.accountType === 'PLATFORM') throw new ForbiddenException();
  if (actor.accountType === 'BUSINESS' && !actor.businessId) throw new ConflictException('Choose an active business workspace.');
  return this.prisma.notification.findMany({
   where: { recipientUserId: actor.userId, ...(actor.accountType === 'BUSINESS' ? { businessId: actor.businessId } : {}) },
   select: { id: true, event: true, status: true, title: true, message: true, readAt: true, createdAt: true },
   orderBy: { createdAt: 'desc' }, take: 50,
  });
 }

 async markRead(actor: { userId: string; accountType: string; businessId?: string }, id: string) {
  if (actor.accountType === 'PLATFORM') throw new ForbiddenException();
  if (actor.accountType === 'BUSINESS' && !actor.businessId) throw new ConflictException('Choose an active business workspace.');
  const result = await this.prisma.notification.updateMany({ where: { id, recipientUserId: actor.userId, ...(actor.accountType === 'BUSINESS' ? { businessId: actor.businessId } : {}), readAt: null }, data: { readAt: new Date() } });
  if (!result.count) {
   const owned = await this.prisma.notification.count({ where: { id, recipientUserId: actor.userId, ...(actor.accountType === 'BUSINESS' ? { businessId: actor.businessId } : {}) } });
   if (!owned) throw new NotFoundException('Notification not found.');
  }
  return { read: true };
 }
}
