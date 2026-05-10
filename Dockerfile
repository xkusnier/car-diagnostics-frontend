# Build faza pouziva Node iba na zostavenie React aplikacie.
FROM node:20-alpine AS build

# Pracovny adresar v kontajneri pre zdrojove subory frontendu.
WORKDIR /app

# Build argumenty umoznuju zmenit backend adresy bez upravy kodu.
ARG REACT_APP_API_URL=http://localhost:5000
ARG REACT_APP_WS_URL=http://localhost:5000

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL

# Package subory sa kopiruju skor, aby Docker vedel vyuzit cache instalacie.
COPY package*.json ./

# Legacy peer deps ostava kvoli kompatibilite zavislosti projektu.
RUN npm install --legacy-peer-deps

# Po instalacii zavislosti sa doplnia zvysne zdrojove subory.
COPY . .

# Produkcny build vytvori staticke subory do priecinka build.
RUN npm run build


# Runtime image uz nepotrebuje Node, iba nginx na servovanie statickych suborov.
FROM nginx:alpine

# Do nginx image sa kopiruje iba hotovy build.
COPY --from=build /app/build /usr/share/nginx/html

# Vlastna nginx konfiguracia riesi hlavne SPA fallback.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Kontajner zverejnuje HTTP port.
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
