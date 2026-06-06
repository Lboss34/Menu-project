# --- Build Stage ---
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package configurations
COPY package*.json ./

# Install all dependencies (development + production) for the build step
RUN npm install

# Copy all source files
COPY . .

# Build both Vite frontend and esbuild Express server
RUN npm run build

# --- Production Stage ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy package file and install only production dependencies to keep the image compact
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled assets from output folder (contains front-end dist and dist/server.cjs)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

# Expose the default port (Back4App default is 8080)
EXPOSE 8080

# Start command
CMD ["npm", "start"]
