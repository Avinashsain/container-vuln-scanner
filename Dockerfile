# Deliberately using a slightly older base to see some findings
FROM python:3.9-alpine
WORKDIR /app
COPY scripts/ /app/scripts/
CMD ["python3", "--version"]