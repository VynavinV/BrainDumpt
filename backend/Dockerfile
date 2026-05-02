FROM python:3.11-slim

WORKDIR /app
# Railway is building with the backend/ directory as the build context, so copy files
# relative to that directory.
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy the rest of the backend source into the image
COPY . /app/

# Use key=value ENV format
ENV PYTHONPATH=/app
ENV PORT=8000

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
