FROM python:3

EXPOSE 6969

WORKDIR /app

COPY requirements.txt /app
RUN pip install -r requirements.txt

COPY . /app
CMD python app.py