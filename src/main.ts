/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  //app.enableCors();
  //pour hebergement sur render
  app.enableCors({
    origin: [
      'http://localhost:4200',
    'https://delivereasee.vercel.app', //  domaine de prod stable
    /\.vercel\.app$/                                // autorise tous les previews Vercel
  ],
    credentials: true,
  });
  await app.listen(process.env.PORT || 3000);
  console.log('Server started');
}

bootstrap();
