import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SharesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all user IDs whose data this user can access (their own ID + accepted partners)
   */
  async getCollaboratorIds(userId: string): Promise<string[]> {
    if (!userId) return [];

    const acceptedShares = await this.prisma.dataShareRequest.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { sender_id: userId },
          { receiver_id: userId }
        ]
      }
    });

    const partnerIds = acceptedShares.map(s => 
      s.sender_id === userId ? s.receiver_id : s.sender_id
    );

    return Array.from(new Set([userId, ...partnerIds]));
  }

  /**
   * Get complete overview of sharing requests (received, sent, active)
   */
  async getSharesOverview(userId: string) {
    // 1. Pending requests received by this user
    const received = await this.prisma.dataShareRequest.findMany({
      where: {
        receiver_id: userId,
        status: 'PENDING'
      },
      include: {
        Sender: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // 2. Pending requests sent by this user
    const sent = await this.prisma.dataShareRequest.findMany({
      where: {
        sender_id: userId,
        status: 'PENDING'
      },
      include: {
        Receiver: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // 3. Active accepted sharing connections
    const active = await this.prisma.dataShareRequest.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { sender_id: userId },
          { receiver_id: userId }
        ]
      },
      include: {
        Sender: {
          select: { id: true, name: true, email: true, role: true }
        },
        Receiver: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: { updated_at: 'desc' }
    });

    // Format active partners
    const activeCollaborators = active.map(share => {
      const isSender = share.sender_id === userId;
      const partner = isSender ? share.Receiver : share.Sender;
      return {
        share_id: share.id,
        connected_at: share.updated_at,
        partner_id: partner.id,
        partner_name: partner.name,
        partner_email: partner.email,
        partner_role: partner.role,
        role_in_request: isSender ? 'INITIATOR' : 'RECIPIENT'
      };
    });

    return {
      receivedRequests: received.map(r => ({
        id: r.id,
        created_at: r.created_at,
        sender_id: r.Sender.id,
        sender_name: r.Sender.name,
        sender_email: r.Sender.email,
        status: r.status
      })),
      sentRequests: sent.map(s => ({
        id: s.id,
        created_at: s.created_at,
        receiver_id: s.Receiver.id,
        receiver_name: s.Receiver.name,
        receiver_email: s.Receiver.email,
        status: s.status
      })),
      activeCollaborators
    };
  }

  /**
   * Send a share request to another user by email
   */
  async sendShareRequest(senderId: string, targetEmail: string) {
    if (!targetEmail || !targetEmail.trim()) {
      throw new BadRequestException('សូមបញ្ចូលអ៊ីមែលដៃគូ (Partner email is required)');
    }

    const cleanEmail = targetEmail.trim().toLowerCase();

    // Check sender
    const sender = await this.prisma.user.findUnique({ where: { id: senderId } });
    if (!sender) {
      throw new NotFoundException('រកមិនឃើញគណនីរបស់អ្នកផ្ញើឡើយ');
    }

    if (sender.email.toLowerCase() === cleanEmail) {
      throw new BadRequestException('អ្នកមិនអាចស្នើសុំចែករំលែកទិន្នន័យជាមួយខ្លួនឯងបានទេ (Cannot share data with yourself)');
    }

    // Find recipient
    const recipient = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!recipient) {
      throw new NotFoundException(`រកមិនឃើញគណនីដែលមានអ៊ីមែល "${cleanEmail}" ក្នុងប្រព័ន្ធឡើយ។ សូមប្រាកដថាគាត់បានចុះឈ្មោះក្នុងប្រព័ន្ធរួចរាល់។`);
    }

    // Check existing request
    const existing = await this.prisma.dataShareRequest.findFirst({
      where: {
        OR: [
          { sender_id: senderId, receiver_id: recipient.id },
          { sender_id: recipient.id, receiver_id: senderId }
        ]
      }
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new ConflictException(`អ្នកនិង ${cleanEmail} កំពុងចែករំលែកទិន្នន័យជាមួយគ្នារួចរាល់ហើយ (Already sharing data)`);
      }
      if (existing.status === 'PENDING') {
        if (existing.sender_id === senderId) {
          throw new ConflictException(`លោកអ្នកបានផ្ញើសំណើទៅកាន់ ${cleanEmail} រួចហើយ សូមរង់ចាំគាត់យល់ព្រម (Request already pending)`);
        } else {
          // If the other party already sent a request to this user, auto-accept it!
          const accepted = await this.prisma.dataShareRequest.update({
            where: { id: existing.id },
            data: { status: 'ACCEPTED' }
          });
          return {
            success: true,
            status: 'ACCEPTED',
            message: `ដៃគូ ${cleanEmail} ធ្លាប់បានផ្ញើសំណើមកអ្នកពីមុន ដូច្នេះប្រព័ន្ធបានភ្ជាប់ការចែករំលែកដោយស្វ័យប្រវត្តិ!`
          };
        }
      }

      // If previously REJECTED, update back to PENDING
      const updated = await this.prisma.dataShareRequest.update({
        where: { id: existing.id },
        data: {
          sender_id: senderId,
          receiver_id: recipient.id,
          status: 'PENDING'
        }
      });
      return {
        success: true,
        status: 'PENDING',
        message: `សំណើចែករំលែកទិន្នន័យត្រូវបានផ្ញើជាថ្មីទៅកាន់ ${cleanEmail}!`
      };
    }

    // Create new request
    await this.prisma.dataShareRequest.create({
      data: {
        sender_id: senderId,
        receiver_id: recipient.id,
        status: 'PENDING'
      }
    });

    return {
      success: true,
      status: 'PENDING',
      message: `សំណើចែករំលែកទិន្នន័យត្រូវបានផ្ញើទៅកាន់ ${cleanEmail} ដោយជោគជ័យ!`
    };
  }

  /**
   * Recipient approves / accepts the share request
   */
  async acceptRequest(requestId: string, userId: string) {
    const request = await this.prisma.dataShareRequest.findUnique({
      where: { id: requestId },
      include: { Sender: true }
    });

    if (!request) {
      throw new NotFoundException('រកមិនឃើញសំណើចែករំលែកនេះទេ');
    }

    if (request.receiver_id !== userId) {
      throw new BadRequestException('អ្នកគ្មានសិទ្ធិយល់ព្រមលើសំណើរបស់អ្នកដទៃឡើយ');
    }

    await this.prisma.dataShareRequest.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' }
    });

    return {
      success: true,
      message: `បានយល់ព្រមចែករំលែកទិន្នន័យជាមួយ ${request.Sender.name} (${request.Sender.email}) រួចរាល់!`
    };
  }

  /**
   * Recipient rejects / declines the share request
   */
  async rejectRequest(requestId: string, userId: string) {
    const request = await this.prisma.dataShareRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new NotFoundException('រកមិនឃើញសំណើចែករំលែកនេះទេ');
    }

    if (request.receiver_id !== userId) {
      throw new BadRequestException('អ្នកគ្មានសិទ្ធិបដិសេធសំណើរបស់អ្នកដទៃឡើយ');
    }

    await this.prisma.dataShareRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' }
    });

    return {
      success: true,
      message: 'បានបដិសេធសំណើចែករំលែកទិន្នន័យ។'
    };
  }

  /**
   * Revoke an active share or cancel a pending request
   */
  async revokeOrCancel(requestId: string, userId: string) {
    const request = await this.prisma.dataShareRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new NotFoundException('រកមិនឃើញសំណើចែករំលែកនេះទេ');
    }

    if (request.sender_id !== userId && request.receiver_id !== userId) {
      throw new BadRequestException('អ្នកគ្មានសិទ្ធិកែប្រែសំណើនេះឡើយ');
    }

    await this.prisma.dataShareRequest.delete({
      where: { id: requestId }
    });

    return {
      success: true,
      message: 'ការចែករំលែកទិន្នន័យត្រូវបានផ្តាច់ចេញពីគ្នាដោយជោគជ័យ។'
    };
  }
}

