const userActivityService = require('../services/userActivity.service'); // Importa el servicio

exports.createUserActivity = async (req, res) => {
    try {
        const { userId, actionType, actionResult, sessionId, visitedUrl, deviceInfo } = req.body;

        // Crear un nuevo documento de actividad
        const data = {
            userId,
            actionType,
            actionResult,
            sessionId,
            visitedUrl,
            deviceInfo,
        };

        // Usar el servicio para guardar los datos
        await userActivityService.logUserActivity(data);

        res.status(201).json({ message: 'CONTROLLER: Log de actividad registrado correctamente.' });
    } catch (error) {
        console.error('Error al guardar el log de actividad:', error);
        res.status(500).json({ message: 'CONTROLLER: Error al registrar el log de actividad.' });
    }
};