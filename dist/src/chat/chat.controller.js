"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const chat_service_1 = require("./chat.service");
const chat_gateway_1 = require("./chat.gateway");
const dto_1 = require("./dto");
let ChatController = class ChatController {
    chatService;
    chatGateway;
    constructor(chatService, chatGateway) {
        this.chatService = chatService;
        this.chatGateway = chatGateway;
    }
    async getRooms(companyId, req) {
        return this.chatService.getRooms(companyId, req.user.id);
    }
    async getOrCreateDirectRoom(companyId, otherUserId, req) {
        return this.chatService.getOrCreateDirectRoom(companyId, req.user.id, otherUserId);
    }
    async createGroupRoom(companyId, dto, req) {
        return this.chatService.createGroupRoom(companyId, req.user.id, dto);
    }
    async getMessages(companyId, roomId, page = '1', limit = '50', req) {
        return this.chatService.getMessages(companyId, req.user.id, roomId, parseInt(page), parseInt(limit));
    }
    async sendMessage(companyId, roomId, dto, req) {
        const message = await this.chatService.sendMessage(companyId, req.user.id, roomId, dto.content);
        const participantIds = await this.chatService.getRoomParticipantIds(roomId);
        for (const participantId of participantIds) {
            const userChannel = `user:${companyId}:${participantId}`;
            this.chatGateway.server.to(userChannel).emit('newMessage', message);
            this.chatGateway.server.to(userChannel).emit('roomUpdated', {
                roomId,
                lastMessage: message,
            });
        }
        return message;
    }
    async editMessage(messageId, dto, req) {
        return this.chatService.editMessage(req.user.id, messageId, dto.content);
    }
    async deleteMessage(messageId, req) {
        return this.chatService.deleteMessage(req.user.id, messageId);
    }
    async getCompanyUsers(companyId) {
        return this.chatService.getCompanyUsers(companyId);
    }
    async markAsRead(roomId, req) {
        await this.chatService.markAsRead(roomId, req.user.id);
        return { success: true };
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Get)('rooms'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getRooms", null);
__decorate([
    (0, common_1.Post)('rooms/direct/:otherUserId'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('otherUserId')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getOrCreateDirectRoom", null);
__decorate([
    (0, common_1.Post)('rooms/group'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateRoomDto, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "createGroupRoom", null);
__decorate([
    (0, common_1.Get)('rooms/:roomId/messages'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('roomId')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)('rooms/:roomId/messages'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('roomId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.SendMessageDto, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Patch)('messages/:messageId'),
    __param(0, (0, common_1.Param)('messageId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.SendMessageDto, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "editMessage", null);
__decorate([
    (0, common_1.Delete)('messages/:messageId'),
    __param(0, (0, common_1.Param)('messageId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "deleteMessage", null);
__decorate([
    (0, common_1.Get)('users'),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getCompanyUsers", null);
__decorate([
    (0, common_1.Post)('rooms/:roomId/read'),
    __param(0, (0, common_1.Param)('roomId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "markAsRead", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.Controller)('companies/:companyId/chat'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard),
    __metadata("design:paramtypes", [chat_service_1.ChatService,
        chat_gateway_1.ChatGateway])
], ChatController);
//# sourceMappingURL=chat.controller.js.map