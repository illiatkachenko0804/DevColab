FROM openjdk:26-jdk-slim AS builder
WORKDIR /app
COPY . .
# Build the jar, skipping tests to speed up deployment
RUN ./gradlew bootJar -x test

FROM openjdk:26-jdk-slim
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 8080
# Limit memory to fit in Koyeb's 512MB free tier
ENTRYPOINT ["java", "-Xmx256m", "-jar", "app.jar"]
