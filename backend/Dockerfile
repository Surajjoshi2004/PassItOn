# Production image: dependencies and application are copied separately for better caching.
FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

# Do not run the API as root.
USER node
EXPOSE 5000

CMD ["node", "src/server.js"]
