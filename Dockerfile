# Base image with Bun
FROM oven/bun:latest as build

# Set the working directory inside the container
WORKDIR /app

# Copy the application files into the container
COPY . .

# Install dependencies
RUN bun install

# Build the application
RUN bun run build

# Expose the desired port
EXPOSE 3000

# Command to start the application
CMD ["bun", "run", "start"]
