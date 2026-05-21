FROM golang:1.21-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY server/go.mod server/go.sum ./
RUN go mod download

COPY server/ ./
RUN go build -o server cmd/server/main.go

FROM alpine:latest

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /app/server .
COPY --from=builder /app/config ./config
COPY --from=builder /app/static ./static

EXPOSE 8080

ENV TZ=Asia/Shanghai
ENV GIN_MODE=release

CMD ["./server"]