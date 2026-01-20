import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정
  app.enableCors({
    origin: [
      'http://localhost:8080',
      'https://localhost:8080',
      'http://boogibooks.com',
      'https://boogibooks.com',
      'http://www.boogibooks.com',
      'https://www.boogibooks.com',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
  });

  await app.listen(process.env.PORT ?? 3000, () =>
    console.log(`Server is running on port ${process.env.PORT ?? 3000}`),
  );
}
void bootstrap();
