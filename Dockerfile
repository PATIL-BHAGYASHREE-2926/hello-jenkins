
FROM nginx:alpine
COPY deploypulse/ /usr/share/nginx/html/
EXPOSE 80
