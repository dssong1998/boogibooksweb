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
      'https://boogibooks.com',
      'http://boogibooks.com',
    ],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000, () =>
    console.log(`Server is running on port ${process.env.PORT ?? 3000}`),
  );
}
void bootstrap();
