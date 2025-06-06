# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json /app/
RUN npm install
COPY . /app
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 3000
CMD ["npm", "start"]
