# Use an official Node.js runtime as a parent image
FROM node:20-bullseye

# Install curl and bash
RUN apt-get update && apt-get install -y curl bash

# Set environment variables
ENV NODE_ENV=production

# Set the working directory
WORKDIR /app

# Copy package.json, bun.lockb, deploy.sh, and entrypoint.sh to the working directory
COPY package.json bun.lockb deploy.sh entrypoint.sh ./

# Run the deploy.sh script with bash
RUN /bin/bash ./deploy.sh

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Use entrypoint.sh to ensure Bun is used for running commands
ENTRYPOINT ["/bin/bash", "./entrypoint.sh"]

# Define the command to run the app
CMD ["bun", "run", "start"]
