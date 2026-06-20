# Build context: repo root (workspace-aware)

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock ./
COPY services/backend/package.json ./services/backend/
COPY services/frontend/package.json ./services/frontend/
RUN yarn install --frozen-lockfile

FROM node:22-alpine AS dev
WORKDIR /app/services/frontend
ENV NODE_ENV=development
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/services /app/services
COPY services/frontend /app/services/frontend
EXPOSE 5173
CMD ["yarn", "dev", "--host", "0.0.0.0"]

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services ./services
COPY services/frontend ./services/frontend
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN yarn workspace url-shortener-frontend build

FROM nginx:alpine AS prod
COPY --from=build /app/services/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
