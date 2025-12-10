FROM apify/actor-node-playwright-chrome:20

COPY package*.json ./
RUN npm install --include=optional --no-audit --no-fund

COPY . ./

CMD npm start
