# Use the official Node.js image as the base image
FROM node:21-alpine

# Set the working directory in the container
WORKDIR /server

# Copy package.json and package-lock.json to the working directory
COPY package.json package-lock.json ./


# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app will run on
EXPOSE 9003

# Command to run the application
CMD ["npm","run", "start"]