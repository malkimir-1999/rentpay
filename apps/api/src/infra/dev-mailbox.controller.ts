import { Controller, Get, NotFoundException } from '@nestjs/common';
import { developmentMailbox } from './notifications.service';
@Controller('dev/mailbox') export class DevMailboxController { @Get() messages() { if (process.env.NODE_ENV === 'production') throw new NotFoundException(); return developmentMailbox.map(({ recipient, event, subject, text }) => ({ recipient, event, subject, text })); } }
