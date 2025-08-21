# Use Node.js 22 as the base image
FROM node:22.6.0-alpine

# Set the working directory in the container
WORKDIR /app

# Install curl
RUN apk add --no-cache curl

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Use an environment variable for the port, defaulting to 3000
ENV PORT=3000

# Expose the port that Next.js runs on
EXPOSE ${PORT}

# Start the application, passing the PORT environment variable
CMD ["sh", "-c", "npm start -- -p ${PORT}"]