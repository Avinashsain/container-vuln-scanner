FROM node:18-alpine AS base

WORKDIR /app/chatService

COPY chatService/package*.json ./
RUN npm install --production

COPY chatService/. ./
ENV NODE_ENV=production
EXPOSE 4004

CMD ["npm", "run", "start"]
