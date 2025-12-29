FROM node:20-alpine AS builder

WORKDIR /app

# 复制 package files
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖
RUN npm ci

# 生成 Prisma Client
RUN npx prisma generate

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产镜像
FROM node:20-alpine AS production

WORKDIR /app

# 复制必要文件
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# 设置环境变量
ENV NODE_ENV=production

# 暴露端口
EXPOSE 3002

# 启动命令
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
