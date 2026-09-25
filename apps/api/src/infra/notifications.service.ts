import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { PrismaService } from './prisma.service';
export type Channel = 'IN_APP' | 'EMAIL' | 'WHATSAPP' | 'SMS';
export type EventName = 'PASSWORD_RESET' | 'EMAIL_VERIFICATION' | 'INVITATION' | 'SUBSCRIPTION_REVIEW' | 'CONTACT_DEMO';
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
  const record = await this.prisma.notification.create({ data: { businessId: message.businessId, event: message.event, channel: message.channel, status: 'QUEUED' } });
  const provider = this.providers.find((candidate) => candidate.channel === message.channel);
  if (!provider) return { status: 'QUEUED' as const };
  await provider.deliver(message);
  await this.prisma.notification.update({ where: { id: record.id }, data: { status: 'DELIVERED' } });
  return { status: 'DELIVERED' as const };
 }
}
