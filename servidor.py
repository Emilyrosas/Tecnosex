"""
SERVIDOR LOCAL PARA EDITAR
==========================
Igual que `python -m http.server`, pero le dice al navegador que NO guarde
copias viejas de los archivos. Así, cada vez que recargas (F5) ves tus
últimos cambios en config.js, c.js o los mundos.

Uso (en la carpeta del proyecto):
    python servidor.py          → http://localhost:8765
    python servidor.py 9000     → otro puerto
"""
import http.server
import socketserver
import sys

PUERTO = int(sys.argv[1]) if len(sys.argv) > 1 else 8765


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()


http.server.SimpleHTTPRequestHandler.extensions_map[".js"] = "application/javascript"

with socketserver.ThreadingTCPServer(("", PUERTO), SinCache) as servidor:
    servidor.allow_reuse_address = True
    print(f"Abre http://localhost:{PUERTO}  (Ctrl+C para detener)")
    servidor.serve_forever()
