FROM python:3.8

EXPOSE 6969

WORKDIR /app
COPY . /app

RUN pip install -r requirements.txt

FROM mysql
ADD ./db/init.sql /docker-entrypoint-initdb.d

CMD python app.py