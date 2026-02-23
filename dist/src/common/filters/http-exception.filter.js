"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const error_messages_1 = require("../constants/error-messages");
let AllExceptionsFilter = class AllExceptionsFilter {
    logger = new common_1.Logger('ExceptionFilter');
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = error_messages_1.ErrorMessages.common.internalError;
        if (exception instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            message = (0, error_messages_1.getPrismaErrorMessage)(exception);
            switch (exception.code) {
                case 'P2002':
                    status = common_1.HttpStatus.CONFLICT;
                    break;
                case 'P2003':
                    status = common_1.HttpStatus.CONFLICT;
                    break;
                case 'P2025':
                    status = common_1.HttpStatus.NOT_FOUND;
                    break;
                case 'P2014':
                    status = common_1.HttpStatus.CONFLICT;
                    break;
                default:
                    status = common_1.HttpStatus.BAD_REQUEST;
                    this.logger.error(`Unknown Prisma error code: ${exception.code}, meta: ${JSON.stringify(exception.meta)}`);
            }
        }
        else if (exception instanceof client_1.Prisma.PrismaClientValidationError) {
            status = common_1.HttpStatus.BAD_REQUEST;
            const errorLines = exception.message.split('\n');
            const validationMessage = errorLines.slice(-3).join(' ').trim();
            message = validationMessage || error_messages_1.ErrorMessages.common.validationFailed;
            this.logger.error(`Prisma validation error: ${exception.message}`);
        }
        else if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            message =
                typeof exceptionResponse === 'string'
                    ? exceptionResponse
                    : exceptionResponse.message || exception.message;
        }
        else if (exception instanceof Error) {
            if (exception.message.includes('Invalid `this.prisma')) {
                message = error_messages_1.ErrorMessages.database.foreignKeyViolation;
                status = common_1.HttpStatus.CONFLICT;
            }
            else {
                message = exception.message;
            }
        }
        const messageStr = Array.isArray(message) ? message.join('; ') : message;
        const logMessage = `${request.method} ${request.url} - ${status} - ${messageStr}`;
        if (status >= 500) {
            this.logger.error(logMessage, exception instanceof Error ? exception.stack : '');
        }
        else if (status >= 400) {
            this.logger.warn(logMessage);
            if (exception instanceof Error) {
                this.logger.debug(`Error details: ${exception.message}`);
            }
        }
        response.status(status).json({
            success: false,
            statusCode: status,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=http-exception.filter.js.map