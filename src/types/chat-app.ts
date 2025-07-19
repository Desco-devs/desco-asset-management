export enum RoomType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  SYSTEM = 'SYSTEM',
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  description?: string;
  avatar_url?: string;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: Date;
  last_read?: Date;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  type: MessageType;
  file_url?: string;
  reply_to_id?: string;
  edited_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface RoomInvitation {
  id: string;
  room_id: string;
  invited_by: string;
  invited_user: string;
  status: InvitationStatus;
  message?: string;
  created_at: Date;
  responded_at?: Date;
}

export interface RoomWithRelations extends Room {
  owner: {
    id: string;
    username: string;
    full_name: string;
    user_profile?: string;
  };
  members: (RoomMember & {
    user: {
      id: string;
      username: string;
      full_name: string;
      user_profile?: string;
    };
  })[];
  messages: (Message & {
    sender: {
      id: string;
      username: string;
      full_name: string;
      user_profile?: string;
    };
    reply_to?: Message;
  })[];
  _count?: {
    members: number;
    messages: number;
  };
}

export interface MessageWithRelations extends Message {
  sender: {
    id: string;
    username: string;
    full_name: string;
    user_profile?: string;
  };
  room: {
    id: string;
    name: string;
    type: RoomType;
  };
  reply_to?: MessageWithRelations;
  replies?: MessageWithRelations[];
}

export interface RoomInvitationWithRelations extends RoomInvitation {
  room: {
    id: string;
    name: string;
    type: RoomType;
    avatar_url?: string;
  };
  inviter: {
    id: string;
    username: string;
    full_name: string;
    user_profile?: string;
  };
  invitee: {
    id: string;
    username: string;
    full_name: string;
    user_profile?: string;
  };
}

export interface CreateRoomData {
  name: string;
  type: RoomType;
  description?: string;
  avatar_url?: string;
}

export interface UpdateRoomData {
  name?: string;
  description?: string;
  avatar_url?: string;
}

export interface SendMessageData {
  room_id: string;
  content: string;
  type?: MessageType;
  file_url?: string;
  reply_to_id?: string;
}

export interface EditMessageData {
  id: string;
  content: string;
}

export interface SendInvitationData {
  room_id: string;
  invited_user: string;
  message?: string;
}

export interface RespondToInvitationData {
  invitation_id: string;
  status: InvitationStatus.ACCEPTED | InvitationStatus.DECLINED;
}

export interface ChatUser {
  id: string;
  username: string;
  full_name: string;
  user_profile?: string;
  user_status: 'ACTIVE' | 'INACTIVE';
  role: 'VIEWER' | 'ADMIN' | 'SUPERADMIN';
}

export interface SocketEvents {
  'room:join': (roomId: string) => void;
  'room:leave': (roomId: string) => void;
  'message:send': (data: SendMessageData) => void;
  'message:edit': (data: EditMessageData) => void;
  'message:delete': (messageId: string) => void;
  'typing:start': (roomId: string) => void;
  'typing:stop': (roomId: string) => void;
  'room:create': (data: CreateRoomData) => void;
  'room:update': (roomId: string, data: UpdateRoomData) => void;
  'invitation:send': (data: SendInvitationData) => void;
  'invitation:respond': (data: RespondToInvitationData) => void;
  'member:remove': (roomId: string, userId: string) => void;
}

export interface SocketListeners {
  'message:new': (message: MessageWithRelations) => void;
  'message:updated': (message: MessageWithRelations) => void;
  'message:deleted': (messageId: string, roomId: string) => void;
  'room:created': (room: RoomWithRelations) => void;
  'room:updated': (room: RoomWithRelations) => void;
  'room:deleted': (roomId: string) => void;
  'member:added': (roomId: string, member: RoomMember & { user: ChatUser }) => void;
  'member:removed': (roomId: string, userId: string) => void;
  'invitation:received': (invitation: RoomInvitationWithRelations) => void;
  'invitation:updated': (invitation: RoomInvitationWithRelations) => void;
  'user:typing': (roomId: string, user: ChatUser) => void;
  'user:stopped_typing': (roomId: string, userId: string) => void;
  'user:online': (userId: string) => void;
  'user:offline': (userId: string) => void;
  'error': (error: { message: string; code?: string }) => void;
}

export interface RoomListItem {
  id: string;
  name: string;
  type: RoomType;
  avatar_url?: string;
  lastMessage?: {
    content: string;
    sender_name: string;
    created_at: Date;
    type: MessageType;
  };
  unread_count: number;
  is_owner: boolean;
  member_count: number;
}

export interface UserSearchResult {
  id: string;
  username: string;
  full_name: string;
  user_profile?: string;
  user_status: 'ACTIVE' | 'INACTIVE';
}

export interface PaginatedMessages {
  messages: MessageWithRelations[];
  has_more: boolean;
  next_cursor?: string;
}

export interface PaginatedRooms {
  rooms: RoomListItem[];
  has_more: boolean;
  next_cursor?: string;
}

export interface TypingIndicator {
  room_id: string;
  users: ChatUser[];
}

export interface OnlineStatus {
  user_id: string;
  is_online: boolean;
  last_seen?: Date;
}

export interface ChatNotification {
  id: string;
  type: 'message' | 'invitation' | 'mention';
  room_id?: string;
  message?: string;
  from_user: ChatUser;
  created_at: Date;
  read: boolean;
}