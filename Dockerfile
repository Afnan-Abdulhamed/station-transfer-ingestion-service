# Development image 
FROM node:22-alpine AS development
WORKDIR /app
ENV NODE_ENV=development
EXPOSE 3000
CMD ["sh", "-c", "npm install && npm run dev"]

# Production image
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY src ./src
USER node
EXPOSE 3000
CMD ["node", "src/index.js"]
