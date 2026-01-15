FROM node:20-alpine

WORKDIR /app
RUN apk add --no-cache ffmpeg openssl postgresql-client

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install

COPY . .

RUN chmod +x docker-entrypoint.sh
RUN npm run build

EXPOSE 3000
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
