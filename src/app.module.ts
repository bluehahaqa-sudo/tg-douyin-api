import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './shared/prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { UserModule } from './modules/user/user.module'
import { VideoModule } from './modules/video/video.module'
import { SocialModule } from './modules/social/social.module'
import { WalletModule } from './modules/wallet/wallet.module'
import { MessageModule } from './modules/message/message.module'

@Module({
  imports: [
    // 环境配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // 数据库
    PrismaModule,
    // 业务模块
    AuthModule,
    UserModule,
    VideoModule,
    SocialModule,
    WalletModule,
    MessageModule,
  ],
})
export class AppModule {}
