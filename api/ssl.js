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

    const socket = tls.connect(
      {
        host: hostname,
        port: 443,
        servername: hostname,
        rejectUnauthorized: false
      },
      () => {
        const cert = socket.getPeerCertificate();

        if (!cert || !cert.valid_from || !cert.valid_to) {
          socket.end();

          return res.status(500).json({
            error: "No se pudo leer el certificado SSL"
          });
        }

        // =========================
        // FECHAS
        // =========================
        const validFromDate = new Date(cert.valid_from);
        const validToDate = new Date(cert.valid_to);

        const now = new Date();

        const diffTime =
          validToDate.getTime() - now.getTime();

        const daysLeft = Math.ceil(
          diffTime / (1000 * 60 * 60 * 24)
        );

        socket.end();

        return res.status(200).json({
          host: hostname,

          // =========================
          // SUBJECT
          // =========================
          common_name: cert.subject?.CN || null,
          organizacion: cert.subject?.O || null,
          unidad_organizativa: cert.subject?.OU || null,
          pais: cert.subject?.C || null,
          estado_region: cert.subject?.ST || null,
          ciudad: cert.subject?.L || null,

          // =========================
          // ISSUER
          // =========================
          emisor_cn: cert.issuer?.CN || null,
          emisor_org: cert.issuer?.O || null,

          // =========================
          // SSL
          // =========================
          serial_number: cert.serialNumber || null,
          fingerprint: cert.fingerprint || null,

          // =========================
          // FECHAS
          // =========================
          valido_desde:
            validFromDate.toISOString(),

          valido_hasta:
            validToDate.toISOString(),

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
      }
    );

    // =========================
    // TIMEOUT
    // =========================
    socket.setTimeout(8000, () => {
      socket.destroy();

      return res.status(504).json({
        error: "Timeout SSL",
        host: hostname
      });
    });

    // =========================
    // ERROR
    // =========================
    socket.on("error", (err) => {
      return res.status(500).json({
        error: "Error SSL",
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
