FROM python:3.8
FROM mysql:5.7

EXPOSE 6969

WORKDIR /app
COPY . /app

RUN mkdir -p /docker-entrypoint-initdb.d/

RUN pip install -r requirements.txt

CMD python app.py