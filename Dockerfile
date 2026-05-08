# Build stage
FROM node:24-slim AS builder

WORKDIR /app

# Build-time args for Vite (VITE_* variables are baked in at compile time)
ARG VITE_MSAL_CLIENT_ID
ARG VITE_MSAL_TENANT_ID
ENV VITE_MSAL_CLIENT_ID=$VITE_MSAL_CLIENT_ID
ENV VITE_MSAL_TENANT_ID=$VITE_MSAL_TENANT_ID

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production

# Copy built assets and server code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

# Expose the port (matches process.env.PORT || 3001 in server/index.ts)
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
