import tls from "tls";

export default async function handler(req, res) {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        error: "Debes enviar ?url=https://dominio.com"
      });
    }

    const hostname = new URL(url).hostname;

    const options = {
      host: hostname,
      port: 443,
      servername: hostname,
      rejectUnauthorized: false
    };

    const socket = tls.connect(options, () => {
      const cert = socket.getPeerCertificate();

      if (!cert || !cert.valid_from || !cert.valid_to) {
        socket.end();
        return res.status(500).json({
          error: "No se pudo leer el certificado SSL"
        });
      }

      // ================================
      // 🔥 FECHAS (ISO 100% COMPATIBLE SHAREPOINT)
      // ================================
      const parseCertDate = (dateStr) => new Date(Date.parse(dateStr));

      const validFromDate = parseCertDate(cert.valid_from);
      const validToDate = parseCertDate(cert.valid_to);

      // 👉 FORMATO PRO: ISO 8601 (OBLIGATORIO PARA SHAREPOINT)
      const validFrom = validFromDate.toISOString();
      const validTo = validToDate.toISOString();

      // ================================
      // 🔥 DÍAS RESTANTES
      // ================================
      const now = new Date();
      const diffTime = validToDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      socket.end();

      return res.status(200).json({
        host: hostname,
        valido_desde: validFrom,
        valido_hasta: validTo,
        dias_restantes: daysLeft,
        estado:
          daysLeft <= 0
            ? "EXPIRADO"
            : daysLeft <= 30
            ? "CRITICO"
            : daysLeft <= 60
            ? "ADVERTENCIA"
            : "OK"
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
