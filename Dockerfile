# Dockerfile for Next.js Application

# 1. Builder stage
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy dependency files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application source code
COPY . .

# Build the Next.js application
RUN pnpm run build

# 2. Production stage
FROM node:20-alpine AS runner

# Install pnpm in production stage
RUN npm install -g pnpm

WORKDIR /app

# Copy the built application from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml* ./
COPY --from=builder /app/public ./public

# Expose the port Next.js runs on
EXPOSE 3000

# Set the command to start the application using pnpm
CMD ["pnpm", "start"]