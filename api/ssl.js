import tls from "tls";

export default async function handler(req, res) {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        error: "Debes enviar ?url=https://dominio.com"
      });
    }

    // limpiar URL
    const hostname = new URL(url).hostname;

    const options = {
      host: hostname,
      port: 443,
      servername: hostname,
      rejectUnauthorized: false
    };

    const socket = tls.connect(options, () => {
      const cert = socket.getPeerCertificate();

      if (!cert || !cert.valid_from) {
        return res.status(500).json({
          error: "No se pudo leer el certificado"
        });
      }

      const validFrom = cert.valid_from;
      const validTo = cert.valid_to;

      const expireDate = new Date(validTo);
      const now = new Date();
      const diffTime = expireDate - now;
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      socket.end();

      return res.status(200).json({
        host: hostname,
        valido_desde: validFrom,
        valido_hasta: validTo,
        dias_restantes: daysLeft
      });
    });

    socket.on("error", (err) => {
      return res.status(500).json({
        error: "Error conectando al SSL",
        detail: err.message
      });
    });

  } catch (error) {
    return res.status(500).json({
      error: "Error interno",
      detail: error.message
    });
  }
}
