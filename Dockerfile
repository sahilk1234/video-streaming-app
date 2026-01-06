FROM node:20-alpine

WORKDIR /app
RUN apk add --no-cache ffmpeg openssl

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
