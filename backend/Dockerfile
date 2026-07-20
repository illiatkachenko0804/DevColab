FROM eclipse-temurin:26-jdk AS builder
WORKDIR /app
COPY . .
# Build the jar, skipping tests to speed up deployment
RUN ./gradlew bootJar -x test

FROM eclipse-temurin:26-jre
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 8080
# Limit memory to fit in Koyeb's 512MB free tier
ENTRYPOINT ["java", "-Xmx256m", "-jar", "app.jar"]
