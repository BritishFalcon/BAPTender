FROM golang as builder
LABEL authors="Alan"

WORKDIR /app

COPY . .
RUN go mod tidy
RUN go mod download
RUN go build .

FROM ubuntu:latest AS runner
LABEL authors="Alan"

EXPOSE 3001
WORKDIR /app

RUN mkdir -p /app/frontend
COPY --from=builder /app/baptender /app/baptender
COPY --from=builder /app/templates/ /app/templates/

ENTRYPOINT ["/app/baptender"]