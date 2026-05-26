FROM eclipse-temurin:21-jdk

RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*
RUN pip3 install bottle --break-system-packages

WORKDIR /app
COPY java_jail_cp ./java_jail_cp
RUN curl -fsSL https://repo1.maven.org/maven2/org/glassfish/javax.json/1.0/javax.json-1.0.jar \
    -o java_jail_cp/javax.json-1.0.jar
RUN make -C java_jail_cp
COPY server.py .

RUN useradd -r -s /bin/false appuser && chown -R appuser /app
USER appuser

ENV JAVA_JAIL_CP=/app/java_jail_cp
ENV PORT=4003

EXPOSE 4003

CMD ["python3", "server.py"]
