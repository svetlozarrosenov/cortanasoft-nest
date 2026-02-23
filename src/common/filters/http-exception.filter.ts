import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { getPrismaErrorMessage, ErrorMessages } from '../constants/error-messages';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = ErrorMessages.common.internalError;

    // Handle Prisma errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      message = getPrismaErrorMessage(exception);

      // Set appropriate status code based on Prisma error
      switch (exception.code) {
        case 'P2002': // Unique constraint
          status = HttpStatus.CONFLICT;
          break;
        case 'P2003': // Foreign key constraint
          status = HttpStatus.CONFLICT;
          break;
        case 'P2025': // Record not found
          status = HttpStatus.NOT_FOUND;
          break;
        case 'P2014': // Required relation violation
          status = HttpStatus.CONFLICT;
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          // Log unknown Prisma errors with more detail
          this.logger.error(
            `Unknown Prisma error code: ${exception.code}, meta: ${JSON.stringify(exception.meta)}`,
          );
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      // Extract the actual validation message from Prisma
      const errorLines = exception.message.split('\n');
      const validationMessage = errorLines.slice(-3).join(' ').trim();
      message = validationMessage || ErrorMessages.common.validationFailed;
      this.logger.error(`Prisma validation error: ${exception.message}`);
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message;
    } else if (exception instanceof Error) {
      // Check if it's a Prisma error that wasn't caught above
      if (exception.message.includes('Invalid `this.prisma')) {
        message = ErrorMessages.database.foreignKeyViolation;
        status = HttpStatus.CONFLICT;
      } else {
        message = exception.message;
      }
    }

    // Log all errors (not just 500s)
    const messageStr = Array.isArray(message) ? message.join('; ') : message;
    const logMessage = `${request.method} ${request.url} - ${status} - ${messageStr}`;

    if (status >= 500) {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : '',
      );
    } else if (status >= 400) {
      this.logger.warn(logMessage);
      // Log more details for debugging 400 errors
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
}
