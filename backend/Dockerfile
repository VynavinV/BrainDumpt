FROM python:3.11-slim

WORKDIR /app
# Railway and most repo-root Docker builds use the repository root as the build context,
# so copy backend files using repo-relative paths.
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy the rest of the backend source into the image
COPY backend/ /app/

# Use key=value ENV format
ENV PYTHONPATH=/app
ENV PORT=8000

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
