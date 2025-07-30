import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

// Optimized message queries for real-time performance
export class ChatQueries {
  // Efficient message retrieval with pagination
  static async getMessages({
    roomId,
    cursor,
    limit = 50,
    includeReplies = true,
  }: {
    roomId: string
    cursor?: string
    limit?: number
    includeReplies?: boolean
  }) {
    const whereClause: Prisma.messageWhereInput = {
      room_id: roomId,
      ...(cursor && {
        created_at: {
          lt: new Date(cursor),
        },
      }),
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            full_name: true,
            user_profile: true,
          },
        },
        reply_to: includeReplies ? {
          select: {
            id: true,
            content: true,
            created_at: true,
            sender: {
              select: {
                id: true,
                username: true,
                full_name: true,
              },
            },
          },
        } : false,
        replies: includeReplies ? {
          select: {
            id: true,
            content: true,
            created_at: true,
            sender: {
              select: {
                id: true,
                username: true,
                full_name: true,
              },
            },
          },
          take: 3,
          orderBy: {
            created_at: 'asc',
          },
        } : false,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
    })

    const hasMore = messages.length === limit
    const nextCursor = hasMore ? messages[messages.length - 1].created_at.toISOString() : null

    return {
      messages: messages.reverse(), // Return in chronological order
      hasMore,
      nextCursor,
    }
  }

  // Optimized room listing with unread counts
  static async getUserRooms(userId: string) {
    // Get rooms where user is a member with a single query
    const memberRooms = await prisma.room.findMany({
      where: {
        members: {
          some: {
            user_id: userId,
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            full_name: true,
            user_profile: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                full_name: true,
                user_profile: true,
                user_status: true,
                role: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            created_at: 'desc',
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                full_name: true,
                user_profile: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: [
        {
          updated_at: 'desc',
        },
      ],
    })

    // Calculate unread counts efficiently
    const roomsWithUnreadCount = await Promise.all(
      memberRooms.map(async (room) => {
        const userMembership = room.members.find(member => member.user_id === userId)
        const lastRead = userMembership?.last_read || new Date(0)
        
        const unreadCount = await prisma.message.count({
          where: {
            room_id: room.id,
            created_at: {
              gt: lastRead,
            },
            sender_id: {
              not: userId,
            },
          },
        })
        
        return { ...room, unread_count: unreadCount }
      })
    )

    return roomsWithUnreadCount
  }

  // Optimized pending invitations query
  static async getPendingInvitations(userId: string) {
    return await prisma.room_invitation.findMany({
      where: {
        invited_user: userId,
        status: 'PENDING',
      },
      include: {
        room: {
          include: {
            owner: {
              select: {
                id: true,
                username: true,
                full_name: true,
                user_profile: true,
              },
            },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    full_name: true,
                    user_profile: true,
                    user_status: true,
                    role: true,
                  },
                },
              },
            },
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
        inviter: {
          select: {
            id: true,
            username: true,
            full_name: true,
            user_profile: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    })
  }

  // Efficient room membership verification
  static async verifyRoomMembership(roomId: string, userId: string) {
    const membership = await prisma.room_member.findFirst({
      where: {
        room_id: roomId,
        user_id: userId,
      },
      select: {
        id: true,
        last_read: true,
        joined_at: true,
        room: {
          select: {
            id: true,
            name: true,
            type: true,
            owner_id: true,
          },
        },
      },
    })

    return membership
  }

  // Bulk unread count calculation
  static async getBulkUnreadCounts(userId: string, roomIds: string[]) {
    const memberships = await prisma.room_member.findMany({
      where: {
        user_id: userId,
        room_id: {
          in: roomIds,
        },
      },
      select: {
        room_id: true,
        last_read: true,
      },
    })

    const unreadCounts = await Promise.all(
      memberships.map(async (membership) => {
        const lastRead = membership.last_read || new Date(0)
        const count = await prisma.message.count({
          where: {
            room_id: membership.room_id,
            created_at: {
              gt: lastRead,
            },
            sender_id: {
              not: userId,
            },
          },
        })

        return {
          roomId: membership.room_id,
          unreadCount: count,
        }
      })
    )

    return unreadCounts.reduce((acc, { roomId, unreadCount }) => {
      acc[roomId] = unreadCount
      return acc
    }, {} as Record<string, number>)
  }

  // Efficient message creation with room update
  static async createMessage({
    roomId,
    senderId,
    content,
    type = 'TEXT',
    replyToId,
    fileUrl,
  }: {
    roomId: string
    senderId: string
    content: string
    type?: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM'
    replyToId?: string | null
    fileUrl?: string | null
  }) {
    return await prisma.$transaction(async (tx) => {
      // Create the message
      const message = await tx.message.create({
        data: {
          room_id: roomId,
          sender_id: senderId,
          content: content.trim(),
          type,
          reply_to_id: replyToId || null,
          file_url: fileUrl || null,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              full_name: true,
              user_profile: true,
            },
          },
          room: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          reply_to: {
            select: {
              id: true,
              content: true,
              sender: {
                select: {
                  id: true,
                  username: true,
                  full_name: true,
                },
              },
            },
          },
        },
      })

      // Update room's updated_at timestamp for sorting
      await tx.room.update({
        where: { id: roomId },
        data: { updated_at: new Date() },
      })

      return message
    })
  }

  // Efficient room creation with members
  static async createRoom({
    name,
    description,
    type,
    ownerId,
    avatarUrl,
    memberIds = [],
  }: {
    name: string
    description?: string | null
    type: 'DIRECT' | 'GROUP'
    ownerId: string
    avatarUrl?: string | null
    memberIds?: string[]
  }) {
    return await prisma.$transaction(async (tx) => {
      // Create the room
      const room = await tx.room.create({
        data: {
          name,
          description,
          type,
          owner_id: ownerId,
          avatar_url: avatarUrl,
        },
      })

      // Add owner as member
      await tx.room_member.create({
        data: {
          room_id: room.id,
          user_id: ownerId,
        },
      })

      // Add other members
      if (memberIds.length > 0) {
        const memberData = memberIds
          .filter(id => id !== ownerId) // Avoid duplicating owner
          .map(userId => ({
            room_id: room.id,
            user_id: userId,
          }))

        if (memberData.length > 0) {
          await tx.room_member.createMany({
            data: memberData,
            skipDuplicates: true,
          })
        }
      }

      return room
    })
  }

  // Efficient invitation response handling
  static async respondToInvitation({
    invitationId,
    userId,
    action,
  }: {
    invitationId: string
    userId: string
    action: 'ACCEPTED' | 'DECLINED'
  }) {
    return await prisma.$transaction(async (tx) => {
      // Find and update invitation
      const invitation = await tx.room_invitation.findFirst({
        where: {
          id: invitationId,
          invited_user: userId,
          status: 'PENDING',
        },
        include: {
          room: {
            select: {
              id: true,
              name: true,
              type: true,
              owner_id: true,
            },
          },
        },
      })

      if (!invitation) {
        throw new Error('Invitation not found or already responded to')
      }

      // Update invitation status
      const updatedInvitation = await tx.room_invitation.update({
        where: { id: invitationId },
        data: { 
          status: action,
          responded_at: new Date(),
        },
      })

      if (action === 'ACCEPTED') {
        // Add user to room members
        await tx.room_member.create({
          data: {
            room_id: invitation.room.id,
            user_id: userId,
          },
        })

        // Create system message
        await tx.message.create({
          data: {
            room_id: invitation.room.id,
            sender_id: userId,
            content: 'joined the room',
            type: 'SYSTEM',
          },
        })
      } else if (action === 'DECLINED' && invitation.room.type === 'DIRECT') {
        // For DIRECT rooms, check if we should delete the room
        const memberCount = await tx.room_member.count({
          where: { room_id: invitation.room.id },
        })

        if (memberCount <= 1) {
          // Delete room and all related data
          await tx.message.deleteMany({
            where: { room_id: invitation.room.id },
          })
          await tx.room_member.deleteMany({
            where: { room_id: invitation.room.id },
          })
          await tx.room_invitation.deleteMany({
            where: { room_id: invitation.room.id },
          })
          await tx.room.delete({
            where: { id: invitation.room.id },
          })

          return { invitation: updatedInvitation, room: invitation.room, roomDeleted: true }
        }
      }

      return { invitation: updatedInvitation, room: invitation.room, roomDeleted: false }
    })
  }

  // Efficient mark as read operation
  static async markMessagesAsRead(roomId: string, userId: string) {
    const membership = await prisma.room_member.findFirst({
      where: {
        room_id: roomId,
        user_id: userId,
      },
    })

    if (!membership) {
      throw new Error('User is not a member of this room')
    }

    await prisma.room_member.update({
      where: {
        id: membership.id,
      },
      data: {
        last_read: new Date(),
      },
    })

    return { success: true }
  }

  // Search messages efficiently
  static async searchMessages({
    query,
    roomId,
    senderId,
    messageType,
    dateFrom,
    dateTo,
    limit = 20,
    offset = 0,
  }: {
    query: string
    roomId?: string
    senderId?: string
    messageType?: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM'
    dateFrom?: Date
    dateTo?: Date
    limit?: number
    offset?: number
  }) {
    const whereClause: Prisma.messageWhereInput = {
      content: {
        contains: query,
        mode: 'insensitive',
      },
      ...(roomId && { room_id: roomId }),
      ...(senderId && { sender_id: senderId }),
      ...(messageType && { type: messageType }),
      ...(dateFrom || dateTo) && {
        created_at: {
          ...(dateFrom && { gte: dateFrom }),
          ...(dateTo && { lte: dateTo }),
        },
      },
    }

    const [messages, totalCount] = await Promise.all([
      prisma.message.findMany({
        where: whereClause,
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              full_name: true,
              user_profile: true,
            },
          },
          room: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.message.count({
        where: whereClause,
      }),
    ])

    return {
      messages,
      totalCount,
      hasMore: offset + messages.length < totalCount,
    }
  }

  // Get typing users for a room
  static async getTypingUsers(roomId: string) {
    // In a real implementation, this would likely use Redis or another in-memory store
    // For now, we'll return a placeholder that can be extended with real-time functionality
    return []
  }

  // Update user presence
  static async updateUserPresence(userId: string, isOnline: boolean) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        is_online: isOnline,
        last_seen: isOnline ? new Date() : undefined,
      },
      select: {
        id: true,
        is_online: true,
        last_seen: true,
      },
    })
  }
}

// Export individual functions for backwards compatibility
export const {
  getMessages,
  getUserRooms,
  getPendingInvitations,
  verifyRoomMembership,
  getBulkUnreadCounts,
  createMessage,
  createRoom,
  respondToInvitation,
  markMessagesAsRead,
  searchMessages,
  getTypingUsers,
  updateUserPresence,
} = ChatQueries