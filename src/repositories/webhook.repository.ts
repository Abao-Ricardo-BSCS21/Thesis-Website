import prisma from "@/lib/prisma";
import { WebhookChannel, WebhookEvent, Prisma } from "@prisma/client";
import type { WebhookCreateInput, WebhookUpdateInput } from "@/validators/webhook.validators";

export class WebhookRepository {
  async findAll(channel?: WebhookChannel) {
    return prisma.webhookEndpoint.findMany({
      where: channel ? { channel } : undefined,
      orderBy: [{ channel: "asc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { logs: true } },
      },
    });
  }

  async findById(id: string) {
    return prisma.webhookEndpoint.findUnique({
      where: { id },
      include: {
        logs: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
  }

  async findActiveForEvent(channel: WebhookChannel, event: WebhookEvent) {
    const all = await prisma.webhookEndpoint.findMany({
      where: { channel, isActive: true },
    });
    return all.filter((w) => {
      const events = w.events as WebhookEvent[];
      return Array.isArray(events) && events.includes(event);
    });
  }

  async findPrimary(channel: WebhookChannel, event: WebhookEvent) {
    const hooks = await this.findActiveForEvent(channel, event);
    return hooks.find((w) => w.isPrimary) ?? null;
  }

  async create(data: WebhookCreateInput) {
    if (data.isPrimary) {
      await this.clearPrimary(data.channel);
    }
    return prisma.webhookEndpoint.create({
      data: {
        name: data.name,
        channel: data.channel,
        url: data.url,
        secret: data.secret || null,
        events: data.events as unknown as Prisma.InputJsonValue,
        description: data.description || null,
        isActive: data.isActive,
        isPrimary: data.isPrimary,
      },
    });
  }

  async update(id: string, data: WebhookUpdateInput) {
    const existing = await prisma.webhookEndpoint.findUnique({ where: { id } });
    if (!existing) return null;

    if (data.isPrimary) {
      await this.clearPrimary(data.channel ?? existing.channel, id);
    }

    return prisma.webhookEndpoint.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.channel !== undefined && { channel: data.channel }),
        ...(data.url !== undefined && { url: data.url }),
        ...(data.secret !== undefined && { secret: data.secret || null }),
        ...(data.events !== undefined && {
          events: data.events as unknown as Prisma.InputJsonValue,
        }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
      },
    });
  }

  async delete(id: string) {
    return prisma.webhookEndpoint.delete({ where: { id } });
  }

  async updateLastRun(id: string, status: string) {
    return prisma.webhookEndpoint.update({
      where: { id },
      data: { lastTriggeredAt: new Date(), lastStatus: status },
    });
  }

  async createLog(data: {
    webhookId: string;
    event: WebhookEvent;
    status: string;
    statusCode?: number;
    response?: string;
    payload?: Record<string, unknown>;
  }) {
    return prisma.webhookLog.create({
      data: {
        webhookId: data.webhookId,
        event: data.event,
        status: data.status,
        statusCode: data.statusCode,
        response: data.response?.slice(0, 4000),
        payload: data.payload as Prisma.InputJsonValue,
      },
    });
  }

  private async clearPrimary(channel: WebhookChannel, exceptId?: string) {
    await prisma.webhookEndpoint.updateMany({
      where: {
        channel,
        isPrimary: true,
        ...(exceptId && { id: { not: exceptId } }),
      },
      data: { isPrimary: false },
    });
  }
}

export const webhookRepository = new WebhookRepository();
