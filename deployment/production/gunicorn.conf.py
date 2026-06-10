"""Gunicorn configuration for Pravartee CRM production."""
import multiprocessing

bind = "127.0.0.1:8084"
workers = min(multiprocessing.cpu_count() * 2 + 1, 5)
threads = 2
timeout = 60
keepalive = 5
accesslog = "-"
errorlog = "-"
capture_output = True
