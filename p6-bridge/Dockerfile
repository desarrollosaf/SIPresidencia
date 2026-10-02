FROM python:3.12-slim

# libasound2-dev + compilador: python-rtmidi usa ALSA y puede compilarse si no hay wheel.
# alsa-utils: aconnect / amidi para revisar el P-6 desde la bash del contenedor.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       libasound2 libasound2-dev alsa-utils build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY p6_bridge.py .

ENV PYTHONUNBUFFERED=1
CMD ["python", "p6_bridge.py"]
