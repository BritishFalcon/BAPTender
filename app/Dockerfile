FROM python:3.8

EXPOSE 6969

WORKDIR /app
COPY . /app

FROM mysql:5.7
COPY ./init.sql /docker-entrypoint-initdb.d/

RUN pip install -r requirements.txt

CMD python app.py