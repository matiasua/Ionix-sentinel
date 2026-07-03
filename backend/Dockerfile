FROM node:20-alpine

# git: usado por scan/gitRepo.ts para listar/clonar ramas reales del repo en
# la rama "live-scan" (git ls-remote + clone --depth 1), no viene en la
# imagen base de Alpine.
RUN apk add --no-cache git

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

EXPOSE 3000

CMD ["npm", "run", "dev"]
