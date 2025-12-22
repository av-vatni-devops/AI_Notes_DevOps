# --- Base Image ----#
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# --- Test stage ----#
FROM base AS test
ENV NODE_ENV=test
CMD [ "npm", "test" ]

# --- Production stage ----#
FROM node:18-alpine AS prod
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY . .
EXPOSE 5000
CMD [ "node", "start.js" ]