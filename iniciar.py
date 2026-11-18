"""Inicia o ReabSYS no computador que recebeu os arquivos, usando Python 3."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import webbrowser


def create_server():
    frontend = Path(__file__).resolve().parent / 'frontend'
    if not (frontend / 'index.html').is_file():
        raise SystemExit('Extraia o ZIP inteiro antes de iniciar. A pasta frontend não foi encontrada.')
    handler = partial(SimpleHTTPRequestHandler, directory=str(frontend))
    for port in range(8765, 8775):
        try:
            return ThreadingHTTPServer(('127.0.0.1', port), handler)
        except OSError:
            continue
    raise SystemExit('Não foi possível abrir uma porta entre 8765 e 8774. Feche uma execução anterior e tente novamente.')


def main():
    with create_server() as server:
        url = f'http://localhost:{server.server_port}/'
        print(f'ReabSYS iniciado em {url}', flush=True)
        print('Mantenha este terminal aberto. Para encerrar, pressione Ctrl+C.', flush=True)
        threading.Timer(1, webbrowser.open, args=(url,)).start()
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print('\nReabSYS encerrado.')


if __name__ == '__main__':
    main()
