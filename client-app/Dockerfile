FROM golang:1.21-alpine
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o main

ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.9.0/wait .
RUN chmod +x wait

CMD /app/wait && /app/main