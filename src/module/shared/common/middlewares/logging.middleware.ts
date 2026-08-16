import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();
    const isProduction = process.env.NODE_ENV === 'production';

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length');
      const responseTime = Date.now() - startTime;

      if (isProduction) {
        // Obscure IP in production or log minimally
        const secureIp = ip ? ip.replace(/\.\d+$/, '.***') : '';
        this.logger.log(
          `[${method}] ${originalUrl} ${statusCode} - ${responseTime}ms - IP: ${secureIp}`,
        );
      } else {
        // Verbose logging in development
        this.logger.log(
          `[${method}] ${originalUrl} ${statusCode} ${contentLength} - ${userAgent} ${ip} - ${responseTime}ms`,
        );
      }
    });

    next();
  }
}
