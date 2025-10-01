const userActivityService = require('../services/userActivity.service'); // Importa el servicio
const { getCachedConfig } = require('../services/configs.service');

exports.createUserActivity = async (req, res) => {
    try {
        const isFeatureEnabled = getCachedConfig('logActivityEnabled');
        if (!isFeatureEnabled) {
            return res.status(203).json({ message: 'Funcionalidad deshabilitada.' });
        }
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

exports.getAllUserActivities = async (req, res) => {
    try {
        const activities = await userActivityService.getAllUserActivities();
        res.status(200).json({
            message: 'CONTROLLER: Actividades de usuario obtenidas correctamente.',
            data: activities
        });
    } catch (error) {
        console.error('Error al obtener las actividades de usuario:', error);
        res.status(500).json({ message: 'CONTROLLER: Error al obtener las actividades de usuario.' });
    }
};
