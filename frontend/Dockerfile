# --- Stage 1: Build the React App ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# ARGS for Build Time Environment Variables
# We need to pass the backend URL in during the build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build (creates /dist folder)
RUN npm run build

# --- Stage 2: Serve with Nginx ---
FROM nginx:alpine

# Copy the build output from Stage 1 to Nginx html folder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]