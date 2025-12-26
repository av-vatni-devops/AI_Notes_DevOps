# ---- Base ---- #
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# ---- Test stage ---- #
FROM mcr.microsoft.com/playwright:v1.57.0-jammy AS test
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build frontend
RUN npm run build

# Playwright will hit the preview server
ENV CI=true
EXPOSE 4173

CMD sh -c "npm run preview -- --host & npx playwright test --config=playwright.ci.config.ts"

# ---- Build Stage---- #
FROM base AS build
RUN npm run build

# ---- Production Stage ---- #
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]